-- AC-HARDEN-SQL-EDGE: Unified Security Hardening Migration
-- Objective: Fix search_path mutability and tighten RLS on governance tables.

-- 1. HARDEN FUNCTIONS (search_path fix)

-- atomic_state_commit
CREATE OR REPLACE FUNCTION public.atomic_state_commit(
  p_session_id TEXT,
  p_next_state TEXT,
  p_payload JSONB,
  p_action TEXT
) RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  PERFORM * FROM public.system_state WHERE session_id = p_session_id FOR UPDATE;

  INSERT INTO public.system_state (session_id, current_state, payload, updated_at)
  VALUES (p_session_id, p_next_state, p_payload, now())
  ON CONFLICT (session_id) DO UPDATE SET
    current_state = p_next_state,
    payload = p_payload,
    updated_at = now();

  INSERT INTO public.execution_logs (session_id, action, state, details, created_at)
  VALUES (p_session_id, p_action, p_next_state, p_payload, now());

  SELECT jsonb_build_object('session_id', p_session_id, 'state', p_next_state) INTO v_result;
  RETURN v_result;
END;
$$;

-- check_user_role
CREATE OR REPLACE FUNCTION public.check_user_role(target_roles TEXT[])
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = ANY(target_roles)
    );
END;
$$;

-- detect_shadow_security
CREATE OR REPLACE FUNCTION public.detect_shadow_security()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.governance_traces 
        WHERE session_id = NEW.session_id 
        AND timestamp > now() - interval '10 seconds'
    ) THEN
        INSERT INTO public.governance_traces (session_id, action, user_role, is_blocked, reason, violation_flag)
        VALUES (NEW.session_id, 'SHADOW_ENTRY_DETECTED', 'UNKNOWN', TRUE, 'SECURITY_BYPASS_ATTEMPT', TRUE);
    END IF;
    RETURN NEW;
END;
$$;


-- 2. HARDEN GOVERNANCE RLS (Admin/Approver Only)

-- governance_rules
DROP POLICY IF EXISTS "governance_rules_select_policy" ON public.governance_rules;
DROP POLICY IF EXISTS "admin_manage_rules" ON public.governance_rules;
DROP POLICY IF EXISTS "viewer_read_rules" ON public.governance_rules;
DROP POLICY IF EXISTS "universal_select_rules" ON public.governance_rules;

CREATE POLICY "governance_rules_admin_select" ON public.governance_rules
FOR SELECT TO authenticated
USING (public.check_user_role(ARRAY['ADMIN', 'APPROVER']));

CREATE POLICY "governance_rules_admin_all" ON public.governance_rules
FOR ALL TO authenticated
USING (public.check_user_role(ARRAY['ADMIN', 'BUILDER']));

-- governance_state
DROP POLICY IF EXISTS "governance_state_select_policy" ON public.governance_state;
DROP POLICY IF EXISTS "admin_control_state" ON public.governance_state;
DROP POLICY IF EXISTS "universal_view_state" ON public.governance_state;
DROP POLICY IF EXISTS "universal_select_state" ON public.governance_state;

CREATE POLICY "governance_state_admin_select" ON public.governance_state
FOR SELECT TO authenticated
USING (public.check_user_role(ARRAY['ADMIN', 'APPROVER']));

CREATE POLICY "governance_state_admin_all" ON public.governance_state
FOR ALL TO authenticated
USING (public.check_user_role(ARRAY['ADMIN', 'APPROVER']));


-- 3. ENSURE ALL TABLES HAVE SELECT POLICIES

-- activity_feed
DROP POLICY IF EXISTS "Users can view their workspace activity" ON public.activity_feed;
CREATE POLICY "activity_feed_select_policy" ON public.activity_feed
FOR SELECT TO authenticated
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE public.is_workspace_member(id)));

-- agent_memory
DROP POLICY IF EXISTS "Users can view agent memory" ON public.agent_memory;
CREATE POLICY "agent_memory_select_policy" ON public.agent_memory
FOR SELECT TO authenticated
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE public.is_workspace_member(id)));

-- agent_reasoning_logs
DROP POLICY IF EXISTS "Users can view reasoning logs" ON public.agent_reasoning_logs;
CREATE POLICY "agent_reasoning_logs_select_policy" ON public.agent_reasoning_logs
FOR SELECT TO authenticated
USING (conversation_id IN (SELECT id FROM public.chat_conversations WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE public.is_workspace_member(id))));

-- knowledge_chunks
DROP POLICY IF EXISTS "Users can view chunks" ON public.knowledge_chunks;
CREATE POLICY "knowledge_chunks_select_policy" ON public.knowledge_chunks
FOR SELECT TO authenticated
USING (folder_id IN (SELECT id FROM public.knowledge_folders WHERE workspace_id IN (SELECT id FROM public.workspaces WHERE public.is_workspace_member(id))));

-- team_members
DROP POLICY IF EXISTS "Members can view team members appropriately" ON public.team_members;
CREATE POLICY "team_members_select_policy" ON public.team_members
FOR SELECT TO authenticated
USING (workspace_id IN (SELECT id FROM public.workspaces WHERE public.is_workspace_member(id)));

-- workspaces
DROP POLICY IF EXISTS "Users can view accessible workspaces" ON public.workspaces;
CREATE POLICY "workspaces_select_policy" ON public.workspaces
FOR SELECT TO authenticated
USING (public.is_workspace_member(id));
