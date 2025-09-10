# Projectize Sync - Product Requirements Document

## Overview
Build a bidirectional sync application between Motion and Trello that maintains real-time synchronization of tasks, projects, and custom fields with robust conflict resolution and multi-user permission management.

## Tech Stack

- **Backend**: Node.js/TypeScript with Express.js
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Netlify Functions
- **Queue**: Supabase Edge Functions + pg_cron
- **Authentication**: Supabase Auth with OAuth providers

## Core Features

### 1. Bidirectional Sync Engine

- Real-time sync via webhooks from both platforms
- Custom key generation for 1:1 task mapping
- Conflict detection with 30-second edit locks
- Queue system for rate limit management

### 2. Permission Management System
5 permission levels per project:

- **Admin**: Full control, sync configuration
- **Project Manager**: Edit all tasks, assign within company
- **Contributor**: Edit assigned tasks only
- **Client Reviewer**: View + comment on client-facing tasks
- **Guest**: Temporary view-only access

### 3. Smart Data Mapping

- Motion Workspace ↔ Trello Team
- Motion Project ↔ Trello Board
- Motion Task ↔ Trello Card
- Motion Task Status ↔ Trello List position
- Hybrid custom field mapping with user approval

## Database Schema (Supabase)

### Core Tables

```sql
-- Users and Authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects (sync relationships)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  motion_workspace_id TEXT,
  motion_project_id TEXT,
  trello_team_id TEXT,
  trello_board_id TEXT,
  created_by UUID REFERENCES users(id),
  sync_enabled BOOLEAN DEFAULT TRUE,
  approval_required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project permissions
CREATE TABLE project_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission_level TEXT CHECK (permission_level IN ('admin', 'project_manager', 'contributor', 'client_reviewer', 'guest')),
  granted_by UUID REFERENCES users(id),
  expires_at TIMESTAMPTZ, -- For guest access
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Task mappings and sync state
CREATE TABLE task_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  custom_key TEXT UNIQUE NOT NULL, -- Our internal mapping key
  motion_task_id TEXT,
  trello_card_id TEXT,
  last_motion_update TIMESTAMPTZ,
  last_trello_update TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'active', -- active, paused, error, deleted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Edit locks for conflict prevention
CREATE TABLE edit_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_mapping_id UUID REFERENCES task_mappings(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL, -- title, description, status, etc.
  locked_by UUID REFERENCES users(id),
  platform TEXT NOT NULL, -- motion or trello
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_mapping_id, field_name)
);

-- Custom field mappings
CREATE TABLE field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  motion_field_id TEXT,
  motion_field_name TEXT,
  trello_field_id TEXT,
  trello_field_name TEXT,
  field_type TEXT, -- text, number, date, select, multi_select
  mapping_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API credentials - Multi-platform ready
CREATE TABLE user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform_type TEXT NOT NULL, -- motion, trello, asana, clickup, etc.
  access_token TEXT NOT NULL, -- Encrypted
  refresh_token TEXT, -- Encrypted
  expires_at TIMESTAMPTZ,
  webhook_config JSONB DEFAULT '{}', -- Platform-specific webhook settings
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform_type)
);

-- Sync logs and conflict tracking
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_mapping_id UUID REFERENCES task_mappings(id),
  action_type TEXT NOT NULL, -- create, update, delete, conflict
  platform TEXT NOT NULL, -- motion, trello, or both
  success BOOLEAN NOT NULL,
  error_message TEXT,
  conflict_data JSONB, -- Store conflict details
  performed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Queue for background jobs
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_mapping_id UUID REFERENCES task_mappings(id),
  action_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Performance Indexes

```sql
-- Performance indexes
CREATE INDEX idx_task_mappings_project_id ON task_mappings(project_id);
CREATE INDEX idx_task_mappings_custom_key ON task_mappings(custom_key);
CREATE INDEX idx_edit_locks_expires_at ON edit_locks(expires_at);
CREATE INDEX idx_sync_queue_status_scheduled ON sync_queue(status, scheduled_for);

