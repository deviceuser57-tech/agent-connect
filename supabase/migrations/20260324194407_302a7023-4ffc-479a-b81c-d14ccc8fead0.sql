DROP POLICY "Users can create chunks" ON knowledge_chunks;
CREATE POLICY "Users can create chunks"
ON knowledge_chunks FOR INSERT
TO authenticated
WITH CHECK (
  (folder_id IS NULL)
  OR (folder_id IN (
    SELECT id FROM knowledge_folders
    WHERE workspace_id IN (
      SELECT id FROM workspaces WHERE created_by = auth.uid()
      UNION
      SELECT workspace_id FROM team_members WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
  ))
  OR (folder_id IN (
    SELECT id FROM knowledge_folders
    WHERE workspace_id IS NULL AND created_by = auth.uid()
  ))
);