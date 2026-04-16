
-- 1. Fix rag_query_expansions: tighten SELECT policy to only show user's own expansions
-- Add a user_id column first, then fix policies
-- Since table has no user_id, we'll scope by adding one
ALTER TABLE public.rag_query_expansions ADD COLUMN IF NOT EXISTS user_id uuid;

-- Drop overly permissive policies
DROP POLICY IF EXISTS "View query expansions" ON public.rag_query_expansions;
DROP POLICY IF EXISTS "Create query expansions" ON public.rag_query_expansions;

-- Recreate with proper scoping
CREATE POLICY "Users can view their own query expansions"
  ON public.rag_query_expansions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own query expansions"
  ON public.rag_query_expansions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 2. Fix workspace_members_public view: add security_invoker
DROP VIEW IF EXISTS public.workspace_members_public;
CREATE VIEW public.workspace_members_public
WITH (security_invoker = true)
AS
SELECT 
  tm.id,
  tm.workspace_id,
  tm.role,
  tm.user_id,
  tm.invited_at,
  tm.accepted_at
FROM public.team_members tm
WHERE is_workspace_member(tm.workspace_id);

-- 3. Fix knowledge_folders: remove blanket null-workspace access
DROP POLICY IF EXISTS "Users can view folders" ON public.knowledge_folders;
CREATE POLICY "Users can view folders"
  ON public.knowledge_folders FOR SELECT TO public
  USING (
    (created_by = auth.uid()) 
    OR (workspace_id IS NOT NULL AND workspace_id IN (
      SELECT id FROM workspaces WHERE created_by = auth.uid()
    ))
  );
