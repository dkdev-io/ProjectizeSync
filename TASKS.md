# Projectize Sync - Development Task List

This document outlines the phased development plan for Projectize Sync, a bidirectional synchronization application between Motion and Trello. The plan is structured to leverage an AI coding agent, such as Claude Code, for efficient implementation. Each phase is broken down into actionable tasks, focusing on clarity and sequential execution.

## Phase 0: MVP Implementation

This optional phase implements a simplified version using the MVP schema from the PRD, reducing complexity by ~70% while maintaining core value proposition.

### 0.1 Simplified MVP Setup

Tasks:

• **Task 0.1.1: Implement Simplified MVP Database Schema**: Create the 3-table MVP schema (projects, project_members, task_syncs) with binary admin/member permissions only.

• **Task 0.1.2: Basic Authentication Setup**: Implement Motion + Trello OAuth without advanced permission system.

• **Task 0.1.3: Simple Task Sync**: Implement basic sync for title, description, and status only (no custom fields).

• **Task 0.1.4: Queue-based Processing**: Implement basic queue without real-time requirements.

## Phase 1: Core Infrastructure

This phase focuses on establishing the foundational backend and authentication systems. It involves setting up the Supabase database, configuring OAuth for Motion and Trello, and developing basic API clients for interaction with these platforms.

### 1.1 Supabase Setup

This sub-phase involves initializing the Supabase project, applying the defined database schema, and preparing the environment for data storage and management. The database schema provided in the PRD will be directly translated into Supabase migrations.

Tasks:

• **Task 1.1.1: Initialize Supabase Project**: Execute `supabase init` and `supabase start` to set up the local Supabase environment. This creates the necessary project structure and starts the local services.

• **Task 1.1.2: Deploy Database Migrations**: Apply the provided SQL schema to the Supabase database. This involves creating migration files from the schema and pushing them to the database using `supabase db reset` (for initial setup) and `supabase db push`.

  • **Sub-task 1.1.2.1: Create users table**: Implement the users table with id, email, name, created_at, and updated_at columns, ensuring email is unique.

  • **Sub-task 1.1.2.2: Create projects table**: Implement the projects table to store sync relationships, including motion_workspace_id, trello_board_id, and sync_enabled.

  • **Sub-task 1.1.2.3: Create project_permissions table**: Implement the project_permissions table to manage user access levels for each project, with a permission_level enum.

  • **Sub-task 1.1.2.4: Create task_mappings table**: Implement the task_mappings table for 1:1 task mapping between Motion and Trello, using a custom_key.

  • **Sub-task 1.1.2.5: Create edit_locks table**: Implement the edit_locks table to manage field-level conflict prevention with expires_at.

  • **Sub-task 1.1.2.6: Create field_mappings table**: Implement the field_mappings table for custom field mapping, including motion_field_id, trello_field_id, and mapping_approved.

  • **Sub-task 1.1.2.7: Create user_integrations table**: Implement the user_integrations table to store API credentials for various platforms, ensuring access_token and refresh_token are encrypted.

  • **Sub-task 1.1.2.8: Create sync_logs table**: Implement the sync_logs table to track sync actions and conflict details.

  • **Sub-task 1.1.2.9: Create sync_queue table**: Implement the sync_queue table for background job management, including status, retry_count, and scheduled_for.

  • **Sub-task 1.1.2.10: Create Performance Indexes**: Implement the indexes from PRD (idx_task_mappings_project_id, idx_task_mappings_custom_key, idx_edit_locks_expires_at, idx_sync_queue_status_scheduled, idx_edit_locks_active) for optimal query performance.

  • **Sub-task 1.1.2.11: Create Migration Rollback Strategy**: Ensure migrations can be safely rolled back if issues occur during deployment.

• **Task 1.1.3: Configure Row Level Security (RLS)**: Enable RLS on relevant tables (projects, project_permissions, task_mappings, field_mappings, sync_logs) and define policies to ensure users can only access data they are permitted to see. This includes policies for viewing permitted projects and project permissions.

### 1.2 Authentication & OAuth Setup

This sub-phase focuses on integrating Motion and Trello OAuth with Supabase Auth to manage user authentication and authorization for accessing external APIs.

Tasks:

• **Task 1.2.1: Configure Motion OAuth Application**: Register Projectize Sync as an application with Motion to obtain CLIENT_ID and CLIENT_SECRET.

• **Task 1.2.2: Configure Trello OAuth Application**: Register Projectize Sync as an application with Trello to obtain API_KEY and API_SECRET.

• **Task 1.2.3: Set up Supabase Auth Providers**: Configure Supabase to use Motion and Trello as OAuth providers, enabling users to sign in and grant permissions through these services.

