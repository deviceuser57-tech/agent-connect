-- GRAVITY SECURITY v2.1: Hard-Lock RLS Enforcement
-- Objective: Close critical privilege escalation holes in user_roles and governance_rules.

-- 1. SECURE user_roles (THE KEYS TO THE KINGDOM)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop all old policies to start fresh
DROP POLICY IF EXISTS "auth_policy" ON public.user_roles;
DROP POLICY IF EXISTS "authenticated_access" ON public.user_roles;

-- Policy: Only ADMINs can READ user_roles
CREATE POLICY "admin_read_roles" ON public.user_roles 
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'ADMIN'
  )
);

-- Policy: Only ADMINs can MANAGE user_roles (Prevent self-promotion)
CREATE POLICY "admin_manage_roles" ON public.user_roles 
FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'ADMIN'
  )
);

-- Note: In a fresh DB, you must manually insert the FIRST admin via Supabase SQL Editor.

-- 2. HARD-LOCK governance_rules
-- Explicitly DROP every permissive policy that overrides the admin check
DROP POLICY IF EXISTS "auth_policy" ON public.governance_rules;
DROP POLICY IF EXISTS "authenticated_access_rules" ON public.governance_rules;
DROP POLICY IF EXISTS "viewer_read_rules" ON public.governance_rules;
DROP POLICY IF EXISTS "admin_manage_rules" ON public.governance_rules;

-- Re-implement ONLY the restricted admin policy
CREATE POLICY "admin_exclusive_manage_rules" ON public.governance_rules 
FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'ADMIN'
  )
);

-- Allow VIEWING of rules for others (but NO modification)
CREATE POLICY "authenticated_view_rules" ON public.governance_rules 
FOR SELECT TO authenticated 
USING (true);


-- 3. SECURE OTHER TABLES (Cleanup)
ALTER TABLE public.governance_accuracy_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conflict_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_evolution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constitutional_snapshots ENABLE ROW LEVEL SECURITY;

-- Final revoke of public (anon) access for ALL tables
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon;', table_name);
    END LOOP;
END $$;
