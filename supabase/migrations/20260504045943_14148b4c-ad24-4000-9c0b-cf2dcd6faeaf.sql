
-- Fix: governance_queue needs SELECT policy
CREATE POLICY "Proposers and admins can read governance_queue"
ON public.governance_queue FOR SELECT TO authenticated
USING (
  proposer_id = auth.uid()
  OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = ANY (ARRAY['ADMIN','APPROVER'])
);

-- Fix: knowledge_folders SELECT - restrict to creator
DROP POLICY "Authenticated users can view folders" ON public.knowledge_folders;
CREATE POLICY "Users can view their own folders"
ON public.knowledge_folders FOR SELECT TO authenticated
USING (created_by = auth.uid());

-- Fix: knowledge_chunks SELECT - restrict to chunks in folders the user owns, or uploaded by them
DROP POLICY "Authenticated users can view chunks" ON public.knowledge_chunks;
CREATE POLICY "Users can view chunks in their folders"
ON public.knowledge_chunks FOR SELECT TO authenticated
USING (
  ((metadata ->> 'uploaded_by')::uuid = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.knowledge_folders f
    WHERE f.id = knowledge_chunks.folder_id AND f.created_by = auth.uid()
  )
);

-- Fix: knowledge_chunks INSERT - require folder ownership and uploader = self
DROP POLICY "Authenticated users can insert chunks" ON public.knowledge_chunks;
CREATE POLICY "Users can insert chunks into their folders"
ON public.knowledge_chunks FOR INSERT TO authenticated
WITH CHECK (
  ((metadata ->> 'uploaded_by')::uuid = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.knowledge_folders f
    WHERE f.id = knowledge_chunks.folder_id AND f.created_by = auth.uid()
  )
);
