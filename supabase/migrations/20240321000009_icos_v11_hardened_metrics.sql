-- Hardening Observability: Phase 9 Column Expansion
ALTER TABLE public.execution_traces 
ADD COLUMN IF NOT EXISTS predicted_risk FLOAT,
ADD COLUMN IF NOT EXISTS actual_weight FLOAT,
ADD COLUMN IF NOT EXISTS bias FLOAT,
ADD COLUMN IF NOT EXISTS deviation FLOAT,
ADD COLUMN IF NOT EXISTS chaos_type TEXT,
ADD COLUMN IF NOT EXISTS failure_type TEXT,
ADD COLUMN IF NOT EXISTS time_to_failure INTEGER,
ADD COLUMN IF NOT EXISTS recovery_cost FLOAT,
ADD COLUMN IF NOT EXISTS stability_score FLOAT,
ADD COLUMN IF NOT EXISTS behavior_flag TEXT,
ADD COLUMN IF NOT EXISTS mutation_blocked BOOLEAN;

-- Update Indexing for analytics
CREATE INDEX IF NOT EXISTS idx_traces_behavior ON public.execution_traces(behavior_flag);
CREATE INDEX IF NOT EXISTS idx_traces_stability ON public.execution_traces(stability_score);
