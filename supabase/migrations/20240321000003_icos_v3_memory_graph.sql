-- CCGK: Causal Cognitive Graph Schema
CREATE TABLE IF NOT EXISTS public.memory_graph_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    state TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    weight FLOAT DEFAULT 0.5, -- failure = 1.0, success = 0.5, neutral = 0.1
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.memory_graph_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES memory_graph_nodes(id),
    target_id UUID REFERENCES memory_graph_nodes(id),
    relation_type TEXT DEFAULT 'causal',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memory_graph_session ON memory_graph_nodes(session_id);
