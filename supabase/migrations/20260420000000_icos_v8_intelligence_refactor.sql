-- Intelligence Layer Refactor: Aligning DB with CMACK v2.3 Logic
ALTER TABLE public.execution_traces 
ADD COLUMN IF NOT EXISTS predicted_risk FLOAT,
ADD COLUMN IF NOT EXISTS actual_weight FLOAT,
ADD COLUMN IF NOT EXISTS bias FLOAT,
ADD COLUMN IF NOT EXISTS deviation FLOAT,
ADD COLUMN IF NOT EXISTS failure_type TEXT,
ADD COLUMN IF NOT EXISTS chaos_type TEXT,
ADD COLUMN IF NOT EXISTS time_to_failure FLOAT,
ADD COLUMN IF NOT EXISTS recovery_cost FLOAT;

-- Refine metadata for causal intelligence
COMMENT ON COLUMN public.execution_traces.predicted_risk IS 'The probabilistic risk calculated by ESVL before execution';
COMMENT ON COLUMN public.execution_traces.actual_weight IS 'The ground-truth outcome weight derived after execution';
