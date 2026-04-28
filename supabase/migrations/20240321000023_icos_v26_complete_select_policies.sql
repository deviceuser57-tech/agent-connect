-- GRAVITY SECURITY v2.6: Complete SELECT Policy Enforcement
-- Objective: Ensure all 13 core tables have strict but functional SELECT policies.

-- 1. user_roles
DROP POLICY IF EXISTS "authenticated_view_own_role" ON public.user_roles;
DROP POLICY IF EXISTS "admin_read_roles" ON public.user_roles;
CREATE POLICY "user_roles_select_policy" ON public.user_roles 
FOR SELECT TO authenticated 
USING (
    user_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role = 'ADMIN'
    )
);

-- 2. governance_queue
DROP POLICY IF EXISTS "restricted_select_queue" ON public.governance_queue;
CREATE POLICY "governance_queue_select_policy" ON public.governance_queue 
FOR SELECT TO authenticated 
USING (
    proposer_id = auth.uid() 
    OR EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role IN ('ADMIN', 'APPROVER')
    )
);

-- 3. governance_traces
DROP POLICY IF EXISTS "restricted_select_traces" ON public.governance_traces;
DROP POLICY IF EXISTS "authenticated_select_traces" ON public.governance_traces;
CREATE POLICY "governance_traces_select_policy" ON public.governance_traces 
FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role IN ('ADMIN', 'APPROVER')
    )
);

-- 4. governance_rules
DROP POLICY IF EXISTS "universal_select_rules" ON public.governance_rules;
DROP POLICY IF EXISTS "authenticated_view_rules" ON public.governance_rules;
CREATE POLICY "governance_rules_select_policy" ON public.governance_rules 
FOR SELECT TO authenticated 
USING (true);

-- 5. governance_state
DROP POLICY IF EXISTS "universal_select_state" ON public.governance_state;
DROP POLICY IF EXISTS "authenticated_select_state" ON public.governance_state;
CREATE POLICY "governance_state_select_policy" ON public.governance_state 
FOR SELECT TO authenticated 
USING (true);

-- 6. conflict_logs
DROP POLICY IF EXISTS "privileged_select_conflicts" ON public.conflict_logs;
DROP POLICY IF EXISTS "authenticated_select_conflicts" ON public.conflict_logs;
CREATE POLICY "conflict_logs_select_policy" ON public.conflict_logs 
FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role IN ('ADMIN', 'APPROVER', 'VIEWER')
    )
);

-- 7. governance_reflections
DROP POLICY IF EXISTS "privileged_select_reflections" ON public.governance_reflections;
CREATE POLICY "governance_reflections_select_policy" ON public.governance_reflections 
FOR SELECT TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = auth.uid() AND ur.role IN ('ADMIN', 'APPROVER')
    )
);

-- 8. system_state
DROP POLICY IF EXISTS "Allow all" ON public.system_state;
CREATE POLICY "system_state_select_policy" ON public.system_state 
FOR SELECT TO authenticated 
USING (true);

-- 9. snapshots
DROP POLICY IF EXISTS "Allow all" ON public.snapshots;
CREATE POLICY "snapshots_select_policy" ON public.snapshots 
FOR SELECT TO authenticated 
USING (true);

-- 10. execution_logs
DROP POLICY IF EXISTS "Allow all" ON public.execution_logs;
CREATE POLICY "execution_logs_select_policy" ON public.execution_logs 
FOR SELECT TO authenticated 
USING (true);

-- 11. memory_graph_nodes
DROP POLICY IF EXISTS "authenticated_select_nodes" ON public.memory_graph_nodes;
CREATE POLICY "memory_graph_nodes_select_policy" ON public.memory_graph_nodes 
FOR SELECT TO authenticated 
USING (true);

-- 12. collective_negotiations
DROP POLICY IF EXISTS "authenticated_select_negotiations" ON public.collective_negotiations;
CREATE POLICY "collective_negotiations_select_policy" ON public.collective_negotiations 
FOR SELECT TO authenticated 
USING (true);

-- 13. decision_memory
DROP POLICY IF EXISTS "authenticated_select_memory" ON public.decision_memory;
CREATE POLICY "decision_memory_select_policy" ON public.decision_memory 
FOR SELECT TO authenticated 
USING (true);

-- FINAL ENFORCEMENT: Ensure RLS is enabled for everything
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conflict_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collective_negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_memory ENABLE ROW LEVEL SECURITY;
