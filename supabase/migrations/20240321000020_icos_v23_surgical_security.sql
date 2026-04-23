-- GRAVITY SECURITY v2.3: Surgical Security Hardening
-- Objective: Eliminate all permissive policies and secure the governance queue.

-- 1. Add owner tracking to governance_queue if missing
-- This allows us to restrict SELECT to the own proposer
ALTER TABLE public.governance_queue 
ADD COLUMN IF NOT EXISTS proposer_id UUID DEFAULT auth.uid();

-- 2. HARD-LOCK governance_queue
ALTER TABLE public.governance_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_access_queue" ON public.governance_queue;
DROP POLICY IF EXISTS "authenticated_insert_gov_queue" ON public.governance_queue;
DROP POLICY IF EXISTS "authenticated_read_gov_queue" ON public.governance_queue;
DROP POLICY IF EXISTS "authenticated_update_gov_queue" ON public.governance_queue;
DROP POLICY IF EXISTS "approver_manage_queue" ON public.governance_queue;
DROP POLICY IF EXISTS "executor_propose_action" ON public.governance_queue;


-- 🛡️ POLICY: INSERT (Any authenticated user can propose, but we tag their ID)
CREATE POLICY "proposer_insert_queue" ON public.governance_queue 
FOR INSERT TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);

-- 🛡️ POLICY: SELECT (Proposer can see their own, ADMIN/APPROVER can see all)
CREATE POLICY "restricted_select_queue" ON public.governance_queue 
FOR SELECT TO authenticated 
USING (
  proposer_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('ADMIN', 'APPROVER')
  )
);

-- 🛡️ POLICY: UPDATE (Only ADMIN/APPROVER can update status)
CREATE POLICY "admin_update_queue" ON public.governance_queue 
FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('ADMIN', 'APPROVER')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('ADMIN', 'APPROVER')
  )
);

-- 3. REMOVE ALL REMAINING USING (true) IN SENSITIVE TABLES
-- governance_traces: only viewable by authenticated (fine for SELECT), but no broad update
DROP POLICY IF EXISTS "authenticated_access" ON public.governance_traces;
CREATE POLICY "authenticated_select_traces" ON public.governance_traces FOR SELECT TO authenticated USING (true);
-- (No UPDATE/DELETE policy means they are blocked by default)

-- conflict_logs: selective read
DROP POLICY IF EXISTS "authenticated_view_conflicts" ON public.conflict_logs;
CREATE POLICY "authenticated_select_conflicts" ON public.conflict_logs 
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('ADMIN', 'APPROVER', 'VIEWER')
  )
);

-- governance_state: universal read (fine), but restricted write
DROP POLICY IF EXISTS "authenticated_access_state" ON public.governance_state;
CREATE POLICY "authenticated_select_state" ON public.governance_state FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_state" ON public.governance_state 
FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('ADMIN', 'APPROVER')
  )
);