-- Partial index for active locks only
CREATE INDEX idx_edit_locks_active ON edit_locks(task_mapping_id, field_name) 
  WHERE expires_at > NOW();
```

### RLS Policies

```sql
-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see projects they have permissions for
CREATE POLICY "Users can view permitted projects" ON projects
  FOR SELECT USING (
    id IN (
      SELECT project_id FROM project_permissions 
      WHERE user_id = auth.uid()
    )
  );

-- Project permissions visibility
CREATE POLICY "Users can view project permissions" ON project_permissions
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM project_permissions 
      WHERE user_id = auth.uid()
      AND permission_level IN ('admin', 'project_manager')
    )
  );
```

## API Integration Details

### Motion API Endpoints

```typescript
// Motion API Configuration
const MOTION_BASE_URL = 'https://api.usemotion.com/v1';

interface MotionEndpoints {
  // Authentication
  auth: '/oauth/token';
  
  // Workspaces
  workspaces: '/workspaces';
  
  // Projects
  projects: '/projects';
  projectTasks: '/projects/{projectId}/tasks';
  
  // Tasks
  tasks: '/tasks';
  task: '/tasks/{taskId}';
  
  // Custom fields
  customFields: '/projects/{projectId}/custom-fields';
  
  // Webhooks
  webhooks: '/webhooks';
}

// Required Motion OAuth Scopes
const MOTION_SCOPES = [
  'tasks:read',
  'tasks:write',
  'projects:read', 
  'projects:write',
  'workspaces:read'
];
```

### Trello API Endpoints

```typescript
// Trello API Configuration
const TRELLO_BASE_URL = 'https://api.trello.com/1';

interface TrelloEndpoints {
  // Authentication
  authorize: '/authorize';
  
  // Organizations/Teams
  organizations: '/organizations';
  orgBoards: '/organizations/{orgId}/boards';
  
  // Boards
  boards: '/boards';
  board: '/boards/{boardId}';
  boardLists: '/boards/{boardId}/lists';
  boardCards: '/boards/{boardId}/cards';
  
  // Cards
  cards: '/cards';
  card: '/cards/{cardId}';
  
  // Custom fields
  customFields: '/boards/{boardId}/customFields';
  
  // Webhooks
  webhooks: '/webhooks';
}

// Required Trello OAuth Scopes
const TRELLO_SCOPES = ['read', 'write'];
```

### Rate Limiting Strategy

```typescript
interface RateLimitConfig {
  motion: {
    requestsPerMinute: 100;
    batchSize: 50;
    backoffStrategy: 'exponential';
  };
  trello: {
    requestsPerMinute: 100;
    batchSize: 50;
    backoffStrategy: 'linear';
  };
}
```

## Implementation Phases

### Phase 1: Core Infrastructure

#### Supabase Setup
```bash
# Initialize Supabase project
supabase init
supabase start
supabase db reset

# Deploy migrations
supabase db push
```

#### Authentication & OAuth Setup

- Configure Motion OAuth app
- Configure Trello OAuth app
- Set up Supabase Auth providers
- Create user onboarding flow

#### Basic API Clients
```typescript
// src/api/motion-client.ts
class MotionClient {
  async authenticate(code: string): Promise<TokenResponse>
  async getWorkspaces(): Promise<Workspace[]>
  async getProjects(workspaceId: string): Promise<Project[]>
  async getTasks(projectId: string): Promise<Task[]>
  async createWebhook(projectId: string): Promise<WebhookResponse>
}

