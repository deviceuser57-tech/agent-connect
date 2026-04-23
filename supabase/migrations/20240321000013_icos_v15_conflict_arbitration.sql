-- GRAVITY GOVERNANCE v1.4: Dual-Intelligence Arbitration
CREATE TYPE conflict_type AS ENUM ('RISK_CONFLICT', 'ACTION_CONFLICT', 'PATH_CONFLICT', 'EXPLORATION_CONFLICT');

-- Table for logging internal cognitive conflicts
CREATE TABLE IF NOT EXISTS public.conflict_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    type conflict_type NOT NULL,
    severity FLOAT NOT NULL,
    dna_preference JSONB,
    governance_decision JSONB,
    final_arbitration JSONB,
    outcome_score FLOAT, -- Filled after execution
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Update governance_state with authority balancing factors
ALTER TABLE public.governance_state 
ADD COLUMN IF NOT EXISTS adaptability_factor FLOAT DEFAULT 0.5, -- How much we trust DNA
ADD COLUMN IF NOT EXISTS safety_factor FLOAT DEFAULT 0.5; -- How much we trust Governance

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE conflict_logs;
