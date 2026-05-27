DROP POLICY IF EXISTS "Authenticated users can insert kg" ON public.rag_knowledge_graph;

CREATE POLICY "Admins can insert kg"
ON public.rag_knowledge_graph
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT user_roles.role FROM user_roles WHERE user_roles.user_id = auth.uid() LIMIT 1) = 'ADMIN'
);