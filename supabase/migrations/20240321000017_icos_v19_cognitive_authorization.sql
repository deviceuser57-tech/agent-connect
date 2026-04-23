-- GRAVITY GOVERNANCE v2.0: Cognitive Authorization & RLS Upgrade (CZTEA)
-- Objective: Transform RLS from database protection to role-aware cognitive enforcement.

-- 1. Role Infrastructure
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'APPROVER', 'EXECUTOR', 'BUILDER', 'VIEWER')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, role)
);

-- 2. Helper Function for Role Validation in RLS
CREATE OR REPLACE FUNCTION public.check_user_role(target_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = ANY(target_roles)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Audit Enhancement: Extend governance_traces
ALTER TABLE public.governance_traces 
ADD COLUMN IF NOT EXISTS role_used TEXT,
ADD COLUMN IF NOT EXISTS action_requested TEXT,
ADD COLUMN IF NOT EXISTS action_granted BOOLEAN,
ADD COLUMN IF NOT EXISTS rls_decision TEXT,
ADD COLUMN IF NOT EXISTS violation_flag BOOLEAN DEFAULT FALSE;

-- 4. APPLY COGNITIVE RLS POLICIES (UPGRADE)

-- Enable RLS (Should be already on, but forced here)
ALTER TABLE public.governance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_state ENABLE ROW LEVEL SECURITY;

-- CLEAR OLD POLICIES
DROP POLICY IF EXISTS "auth_policy" ON public.governance_rules;
DROP POLICY IF EXISTS "authenticated_read_rules" ON public.governance_rules;
DROP POLICY IF EXISTS "system_manage_rules" ON public.governance_rules;

-- NEW COGNITIVE POLICIES: governance_rules
-- ONLY ADMIN / BUILDER can manage rules
CREATE POLICY "admin_manage_rules" ON public.governance_rules 
FOR ALL TO authenticated 
USING (public.check_user_role(ARRAY['ADMIN', 'BUILDER']));

CREATE POLICY "viewer_read_rules" ON public.governance_rules 
FOR SELECT TO authenticated 
USING (public.check_user_role(ARRAY['ADMIN', 'BUILDER', 'APPROVER', 'EXECUTOR', 'VIEWER']));

-- NEW COGNITIVE POLICIES: governance_queue
-- EXECUTOR can INSERT, APPROVER can SELECT/UPDATE
CREATE POLICY "executor_propose_action" ON public.governance_queue 
FOR INSERT TO authenticated 
WITH CHECK (public.check_user_role(ARRAY['EXECUTOR', 'ADMIN']));

CREATE POLICY "approver_manage_queue" ON public.governance_queue 
FOR ALL TO authenticated 
USING (public.check_user_role(ARRAY['APPROVER', 'ADMIN']));

-- NEW COGNITIVE POLICIES: governance_state
-- SYSTEM (Admin/App) updates, ALL can view
CREATE POLICY "admin_control_state" ON public.governance_state 
FOR ALL TO authenticated 
USING (public.check_user_role(ARRAY['ADMIN', 'APPROVER']));

CREATE POLICY "universal_view_state" ON public.governance_state 
FOR SELECT TO authenticated 
USING (true);

-- NEW COGNITIVE POLICIES: conflict_logs & reflections
CREATE POLICY "authenticated_view_cognitive_data" ON public.conflict_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_view_reflections" ON public.governance_reflections FOR SELECT TO authenticated USING (true);

-- 5. Shadow Security Logging Trigger (Experimental)
-- Detects direct DB access to rules without a trace log (simplified version)
CREATE OR REPLACE FUNCTION public.detect_shadow_security()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.governance_traces 
        WHERE session_id = NEW.session_id 
        AND timestamp > now() - interval '10 seconds'
    ) THEN
        -- This logic is basic but flags potential direct DB mutation bypassing EIL
        INSERT INTO public.governance_traces (session_id, action, user_role, is_blocked, reason, violation_flag)
        VALUES (NEW.session_id, 'SHADOW_ENTRY_DETECTED', 'UNKNOWN', TRUE, 'SECURITY_BYPASS_ATTEMPT', TRUE);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_shadow_rules_detect
BEFORE INSERT OR UPDATE ON public.governance_rules
FOR EACH ROW EXECUTE FUNCTION public.detect_shadow_security();

-- Enable Realtime for roles
ALTER PUBLICATION supabase_realtime ADD TABLE user_roles;
