import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://kyyovrswnucxzvupffvv.supabase.co'
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eW92cnN3bnVjeHp2dXBmZnZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NjYxMjgsImV4cCI6MjA3MzA0MjEyOH0.qfO-MSCnzQExXJtOpiTzdLbf_jRvQlM3PFUYQ39IuUQ'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Auth helpers
export const auth = {
  signUp: (email, password, options = {}) => supabase.auth.signUp({ email, password, options }),
  signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
  signOut: () => supabase.auth.signOut(),
  getSession: () => supabase.auth.getSession(),
  getUser: () => supabase.auth.getUser(),
  onAuthStateChange: (callback) => supabase.auth.onAuthStateChange(callback)
}

// Database helpers
export const db = {
  // Profiles
  getProfile: (id) => supabase.from('profiles').select('*').eq('id', id).single(),
  updateProfile: (id, updates) => supabase.from('profiles').update(updates).eq('id', id),
  
  // Projects
  getProjects: () => supabase.from('projects').select(`
    *,
    project_members!inner(role),
    profiles:created_by(full_name)
  `),
  createProject: (project) => supabase.from('projects').insert(project).select(),
  updateProject: (id, updates) => supabase.from('projects').update(updates).eq('id', id),
  deleteProject: (id) => supabase.from('projects').delete().eq('id', id),
  
  // Project members
  getProjectMembers: (projectId) => supabase.from('project_members').select(`
    *,
    profiles(full_name, email, avatar_url)
  `).eq('project_id', projectId),
  addProjectMember: (member) => supabase.from('project_members').insert(member),
  updateMemberRole: (id, role) => supabase.from('project_members').update({ role }).eq('id', id),
  removeProjectMember: (id) => supabase.from('project_members').delete().eq('id', id),
  
  // Task syncs
  getTaskSyncs: (projectId) => supabase.from('task_syncs').select('*').eq('project_id', projectId),
  createTaskSync: (taskSync) => supabase.from('task_syncs').insert(taskSync).select(),
  updateTaskSync: (id, updates) => supabase.from('task_syncs').update(updates).eq('id', id),
  deleteTaskSync: (id) => supabase.from('task_syncs').delete().eq('id', id),
  
  // User integrations
  getUserIntegrations: () => supabase.from('user_integrations').select('*'),
  createIntegration: (integration) => supabase.from('user_integrations').insert(integration).select(),
  updateIntegration: (id, updates) => supabase.from('user_integrations').update(updates).eq('id', id),
  deleteIntegration: (id) => supabase.from('user_integrations').delete().eq('id', id),
  
  // Sync logs
  getSyncLogs: (projectId, limit = 50) => supabase.from('sync_logs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit)
}