// src/api/trello-client.ts  
class TrelloClient {
  async authenticate(code: string): Promise<TokenResponse>
  async getOrganizations(): Promise<Organization[]>
  async getBoards(orgId: string): Promise<Board[]>
  async getCards(boardId: string): Promise<Card[]>
  async createWebhook(boardId: string): Promise<WebhookResponse>
}
```

### Phase 2: Sync Engine Core

#### Data Mapping Layer
```typescript
// src/mapping/task-mapper.ts
class TaskMapper {
  motionToTrello(motionTask: MotionTask, mapping: FieldMapping[]): TrelloCard
  trelloToMotion(trelloCard: TrelloCard, mapping: FieldMapping[]): MotionTask
  generateCustomKey(motionId?: string, trelloId?: string): string
  detectConflicts(motionTask: MotionTask, trelloCard: TrelloCard): Conflict[]
}
```

#### Conflict Resolution
```typescript
// src/sync/conflict-resolver.ts
class ConflictResolver {
  async acquireFieldLock(taskId: string, field: string, userId: string): Promise<boolean>
  async releaseFieldLock(taskId: string, field: string): Promise<void>
  async resolveConflict(conflict: Conflict, resolution: Resolution): Promise<void>
}
```

#### Sync Queue System
```typescript
// src/sync/queue-manager.ts
class SyncQueueManager {
  async addToQueue(action: SyncAction): Promise<void>
  async processQueue(): Promise<void>
  async retryFailed(): Promise<void>
}
```

### Phase 3: Webhook Handlers

#### Motion Webhooks
```typescript
// functions/webhooks/motion.ts
export const handler = async (event: NetlifyEvent) => {
  const payload = JSON.parse(event.body);
  
  switch(payload.event_type) {
    case 'task.created':
    case 'task.updated':
    case 'task.deleted':
      await handleTaskChange(payload);
      break;
  }
};
```

#### Trello Webhooks
```typescript
// functions/webhooks/trello.ts  
export const handler = async (event: NetlifyEvent) => {
  const payload = JSON.parse(event.body);
  
  switch(payload.action.type) {
    case 'createCard':
    case 'updateCard':
    case 'deleteCard':
      await handleCardChange(payload);
      break;
  }
};
```

### Phase 4: Permission System

#### Permission Middleware
```typescript
// src/middleware/permissions.ts
class PermissionManager {
  async checkPermission(userId: string, projectId: string, action: string): Promise<boolean>
  async getUserProjects(userId: string): Promise<Project[]>
  async assignPermission(projectId: string, userId: string, level: PermissionLevel): Promise<void>
}
```

#### Admin Dashboard API
```typescript
// functions/api/admin.ts
export const handler = async (event: NetlifyEvent) => {
  // Handle admin operations:
  // - View project permissions
  // - Modify user access
  // - Configure sync settings
  // - View sync logs and conflicts
};
```

### Phase 5: Custom Field Mapping

#### Field Detection
```typescript
// src/mapping/field-detector.ts
class FieldDetector {
  async detectMotionFields(projectId: string): Promise<CustomField[]>
  async detectTrelloFields(boardId: string): Promise<CustomField[]>
  async suggestMappings(motionFields: CustomField[], trelloFields: CustomField[]): Promise<SuggestedMapping[]>
}
```

#### Mapping UI API
```typescript
// functions/api/field-mapping.ts
export const handler = async (event: NetlifyEvent) => {
  // Handle field mapping operations:
  // - Get suggested mappings
  // - Save user-approved mappings
  // - Update existing mappings
};
```

## Netlify Functions Structure

```
functions/
├── api/
│   ├── projects.ts          # CRUD operations for projects
│   ├── permissions.ts       # Permission management
│   ├── field-mapping.ts     # Custom field configuration
│   ├── sync-status.ts       # Sync monitoring
│   └── conflicts.ts         # Conflict resolution
├── auth/
│   ├── motion-callback.ts   # Motion OAuth callback
│   ├── trello-callback.ts   # Trello OAuth callback
│   └── refresh-tokens.ts    # Token refresh
├── webhooks/
│   ├── motion.ts           # Motion webhook handler
│   ├── trello.ts          # Trello webhook handler
│   └── verify.ts          # Webhook signature verification
└── sync/
    ├── queue-processor.ts  # Process sync queue
    ├── initial-sync.ts    # Handle initial project setup
    └── cleanup.ts         # Clean up expired locks/data
```

## Environment Variables

```bash
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Motion API  
MOTION_CLIENT_ID=
MOTION_CLIENT_SECRET=
MOTION_WEBHOOK_SECRET=