• **Task 1.2.4: Implement User Onboarding Flow**: Develop the frontend and backend logic for the user onboarding process, guiding users through connecting their Motion and Trello accounts.

• **Task 1.2.5: Implement Token Refresh Logic**: Handle OAuth token expiration and automatic refresh for both platforms to maintain continuous access.

### 1.3 Basic API Clients

This sub-phase involves developing the initial client libraries for interacting with the Motion and Trello APIs. These clients will handle authentication, basic data retrieval, and webhook creation.

Tasks:

• **Task 1.3.1: Develop MotionClient Class**: Create a TypeScript class MotionClient (e.g., in `src/api/motion-client.ts`) with methods for:
  • `authenticate(code: string): Promise<TokenResponse>`: Handles OAuth token exchange.
  • `getWorkspaces(): Promise<Workspace[]>`: Retrieves user workspaces.
  • `getProjects(workspaceId: string): Promise<Project[]>`: Retrieves projects within a specified workspace.
  • `getTasks(projectId: string): Promise<Task[]>`: Retrieves tasks for a given project.
  • `createWebhook(projectId: string): Promise<WebhookResponse>`: Sets up webhooks for real-time updates.

• **Task 1.3.2: Develop TrelloClient Class**: Create a TypeScript class TrelloClient (e.g., in `src/api/trello-client.ts`) with methods for:
  • `authenticate(code: string): Promise<TokenResponse>`: Handles OAuth token exchange.
  • `getOrganizations(): Promise<Organization[]>`: Retrieves user organizations/teams.
  • `getBoards(orgId: string): Promise<Board[]>`: Retrieves boards within a specified organization.
  • `getCards(boardId: string): Promise<Card[]>`: Retrieves cards for a given board.
  • `createWebhook(boardId: string): Promise<WebhookResponse>`: Sets up webhooks for real-time updates.

## Phase 2: Sync Engine Core

This phase focuses on building the central components responsible for data mapping, conflict resolution, and managing the synchronization queue. This is the heart of the bidirectional sync functionality.

### 2.1 Data Mapping Layer

This sub-phase involves creating the logic to transform data between Motion and Trello formats and to detect potential conflicts during synchronization.

Tasks:

• **Task 2.1.1: Develop TaskMapper Class**: Create a TypeScript class TaskMapper (e.g., in `src/mapping/task-mapper.ts`) with methods for:
  • `motionToTrello(motionTask: MotionTask, mapping: FieldMapping[]): TrelloCard`: Converts a Motion task to a Trello card based on field mappings.
  • `trelloToMotion(trelloCard: TrelloCard, mapping: FieldMapping[]): MotionTask`: Converts a Trello card to a Motion task based on field mappings.
  • `generateCustomKey(motionId?: string, trelloId?: string): string`: Generates a unique internal key for 1:1 task mapping.
  • `detectConflicts(motionTask: MotionTask, trelloCard: TrelloCard): Conflict[]`: Identifies conflicts between Motion and Trello task data.

• **Task 2.1.2: Implement Data Validation**: Validate data integrity during transformation between platforms, ensuring required fields are present and data types are correct.

### 2.2 Conflict Resolution

This sub-phase focuses on implementing the mechanisms for preventing and resolving data conflicts, including field-level locking.

Tasks:

• **Task 2.2.1: Develop ConflictResolver Class**: Create a TypeScript class ConflictResolver (e.g., in `src/sync/conflict-resolver.ts`) with methods for:
  • `acquireFieldLock(taskId: string, field: string, userId: string): Promise<boolean>`: Acquires a 30-second edit lock on a specific field of a task.
  • `releaseFieldLock(taskId: string, field: string): Promise<void>`: Releases an acquired field lock.
  • `resolveConflict(conflict: Conflict, resolution: Resolution): Promise<void>`: Applies a chosen resolution strategy to a detected conflict.

### 2.3 Sync Queue System

This sub-phase involves building the queue management system to handle synchronization operations, ensuring rate limit compliance and robust processing of changes.

Tasks:

• **Task 2.3.1: Develop SyncQueueManager Class**: Create a TypeScript class SyncQueueManager (e.g., in `src/sync/queue-manager.ts`) with methods for:
  • `addToQueue(action: SyncAction): Promise<void>`: Adds a synchronization action to the sync_queue table.
  • `processQueue(): Promise<void>`: Processes pending items in the sync_queue, respecting rate limits.
  • `retryFailed(): Promise<void>`: Retries synchronization actions that previously failed.

• **Task 2.3.2: Implement Queue Processor Scheduling**: Set up pg_cron or Supabase Edge Functions to automatically process the sync queue at regular intervals defined by SYNC_QUEUE_INTERVAL.

