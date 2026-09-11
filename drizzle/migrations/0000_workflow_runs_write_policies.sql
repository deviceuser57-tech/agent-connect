GRANT SELECT, INSERT, UPDATE ON public.workflow_runs TO authenticated;
GRANT ALL ON public.workflow_runs TO service_role;

CREATE POLICY "workflow_runs_owner_insert"
ON public.workflow_runs FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "workflow_runs_owner_update"
ON public.workflow_runs FOR UPDATE TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());