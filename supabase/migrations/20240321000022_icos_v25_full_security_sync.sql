-- GRAVITY SECURITY v2.5: Full Memory & RPC Hardening
-- Objective: Fix match_decision_memory vulnerability and complete all missing SELECT policies.

-- 1. FIX Vulnerable RPC: match_decision_memory
-- Changing to SECURITY INVOKER to respect RLS or adding manual check.
CREATE OR REPLACE FUNCTION public.match_decision_memory(query_embedding vector, match_threshold float, match_count int)
RETURNS TABLE (
    id UUID,
    content TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY INVOKER -- Now respects RLS of the underlying table
AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.content,
        1 - (m.embedding <=> query_embedding) AS similarity
    FROM decision_memory m
    WHERE 1 - (m.embedding <=> query_embedding) > match_threshold
    ORDER BY m.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 2. COMPLETING SELECT POLICIES FOR ALL TABLES (The 13 Tables Fix)

-- A. user_roles: Already has strict admin read, but let's ensure owners can see their own
DROP POLICY IF EXISTS "authenticated_view_own_role" ON public.user_roles;
CREATE POLICY "authenticated_view_own_role" ON public.user_roles 
FOR SELECT TO authenticated 
USING (user_id = auth.uid() OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'ADMIN');

-- B. governance_traces: Admin/Approver view all, others view own session (if possible)
DROP POLICY IF EXISTS "authenticated_select_traces" ON public.governance_traces;
CREATE POLICY "restricted_select_traces" ON public.governance_traces 
FOR SELECT TO authenticated 
USING (
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('ADMIN', 'APPROVER')
    -- In a real multi-tenant, we'd add session_id owner check here.
);

-- C. governance_rules: Everyone can READ to understand constraints
DROP POLICY IF EXISTS "authenticated_select_rules" ON public.governance_rules;
CREATE POLICY "universal_select_rules" ON public.governance_rules 
FOR SELECT TO authenticated 
USING (true);

-- D. governance_state: Everyone can READ to see mode
DROP POLICY IF EXISTS "authenticated_select_state" ON public.governance_state;
CREATE POLICY "universal_select_state" ON public.governance_state 
FOR SELECT TO authenticated 
USING (true);

-- E. conflict_logs & reflections: Admin/Approver only
DROP POLICY IF EXISTS "authenticated_select_conflicts" ON public.conflict_logs;
CREATE POLICY "privileged_select_conflicts" ON public.conflict_logs 
FOR SELECT TO authenticated 
USING ((SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('ADMIN', 'APPROVER'));

DROP POLICY IF EXISTS "authenticated_select_reflections" ON public.governance_reflections;
CREATE POLICY "privileged_select_reflections" ON public.governance_reflections 
FOR SELECT TO authenticated 
USING ((SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) IN ('ADMIN', 'APPROVER'));

-- F. memory_graph_nodes & collective_negotiations
ALTER TABLE public.memory_graph_nodes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_select_nodes" ON public.memory_graph_nodes;
CREATE POLICY "authenticated_select_nodes" ON public.memory_graph_nodes FOR SELECT TO authenticated USING (true);

ALTER TABLE public.collective_negotiations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_select_negotiations" ON public.collective_negotiations;
CREATE POLICY "authenticated_select_negotiations" ON public.collective_negotiations FOR SELECT TO authenticated USING (true);

-- 3. FINAL LOCK: NO ANON ACCESS ON ANY SENSITIVE TABLES
REVOKE ALL ON public.user_roles FROM anon;
REVOKE ALL ON public.governance_queue FROM anon;
REVOKE ALL ON public.governance_rules FROM anon;
REVOKE ALL ON public.governance_traces FROM anon;
REVOKE ALL ON public.governance_state FROM anon;
