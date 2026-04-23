-- GRAVITY GOVERNANCE v1.0: Infrastructure Layer
CREATE TYPE governance_role AS ENUM ('BUILDER', 'APPROVER', 'EXECUTOR', 'ADMIN');

-- Table for pending actions requiring approval
CREATE TABLE IF NOT EXISTS public.governance_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    proposed_action TEXT NOT NULL,
    payload JSONB,
    proposer_role governance_role NOT NULL,
    status TEXT DEFAULT 'PENDING', -- PENDING, RELEASED, REJECTED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table for tracking every governance decision
CREATE TABLE IF NOT EXISTS public.governance_traces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    action TEXT NOT NULL,
    user_role governance_role NOT NULL,
    is_blocked BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT TRUE,
    reason TEXT,
    shadow_detected BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE governance_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE governance_traces;

-- Indexing
CREATE INDEX IF NOT EXISTS idx_gov_queue_session ON public.governance_queue(session_id);
CREATE INDEX IF NOT EXISTS idx_gov_traces_session ON public.governance_traces(session_id);
