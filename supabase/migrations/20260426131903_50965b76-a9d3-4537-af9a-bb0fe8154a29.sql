CREATE TABLE IF NOT EXISTS public.knowledge_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES public.knowledge_folders(id) ON DELETE CASCADE,
  workspace_id uuid,
  folder_type text DEFAULT 'general',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view folders"
ON public.knowledge_folders FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create folders"
ON public.knowledge_folders FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creators can update their folders"
ON public.knowledge_folders FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Creators can delete their folders"
ON public.knowledge_folders FOR DELETE
TO authenticated
USING (created_by = auth.uid());

CREATE INDEX IF NOT EXISTS idx_knowledge_folders_parent ON public.knowledge_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_folders_workspace ON public.knowledge_folders(workspace_id);