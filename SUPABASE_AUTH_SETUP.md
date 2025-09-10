# Supabase Auth Configuration Guide

## 🎯 OAuth Provider Setup Required

To complete Task 1.2.1, please configure these OAuth providers in your Supabase dashboard:

### 1. Access Your Supabase Dashboard
Go to: https://supabase.com/dashboard/project/kyyovrswnucxzvupffvv/auth/providers

### 2. Configure Google OAuth

**Steps:**
1. Click on **Google** in the providers list
2. Enable the provider
3. You'll need to create a Google OAuth app first:
   - Go to: https://console.developers.google.com/
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Set authorized redirect URIs to:
     ```
     https://kyyovrswnucxzvupffvv.supabase.co/auth/v1/callback
     ```

**Required Information:**
- Client ID: (from Google Console)
- Client Secret: (from Google Console)

### 3. Configure GitHub OAuth

**Steps:**
1. Click on **GitHub** in the providers list
2. Enable the provider
3. You'll need to create a GitHub OAuth app first:
   - Go to: https://github.com/settings/applications/new
   - Set Authorization callback URL to:
     ```
     https://kyyovrswnucxzvupffvv.supabase.co/auth/v1/callback
     ```

**Required Information:**
- Client ID: (from GitHub)
- Client Secret: (from GitHub)

### 4. Site URL Configuration
Set your site URL to: `https://projectizesync.netlify.app`
(Update this when you have your final domain)

### 5. Redirect URLs
Add these additional redirect URLs:
```
http://localhost:3000
http://127.0.0.1:3000
https://projectizesync.netlify.app
```

---

## 🚀 Alternative: Email-Only Setup (Faster)

If you want to proceed quickly without OAuth providers:
1. Keep Email auth enabled (it's on by default)
2. I'll build the email/password auth first
3. We can add OAuth providers later

**Which approach do you prefer:**
- A) Set up OAuth providers now (requires creating Google & GitHub apps)
- B) Start with email auth and add OAuth later

Let me know your choice and I'll proceed accordingly!