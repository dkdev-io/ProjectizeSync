# ProjectizeSync Setup Guide

## 🚀 Quick Start Status

### ✅ Completed Setup Tasks
- [x] GitHub repository initialized
- [x] Supabase project linked (ID: kyyovrswnucxzvupffvv) 
- [x] Environment variables configured
- [x] MVP database schema created
- [x] Row Level Security policies defined
- [x] React frontend scaffolded
- [x] Supabase client configured

### 🔄 Current Status
**Phase 1.1 (Supabase Setup)**: 90% Complete

### ⏳ Next Steps Required

#### 1. Deploy Database Migrations
The database schema is ready but needs to be deployed. Two options:

**Option A: Via Supabase Dashboard**
1. Go to: https://supabase.com/dashboard/project/kyyovrswnucxzvupffvv/sql/new
2. Copy and paste the contents of:
   - `supabase/migrations/20240909200000_create_mvp_schema.sql`
   - `supabase/migrations/20240909200001_setup_rls_policies.sql`
3. Run each migration

**Option B: Via CLI (needs service role key)**
```bash
# Provide service role key, then run:
supabase db push
```

#### 2. Configure OAuth Applications
Next tasks in Stage 1:
- Set up Motion OAuth app
- Set up Trello OAuth app
- Update environment variables

## 📁 Project Structure

```
projectizesync/
├── src/lib/supabase.js          # Supabase client & helpers
├── frontend/                    # React frontend (Vite)
├── supabase/
│   └── migrations/              # Database schema & policies
├── functions/                   # Netlify functions (to be created)
├── .env                        # Environment variables (configured)
├── .env.example                # Environment template
└── package.json                # Dependencies (configured)
```

## 🔧 Environment Configuration

Current `.env` status:
- ✅ Supabase URL: Configured
- ✅ Supabase Anon Key: Configured  
- ❌ Supabase Service Role Key: Needed for migrations
- ❌ Motion API: Pending OAuth app creation
- ❌ Trello API: Pending OAuth app creation

## 🗄️ Database Schema (MVP)

### Tables Created:
- `profiles` - User profiles linked to auth.users
- `projects` - Sync projects (Motion ↔ Trello)
- `project_members` - Admin/Member permissions
- `task_syncs` - Task mapping between platforms
- `user_integrations` - OAuth tokens storage
- `sync_logs` - Sync history and debugging

### Key Features:
- Row Level Security enabled
- Auto-updating timestamps
- Proper indexes for performance
- Foreign key constraints
- Check constraints for data integrity

## 🚦 Development Commands

```bash
# Start frontend development
npm run dev

# Start Supabase local development
supabase start

# Deploy migrations (when CLI is linked)
supabase db push

# View Supabase dashboard
supabase dashboard
```

## 🎯 MVP Scope

**Included:**
- Basic auth with Supabase
- Simple project creation
- Binary permissions (Admin/Member)
- Basic task sync tracking
- React frontend foundation

**Excluded from MVP:**
- Real-time conflict resolution
- Custom field mapping
- Complex permission tiers
- Advanced sync strategies

---

**Ready for**: Database migration deployment + OAuth app setup
**Next Task**: Deploy migrations to complete Task 1.1.2