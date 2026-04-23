-- GRAVITY GOVERNANCE v1.2: Adaptive Intelligence Layer
CREATE TYPE governance_mode AS ENUM ('STRICT_MODE', 'BALANCED_MODE', 'PERMISSIVE_MODE', 'INVESTIGATIVE_MODE');

-- Extend traces with outcome correlation
ALTER TABLE public.governance_traces 
ADD COLUMN IF NOT EXISTS outcome_score FLOAT,
ADD COLUMN IF NOT EXISTS governance_bias_delta FLOAT,
ADD COLUMN IF NOT EXISTS execution_signature TEXT,
ADD COLUMN IF NOT EXISTS projected_risk_at_time FLOAT;

-- Governance State (Stateful Layer)
CREATE TABLE IF NOT EXISTS public.governance_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL UNIQUE,
    current_mode governance_mode DEFAULT 'BALANCED_MODE',
    governance_bias FLOAT DEFAULT 0.0,
    approval_threshold_adj FLOAT DEFAULT 0.0,
    last_tuned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    executions_since_last_tune INTEGER DEFAULT 0
);

-- Governance Accuracy Log (for the Tuner)
CREATE TABLE IF NOT EXISTS public.governance_accuracy_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    accuracy_score FLOAT, -- 1.0 = Perfect prediction, 0.0 = total mismatch
    deviation FLOAT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Realtime activation
ALTER PUBLICATION supabase_realtime ADD TABLE governance_state;
ALTER PUBLICATION supabase_realtime ADD TABLE governance_accuracy_log;
