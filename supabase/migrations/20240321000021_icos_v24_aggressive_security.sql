-- GRAVITY SECURITY v2.4: Aggressive Hard-Lock & Policy Purge
-- Objective: Forcefully drop all existing permissive policies and re-lock the system.

-- 1. UTILITY: Drop all policies from a table before re-locking
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 2. SECURE governance_queue (ZERO PERMISSIVE STRINGS)
ALTER TABLE public.governance_queue ENABLE ROW LEVEL SECURITY;

-- [INSERT] Only authenticated users, and enforce current user as proposer
CREATE POLICY "strict_insert_queue" ON public.governance_queue 
FOR INSERT TO authenticated 
WITH CHECK (proposer_id = auth.uid());

-- [SELECT] Proposer OR Admin/Approver (Strictly by ID)
CREATE POLICY "strict_select_queue" ON public.governance_queue 
FOR SELECT TO authenticated 
USING (
  proposer_id = auth.uid() 
  OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('ADMIN', 'APPROVER')
);

-- [UPDATE] ADMIN/APPROVER ONLY
CREATE POLICY "strict_update_queue" ON public.governance_queue 
FOR UPDATE TO authenticated 
USING ((SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('ADMIN', 'APPROVER'))
WITH CHECK ((SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('ADMIN', 'APPROVER'));

-- [DELETE] ADMIN ONLY
CREATE POLICY "strict_delete_queue" ON public.governance_queue 
FOR DELETE TO authenticated 
USING ((SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'ADMIN');


-- 3. SECURE governance_rules
ALTER TABLE public.governance_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_rules" ON public.governance_rules 
FOR ALL TO authenticated 
USING ((SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'ADMIN');

CREATE POLICY "authenticated_select_rules" ON public.governance_rules 
FOR SELECT TO authenticated 
USING (true); -- SELECT true is allowed by linter for public visibility within project


-- 4. SECURE governance_state (Removal of USING (true) for UPDATE)
ALTER TABLE public.governance_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_select_state" ON public.governance_state FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_update_state" ON public.governance_state 
FOR UPDATE TO authenticated 
USING ((SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('ADMIN', 'APPROVER'))
WITH CHECK ((SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('ADMIN', 'APPROVER'));


-- 5. SECURE user_roles (Prevent any non-admin read/write)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_user_roles" ON public.user_roles 
FOR ALL TO authenticated 
USING ((SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'ADMIN');

CREATE POLICY "authenticated_view_own_role" ON public.user_roles 
FOR SELECT TO authenticated 
USING (user_id = auth.uid());


-- 6. FINAL SHUTDOWN of anon access
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON public.governance_state TO authenticated;
GRANT SELECT ON public.governance_rules TO authenticated;
GRANT ALL ON public.governance_queue TO authenticated;
