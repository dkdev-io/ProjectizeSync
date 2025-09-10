# Netlify Environment Variables Setup

## Manual Setup Instructions

Since the Netlify CLI authentication is timing out, you need to set these environment variables manually in the Netlify dashboard:

### 1. Go to your Netlify dashboard
- Visit: https://app.netlify.com/
- Find your "projectize-sync" site
- Go to: Site Settings → Environment Variables

### 2. Add these environment variables:

**Supabase (Production - use these for production deployment):**
```
SUPABASE_URL = https://kyyovrswnucxzvupffvv.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eW92cnN3bnVjeHp2dXBmZnZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NjYxMjgsImV4cCI6MjA3MzA0MjEyOH0.qfO-MSCnzQExXJtOpiTzdLbf_jRvQlM3PFUYQ39IuUQ
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eW92cnN3bnVjeHp2dXBmZnZ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQ2NjEyOCwiZXhwIjoyMDczMDQyMTI4fQ.qkRvU43DDNLxWMoohh2DQlBwrlvP09XsfW2liIx_22Q
```

**Motion API:**
```
MOTION_ACCESS_TOKEN = k3sItZidEVy9r0vUO4LhrlogLoyv8bjsm+XWuwdn+M8=
```

**Trello API:**
```
TRELLO_API_KEY = d4cfad653c1688c8e1027ff23d0eca90
TRELLO_API_SECRET = d4e928ff57a687bd523c7b4c51db46acd1
```

**App Configuration:**
```
APP_URL = https://projectize-sync.netlify.app
ENCRYPTION_KEY = PPpVXdv2XLVrygtGvS4/b9bWf2Pn9SQ3HAg3dHKyifU=
JWT_SECRET = /y9MWgwofwzd2zo8sKaclFwX0nX6S/0+O2M0TxewHFhfVoel4osJbVKFbMmm13AER1bhbrZSJXeYLDvhRujidg==
```

**Sync Configuration:**
```
SYNC_QUEUE_INTERVAL = 30
MAX_CONCURRENT_SYNCS = 5
```

### 3. Deploy Production Database Schema

**IMPORTANT:** You need to run the database migrations on your production Supabase instance:

1. Go to https://app.supabase.com/project/kyyovrswnucxzvupffvv/sql
2. Copy and paste the contents of these files:
   - `supabase/migrations/20240909200000_create_mvp_schema.sql`
   - `supabase/migrations/20240909200001_setup_rls_policies.sql`
3. Execute them in the SQL Editor

### 4. Test Production Setup

Once environment variables are set, you can test the production deployment by visiting:
- Frontend: https://projectize-sync.netlify.app
- Motion Webhook: https://projectize-sync.netlify.app/.netlify/functions/webhooks/motion
- Trello Webhook: https://projectize-sync.netlify.app/.netlify/functions/webhooks/trello

## Verification

After setting up, verify the deployment works by:
1. Visiting the frontend URL
2. Testing a webhook endpoint with a HEAD request
3. Checking Netlify function logs for any errors