### 2.4 Rate Limiting Implementation

This sub-phase implements rate limiting strategies to prevent hitting API limits during sync operations.

Tasks:

• **Task 2.4.1: Develop Rate Limiting Classes**: Create rate limiting utilities for Motion and Trello APIs with exponential/linear backoff strategies as defined in the PRD RateLimitConfig.

• **Task 2.4.2: Implement Comprehensive Error Handling**: Create error handling strategies for API failures, network timeouts, partial sync failures, and rate limit exceeded scenarios.

## Phase 3: Webhook Handlers

This phase focuses on implementing the serverless functions that will receive and process real-time updates from Motion and Trello via webhooks. These handlers will trigger the sync engine.

### 3.1 Motion Webhooks

Tasks:

• **Task 3.1.1: Create Motion Webhook Handler**: Develop a Netlify Function (e.g., `functions/webhooks/motion.ts`) to receive and parse Motion webhook payloads. This handler will:
  • Parse incoming JSON payload.
  • Identify the event_type (e.g., task.created, task.updated, task.deleted).
  • Call a handleTaskChange function (or similar) to process the event, which will likely involve adding an action to the sync_queue.

### 3.2 Trello Webhooks

Tasks:

• **Task 3.2.1: Create Trello Webhook Handler**: Develop a Netlify Function (e.g., `functions/webhooks/trello.ts`) to receive and parse Trello webhook payloads. This handler will:
  • Parse incoming JSON payload.
  • Identify the action.type (e.g., createCard, updateCard, deleteCard).
  • Call a handleCardChange function (or similar) to process the event, which will likely involve adding an action to the sync_queue.

### 3.3 Webhook Signature Verification

Tasks:

• **Task 3.3.1: Implement Webhook Signature Verification**: Create a utility function or middleware (e.g., `functions/webhooks/verify.ts`) to verify the authenticity of incoming webhooks from both Motion and Trello using their respective secrets. This is crucial for security.

### 3.4 Webhook Reliability

Tasks:

• **Task 3.4.1: Implement Webhook Retry Logic**: Handle webhook delivery failures and implement retry mechanisms for failed webhook processing, ensuring no sync events are lost.

## Phase 4: Permission System

This phase focuses on implementing the 5-tier permission system and developing an administrative interface for managing user access and sync settings.

### 4.1 Permission Middleware

Tasks:

• **Task 4.1.1: Develop PermissionManager Class**: Create a TypeScript class PermissionManager (e.g., in `src/middleware/permissions.ts`) with methods for:
  • `checkPermission(userId: string, projectId: string, action: string): Promise<boolean>`: Verifies if a user has the necessary permission level for a given action on a project.
  • `getUserProjects(userId: string): Promise<Project[]>`: Retrieves all projects a user has access to.
  • `assignPermission(projectId: string, userId: string, level: PermissionLevel): Promise<void>`: Assigns a specific permission level to a user for a project.

### 4.2 Admin Dashboard API

Tasks:

• **Task 4.2.1: Create Admin API Endpoints**: Develop Netlify Functions (e.g., `functions/api/admin.ts`) to expose API endpoints for administrative operations. These endpoints will allow:
  • Viewing project permissions.
  • Modifying user access levels.
  • Configuring global and project-specific sync settings.
  • Viewing detailed sync logs and conflict reports.

## Phase 5: Custom Field Mapping

This phase focuses on building the functionality for detecting, suggesting, and managing custom field mappings between Motion and Trello.

### 5.1 Field Detection

Tasks:

• **Task 5.1.1: Develop FieldDetector Class**: Create a TypeScript class FieldDetector (e.g., in `src/mapping/field-detector.ts`) with methods for:
  • `detectMotionFields(projectId: string): Promise<CustomField[]>`: Retrieves custom fields defined in Motion for a given project.
  • `detectTrelloFields(boardId: string): Promise<CustomField[]>`: Retrieves custom fields defined in Trello for a given board.
  • `suggestMappings(motionFields: CustomField[], trelloFields: CustomField[]): Promise<SuggestedMapping[]>`: Uses AI (or rule-based logic) to suggest potential mappings between Motion and Trello custom fields.

### 5.2 Mapping UI API

Tasks:

• **Task 5.2.1: Create Field Mapping API Endpoints**: Develop Netlify Functions (e.g., `functions/api/field-mapping.ts`) to expose API endpoints for managing custom field mappings. These endpoints will support:
  • Retrieving suggested mappings.
  • Saving user-approved mappings to the field_mappings table.
  • Updating existing field mappings.

## Phase 6: Frontend Development

This phase focuses on building the user interface components for project management, conflict resolution, and field mapping.

