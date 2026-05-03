
-- 1. Add admin-only SELECT policies to tables with RLS but no policies
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'conflict_logs','constitutional_snapshots','execution_traces',
    'governance_accuracy_log','governance_causality_graph',
    'governance_reflections','governance_traces',
    'meta_evaluation_logs','policy_evolution_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format($f$
      CREATE POLICY "Admins can read %1$s"
      ON public.%1$I
      FOR SELECT
      TO authenticated
      USING (
        (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'ADMIN'
      );
    $f$, t);
  END LOOP;
END$$;

-- 2. Fix mutable search_path on match_decision_memory (vector overload)
CREATE OR REPLACE FUNCTION public.match_decision_memory(query_embedding vector, match_threshold double precision, match_count integer)
 RETURNS TABLE(id uuid, content text, similarity double precision)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT m.id, m.content, 1 - (m.embedding <=> query_embedding) AS similarity
    FROM decision_memory m
    WHERE 1 - (m.embedding <=> query_embedding) > match_threshold
    ORDER BY m.embedding <=> query_embedding LIMIT match_count;
END;
$function$;
