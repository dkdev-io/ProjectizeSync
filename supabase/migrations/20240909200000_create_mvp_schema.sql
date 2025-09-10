-- =============================================
-- ProjectizeSync MVP Database Schema
-- Created: 2024-09-09
-- Purpose: Simplified schema for MVP launch
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CORE TABLES
-- =============================================

-- Users table (leverages Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects (sync relationships between Motion and Trello)
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    motion_project_id TEXT,
    motion_workspace_id TEXT,
    trello_board_id TEXT,
    trello_team_id TEXT,
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    sync_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project members with simplified permissions (Admin/Member only)
CREATE TABLE public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member',
    added_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Task synchronization mappings (simplified)
CREATE TABLE public.task_syncs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    motion_task_id TEXT,
    trello_card_id TEXT,
    sync_status TEXT DEFAULT 'active' CHECK (sync_status IN ('active', 'paused', 'error')),
    last_synced TIMESTAMPTZ DEFAULT NOW(),
    last_motion_update TIMESTAMPTZ,
    last_trello_update TIMESTAMPTZ,
    sync_direction TEXT DEFAULT 'bidirectional' CHECK (sync_direction IN ('bidirectional', 'motion_to_trello', 'trello_to_motion')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure at least one platform ID is present
    CONSTRAINT task_sync_has_id CHECK (motion_task_id IS NOT NULL OR trello_card_id IS NOT NULL)
);

-- User integrations for storing OAuth tokens
CREATE TABLE public.user_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('motion', 'trello')),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    last_sync TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform)
);

-- Basic sync logs for debugging and monitoring
CREATE TABLE public.sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id),
    task_sync_id UUID REFERENCES public.task_syncs(id),
    action_type TEXT NOT NULL CHECK (action_type IN ('create', 'update', 'delete', 'sync', 'error')),
    platform TEXT CHECK (platform IN ('motion', 'trello', 'both')),
    success BOOLEAN NOT NULL,
    error_message TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Projects
CREATE INDEX idx_projects_created_by ON public.projects(created_by);
CREATE INDEX idx_projects_sync_enabled ON public.projects(sync_enabled) WHERE sync_enabled = true;

-- Project members
CREATE INDEX idx_project_members_user_id ON public.project_members(user_id);
CREATE INDEX idx_project_members_project_id ON public.project_members(project_id);

-- Task syncs
CREATE INDEX idx_task_syncs_project_id ON public.task_syncs(project_id);
CREATE INDEX idx_task_syncs_motion_task_id ON public.task_syncs(motion_task_id) WHERE motion_task_id IS NOT NULL;
CREATE INDEX idx_task_syncs_trello_card_id ON public.task_syncs(trello_card_id) WHERE trello_card_id IS NOT NULL;
CREATE INDEX idx_task_syncs_status ON public.task_syncs(sync_status);
CREATE INDEX idx_task_syncs_last_synced ON public.task_syncs(last_synced);

-- User integrations
CREATE INDEX idx_user_integrations_user_platform ON public.user_integrations(user_id, platform);
CREATE INDEX idx_user_integrations_active ON public.user_integrations(is_active) WHERE is_active = true;

-- Sync logs
CREATE INDEX idx_sync_logs_created_at ON public.sync_logs(created_at);
CREATE INDEX idx_sync_logs_project_id ON public.sync_logs(project_id);
CREATE INDEX idx_sync_logs_success ON public.sync_logs(success);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER task_syncs_updated_at
    BEFORE UPDATE ON public.task_syncs
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER user_integrations_updated_at
    BEFORE UPDATE ON public.user_integrations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();