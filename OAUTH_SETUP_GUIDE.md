# OAuth Applications Setup Guide

## 🎯 Task 1.3: Motion & Trello OAuth Applications

To complete Stage 1.3, you need to create OAuth applications for both Motion and Trello.

---

## 🚀 **Motion OAuth Setup**

### Step 1: Create Motion OAuth App
1. Go to: https://developer.usemotion.com/
2. Sign in with your Motion account
3. Navigate to **Applications** or **OAuth Apps**
4. Click **Create New Application**

### Step 2: Configure Motion App
**Application Details:**
- **Name**: `ProjectizeSync`
- **Description**: `Sync tasks between Motion and Trello`
- **Website**: `https://projectizesync.netlify.app`

**OAuth Configuration:**
- **Redirect URI**: `https://projectizesync.netlify.app/api/auth/motion/callback`
- **Scopes**: Select these permissions:
  - `tasks:read` - Read tasks
  - `tasks:write` - Create and update tasks  
  - `projects:read` - Read projects
  - `projects:write` - Create and update projects
  - `workspaces:read` - Read workspaces

### Step 3: Get Motion Credentials
After creating the app, you'll receive:
- **Client ID**: `motion_client_id_here`
- **Client Secret**: `motion_client_secret_here`

---

## 📋 **Trello OAuth Setup**

### Step 1: Create Trello OAuth App
1. Go to: https://trello.com/app-key
2. Sign in with your Trello account
3. Generate your **API Key** (this is your Client ID)

### Step 2: Create OAuth App
1. Click **Token** link next to your API Key
2. Or go directly to: https://trello.com/1/appKey/generate
3. Fill in the application details:

**Application Details:**
- **Application Name**: `ProjectizeSync`
- **Application Description**: `Bidirectional sync between Motion and Trello`
- **Application URL**: `https://projectizesync.netlify.app`

**OAuth Configuration:**
- **Allowed Origins**: 
  ```
  https://projectizesync.netlify.app
  http://localhost:3000
  ```
- **Redirect URIs**:
  ```
  https://projectizesync.netlify.app/api/auth/trello/callback
  http://localhost:3000/api/auth/trello/callback
  ```

### Step 3: Get Trello Credentials
You'll receive:
- **API Key** (Client ID): `trello_api_key_here`
- **API Secret** (Client Secret): `trello_api_secret_here`

---

## 🔐 **Update Environment Variables**

Once you have both sets of credentials, update your `.env` file:

```bash
# Motion API
MOTION_CLIENT_ID=your_motion_client_id_here
MOTION_CLIENT_SECRET=your_motion_client_secret_here
MOTION_WEBHOOK_SECRET=your_motion_webhook_secret_here

# Trello API  
TRELLO_API_KEY=your_trello_api_key_here
TRELLO_API_SECRET=your_trello_api_secret_here
TRELLO_WEBHOOK_SECRET=your_trello_webhook_secret_here
```

---

## 🚦 **Next Steps After OAuth Setup**

Once you provide the credentials:
1. ✅ I'll create the Netlify Functions for OAuth callbacks
2. ✅ Build the API client integration
3. ✅ Create the connection flow UI
4. ✅ Test the OAuth flows

---

## ❓ **Need Help?**

**Motion API Documentation:**
- Developer Portal: https://developer.usemotion.com/
- API Reference: https://docs.usemotion.com/

**Trello API Documentation:**  
- Getting Started: https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/
- OAuth Guide: https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/

---

**Ready to proceed when you provide the OAuth credentials!** 🚀