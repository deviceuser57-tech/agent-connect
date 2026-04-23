-- COL v1.0: Cognitive Traceability & Observability
CREATE TABLE IF NOT EXISTS public.execution_traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    trace_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_traces_session ON public.execution_traces(session_id);
