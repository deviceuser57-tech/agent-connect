CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE public.decision_memory_graph ADD COLUMN IF NOT EXISTS embedding vector(768);
CREATE INDEX IF NOT EXISTS idx_dmg_embedding ON public.decision_memory_graph USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE OR REPLACE FUNCTION public.match_decision_memory(query_embedding vector(768), match_workspace uuid, match_count int DEFAULT 5, min_similarity float DEFAULT 0.5)
RETURNS TABLE (id uuid, context_summary text, fidelity_scores jsonb, outcome_feedback jsonb, created_at timestamptz, similarity float)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, context_summary, fidelity_scores, outcome_feedback, created_at, 1 - (embedding <=> query_embedding) AS similarity
  FROM public.decision_memory_graph
  WHERE workspace_id = match_workspace AND embedding IS NOT NULL AND 1 - (embedding <=> query_embedding) > min_similarity
  ORDER BY embedding <=> query_embedding LIMIT match_count;
$$;
