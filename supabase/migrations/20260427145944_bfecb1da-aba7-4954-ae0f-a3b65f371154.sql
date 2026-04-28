
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_file TEXT NOT NULL,
  content TEXT NOT NULL,
  folder_id UUID REFERENCES public.knowledge_folders(id) ON DELETE SET NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  total_chunks INTEGER NOT NULL DEFAULT 1,
  document_summary TEXT,
  document_context TEXT,
  chunk_type TEXT DEFAULT 'content',
  semantic_tags TEXT[] DEFAULT '{}',
  entities JSONB DEFAULT '[]'::jsonb,
  key_concepts TEXT[] DEFAULT '{}',
  quality_score DOUBLE PRECISION DEFAULT 0.5,
  token_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_folder ON public.knowledge_chunks(folder_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_source ON public.knowledge_chunks(source_file);

ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view chunks"
  ON public.knowledge_chunks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert chunks"
  ON public.knowledge_chunks FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Uploaders can update their chunks"
  ON public.knowledge_chunks FOR UPDATE TO authenticated
  USING ((metadata->>'uploaded_by')::uuid = auth.uid());

CREATE POLICY "Uploaders can delete their chunks"
  ON public.knowledge_chunks FOR DELETE TO authenticated
  USING ((metadata->>'uploaded_by')::uuid = auth.uid());

CREATE TABLE IF NOT EXISTS public.rag_knowledge_graph (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_entity TEXT NOT NULL,
  source_type TEXT,
  relationship TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  target_type TEXT,
  chunk_id UUID REFERENCES public.knowledge_chunks(id) ON DELETE CASCADE,
  confidence DOUBLE PRECISION DEFAULT 0.5,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rag_kg_chunk ON public.rag_knowledge_graph(chunk_id);
CREATE INDEX IF NOT EXISTS idx_rag_kg_source ON public.rag_knowledge_graph(source_entity);

ALTER TABLE public.rag_knowledge_graph ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view kg"
  ON public.rag_knowledge_graph FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert kg"
  ON public.rag_knowledge_graph FOR INSERT TO authenticated WITH CHECK (true);