# Trello API
TRELLO_API_KEY=
TRELLO_API_SECRET= 
TRELLO_WEBHOOK_SECRET=

# App Config
APP_URL=https://projectize-sync.netlify.app
ENCRYPTION_KEY= # For encrypting stored tokens
JWT_SECRET=

# Queue Config
SYNC_QUEUE_INTERVAL=30 # seconds
MAX_CONCURRENT_SYNCS=5
```

## Deployment Steps

### Supabase Setup
```bash
# Create new Supabase project
supabase projects create projectize-sync

# Link local project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Set up auth providers
supabase dashboard
# Configure OAuth providers in Auth settings
```

### Netlify Deployment
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login and deploy
netlify login
netlify init
netlify deploy --prod

# Set environment variables
netlify env:set SUPABASE_URL your-url
netlify env:set SUPABASE_ANON_KEY your-key
# ... set all environment variables
```

### Configure Webhooks

- Set up Motion webhooks pointing to `/webhooks/motion`
- Set up Trello webhooks pointing to `/webhooks/trello`
- Verify webhook signatures for security

## Conflict Resolution Scenarios

```typescript
interface ConflictScenarios {
  simultaneousEdit: "User A and B edit same field";
  deletionConflict: "Task deleted on one platform while being edited on other";
  permissionChange: "User loses access mid-edit";
  customFieldMapping: "Field mapping changes during sync";
  platformOutage: "One platform unavailable during conflict";
}
```

## Testing Strategy

### Unit Tests

- Task mapping functions
- Conflict resolution logic
- Permission checking
- API client methods

### Integration Tests

- Full sync flow
- Webhook processing
- Database operations
- Authentication flow

### End-to-End Tests

- Complete user journey
- Multi-user scenarios
- Conflict resolution
- Permission enforcement

## Success Metrics

### Sync Performance

- < 5 second sync latency
- 99.9% sync success rate
- < 1% conflict rate

### User Experience

- < 30 second initial setup
- Clear conflict resolution UI
- Responsive permission changes

### Reliability

- 99.9% uptime
- Automatic retry on failures
- Data consistency maintenance

## Security Considerations

### Token Storage

- Encrypt all OAuth tokens
- Implement token rotation
- Secure webhook endpoints

### Permission Validation

- Validate permissions on every API call
- Implement rate limiting
- Log all administrative actions

### Data Privacy

- Client reviewers can't see internal tasks
- Proper RLS policies
- GDPR compliance for data deletion

## MVP Scope Optimization

### Recommended MVP Simplifications

**Remove from MVP:**
- Custom field mapping (use basic field sync only)
- 5-tier permission system (start with Admin/Member only)
- Real-time conflict resolution UI (use last-writer-wins)
- Guest/temporary access
- AI-suggested mappings

**MVP Core Features:**
1. **Basic Authentication** - Motion + Trello OAuth
2. **Simple Project Setup** - 1:1 workspace/board mapping
3. **Basic Task Sync** - Title, description, status only
4. **Admin/Member Permissions** - Binary access control
5. **Queue-based Sync** - No real-time requirements

### Simplified MVP Database Schema

```sql
-- Simplified for MVP
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  motion_project_id TEXT NOT NULL,
  trello_board_id TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_members (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'member')),
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE task_syncs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  motion_task_id TEXT NOT NULL,
  trello_card_id TEXT NOT NULL,
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(motion_task_id, trello_card_id)
);
```

## Technical Review Summary

### ✅ Strengths
- Multi-platform architecture is well-designed
- Database schema is comprehensive and scalable
- Phase-based implementation approach is sound

### ⚠️ Areas for Improvement
1. Add database indexes for performance
2. Implement comprehensive error handling for API failures
3. Design conflict resolution UI before backend implementation
4. Add webhook delivery reliability mechanisms

### 🎯 MVP Focus Strategy
Start with simplified 3-table schema, basic sync, and binary permissions. This reduces complexity by ~70% while maintaining core value proposition.

---

*This PRD provides a comprehensive technical foundation for building Projectize Sync, with clear implementation phases and MVP optimization recommendations.*