-- GRAVITY GOVERNANCE v1.7: Unified Audit Stream
-- Objective: Support rich tracing for the Cognitive Enforcement Core (CEC).

ALTER TABLE public.governance_traces 
ADD COLUMN IF NOT EXISTS cognitive_intent TEXT,
ADD COLUMN IF NOT EXISTS security_status TEXT,
ADD COLUMN IF NOT EXISTS risk_score FLOAT DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS drift_score FLOAT DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS violation_flags TEXT[];

-- Update conflict_logs to store unified decision metadata
ALTER TABLE public.conflict_logs
ADD COLUMN IF NOT EXISTS cec_metadata JSONB;
