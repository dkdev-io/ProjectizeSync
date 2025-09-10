-- =============================================
-- ProjectizeSync MVP Row Level Security Policies
-- Created: 2024-09-09
-- Purpose: Secure data access for MVP
-- =============================================

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_syncs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PROFILES POLICIES
-- =============================================

-- Users can view all profiles (for member selection, etc.)
CREATE POLICY "Anyone can view profiles" ON public.profiles
    FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- =============================================
-- PROJECTS POLICIES
-- =============================================

-- Users can view projects they are members of
CREATE POLICY "Users can view projects they belong to" ON public.projects
    FOR SELECT USING (
        id IN (
            SELECT project_id 
            FROM public.project_members 
            WHERE user_id = auth.uid()
        )
    );

-- Users can create new projects
CREATE POLICY "Authenticated users can create projects" ON public.projects
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

-- Only admins can update projects
CREATE POLICY "Project admins can update projects" ON public.projects
    FOR UPDATE USING (
        id IN (
            SELECT project_id 
            FROM public.project_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can delete projects
CREATE POLICY "Project admins can delete projects" ON public.projects
    FOR DELETE USING (
        id IN (
            SELECT project_id 
            FROM public.project_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================
-- PROJECT MEMBERS POLICIES
-- =============================================

-- Users can view members of projects they belong to
CREATE POLICY "Users can view project members" ON public.project_members
    FOR SELECT USING (
        project_id IN (
            SELECT project_id 
            FROM public.project_members 
            WHERE user_id = auth.uid()
        )
    );

-- Project admins can add members
CREATE POLICY "Project admins can add members" ON public.project_members
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT project_id 
            FROM public.project_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Project admins can update member roles
CREATE POLICY "Project admins can update member roles" ON public.project_members
    FOR UPDATE USING (
        project_id IN (
            SELECT project_id 
            FROM public.project_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Project admins can remove members (except themselves)
CREATE POLICY "Project admins can remove members" ON public.project_members
    FOR DELETE USING (
        project_id IN (
            SELECT project_id 
            FROM public.project_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
        AND user_id != auth.uid() -- Can't remove themselves
    );

-- =============================================
-- TASK SYNCS POLICIES
-- =============================================

-- Users can view task syncs for their projects
CREATE POLICY "Users can view task syncs for their projects" ON public.task_syncs
    FOR SELECT USING (
        project_id IN (
            SELECT project_id 
            FROM public.project_members 
            WHERE user_id = auth.uid()
        )
    );

-- Project members can create task syncs
CREATE POLICY "Project members can create task syncs" ON public.task_syncs
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT project_id 
            FROM public.project_members 
            WHERE user_id = auth.uid()
        )
    );

-- Project members can update task syncs
CREATE POLICY "Project members can update task syncs" ON public.task_syncs
    FOR UPDATE USING (
        project_id IN (
            SELECT project_id 
            FROM public.project_members 
            WHERE user_id = auth.uid()
        )
    );

-- Only project admins can delete task syncs
CREATE POLICY "Project admins can delete task syncs" ON public.task_syncs
    FOR DELETE USING (
        project_id IN (
            SELECT project_id 
            FROM public.project_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- =============================================
-- USER INTEGRATIONS POLICIES
-- =============================================

-- Users can only view their own integrations
CREATE POLICY "Users can view own integrations" ON public.user_integrations
    FOR SELECT USING (user_id = auth.uid());

-- Users can only insert their own integrations
CREATE POLICY "Users can create own integrations" ON public.user_integrations
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can only update their own integrations
CREATE POLICY "Users can update own integrations" ON public.user_integrations
    FOR UPDATE USING (user_id = auth.uid());

-- Users can only delete their own integrations
CREATE POLICY "Users can delete own integrations" ON public.user_integrations
    FOR DELETE USING (user_id = auth.uid());

-- =============================================
-- SYNC LOGS POLICIES
-- =============================================

-- Users can view sync logs for their projects
CREATE POLICY "Users can view sync logs for their projects" ON public.sync_logs
    FOR SELECT USING (
        project_id IN (
            SELECT project_id 
            FROM public.project_members 
            WHERE user_id = auth.uid()
        )
    );

-- System can insert sync logs (using service role)
-- Individual users cannot directly insert sync logs
CREATE POLICY "Service role can insert sync logs" ON public.sync_logs
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- HELPER FUNCTIONS FOR POLICIES
-- =============================================

-- Function to check if user is project admin
CREATE OR REPLACE FUNCTION public.is_project_admin(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.project_members 
        WHERE project_id = project_uuid 
        AND user_id = user_uuid 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is project member
CREATE OR REPLACE FUNCTION public.is_project_member(project_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.project_members 
        WHERE project_id = project_uuid 
        AND user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- INITIAL DATA SETUP
-- =============================================

-- This will be populated when users sign up and create projects