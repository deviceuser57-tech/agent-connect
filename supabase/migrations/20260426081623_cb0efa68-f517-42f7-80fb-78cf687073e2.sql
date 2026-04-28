-- 1) user_roles: prevent privilege escalation
-- Allow users to read their own roles only; block all writes from authenticated users
CREATE POLICY "Users can read own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Block authenticated inserts on user_roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Block authenticated updates on user_roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Block authenticated deletes on user_roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (false);

-- 2) governance_rules / governance_state: restrict broad SELECT
DROP POLICY IF EXISTS universal_select_rules ON public.governance_rules;
DROP POLICY IF EXISTS universal_select_state ON public.governance_state;

CREATE POLICY "Admins/approvers can read governance_rules"
ON public.governance_rules FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1)
  = ANY (ARRAY['ADMIN','APPROVER'])
);

CREATE POLICY "Admins/approvers can read governance_state"
ON public.governance_state FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1)
  = ANY (ARRAY['ADMIN','APPROVER'])
);

-- 3) match_decision_memory: switch to SECURITY INVOKER so RLS on decision_memory is enforced
CREATE OR REPLACE FUNCTION public.match_decision_memory(
  match_count integer,
  match_threshold double precision,
  query_embedding vector
)
RETURNS TABLE(id uuid, content text, similarity double precision)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.content, 1 - (m.embedding <=> query_embedding) AS similarity
  FROM decision_memory m
  WHERE 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;