### 6.1 User Dashboard

Tasks:

• **Task 6.1.1: Create Project Management Interface**: Build UI components for users to view, create, and manage sync projects.

• **Task 6.1.2: Implement User Authentication UI**: Create login/signup flows using Supabase Auth with Motion and Trello OAuth.

### 6.2 Conflict Resolution UI

Tasks:

• **Task 6.2.1: Build Conflict Resolution Interface**: Create UI components that allow users to review and resolve sync conflicts when they occur.

• **Task 6.2.2: Implement Real-time Conflict Notifications**: Show users when conflicts require their attention.

### 6.3 Field Mapping Interface

Tasks:

• **Task 6.3.1: Create Field Mapping Configuration UI**: Build interface for users to review and approve suggested field mappings between Motion and Trello.

• **Task 6.3.2: Implement Field Mapping Visualization**: Show users how their custom fields will be mapped between platforms.

## Phase 7: Deployment and Monitoring

This final phase covers the deployment of the application to Netlify, configuration of environment variables, and setting up ongoing monitoring and maintenance.

### 7.1 Netlify Deployment

Tasks:

• **Task 7.1.1: Install Netlify CLI**: Ensure the Netlify CLI is installed (`npm install -g netlify-cli`).

• **Task 7.1.2: Initialize Netlify Project**: Log in to Netlify (`netlify login`) and initialize the project (`netlify init`) in the application's root directory.

• **Task 7.1.3: Deploy Application**: Deploy the Netlify Functions and any frontend assets to production (`netlify deploy --prod`).

### 7.2 Environment Variable Configuration

Tasks:

• **Task 7.2.1: Set Supabase Environment Variables**: Configure SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in Netlify.

• **Task 7.2.2: Set Motion API Environment Variables**: Configure MOTION_CLIENT_ID, MOTION_CLIENT_SECRET, and MOTION_WEBHOOK_SECRET in Netlify.

• **Task 7.2.3: Set Trello API Environment Variables**: Configure TRELLO_API_KEY, TRELLO_API_SECRET, and TRELLO_WEBHOOK_SECRET in Netlify.

• **Task 7.2.4: Set Application Configuration Variables**: Configure APP_URL, ENCRYPTION_KEY, and JWT_SECRET in Netlify.

• **Task 7.2.5: Set Queue Configuration Variables**: Configure SYNC_QUEUE_INTERVAL and MAX_CONCURRENT_SYNCS in Netlify.

### 7.3 Webhook Configuration

Tasks:

• **Task 7.3.1: Configure Motion Webhooks**: Set up Motion webhooks to point to the deployed Netlify Function endpoint (e.g., `https://your-app-url/.netlify/functions/webhooks/motion`).

• **Task 7.3.2: Configure Trello Webhooks**: Set up Trello webhooks to point to the deployed Netlify Function endpoint (e.g., `https://your-app-url/.netlify/functions/webhooks/trello`).

### 7.4 Testing Strategy

Tasks:

• **Task 7.4.1: Implement Unit Tests**: Develop unit tests for critical components such as:
  • Task mapping functions (TaskMapper).
  • Conflict resolution logic (ConflictResolver).
  • Permission checking (PermissionManager).
  • Field detection and suggestion (FieldDetector).

• **Task 7.4.2: Implement Integration Tests**: Develop integration tests to verify the end-to-end flow of synchronization, including webhook reception, queue processing, and data updates across Motion and Trello.

• **Task 7.4.3: Implement End-to-End (E2E) Tests**: Develop E2E tests to simulate user interactions and verify the overall application functionality, including user onboarding, project creation, and real-time sync.

### 7.5 Monitoring Setup

Tasks:

• **Task 7.5.1: Implement Application Logging**: Set up comprehensive logging for all critical operations, errors, and performance metrics.

• **Task 7.5.2: Configure Error Tracking**: Implement error tracking and alerting for production issues using services like Sentry or similar.

• **Task 7.5.3: Set up Performance Monitoring**: Monitor API response times, sync queue processing times, and overall application performance.

• **Task 7.5.4: Create Health Check Endpoints**: Implement health check endpoints for monitoring service availability and database connectivity.

## Conclusion

This phased development plan provides a structured approach for building Projectize Sync. By breaking down the project into manageable stages and detailed tasks, an AI coding agent can systematically implement the application, ensuring all core features and technical requirements are addressed. The emphasis on modularity and clear interfaces between components will facilitate efficient development and future maintenance. This plan also incorporates testing at various levels to ensure the robustness and reliability of the synchronization engine and associated features.

The addition of Phase 0 (MVP) allows for rapid prototyping and validation before building the full feature set, while the comprehensive monitoring and error handling ensure production readiness.