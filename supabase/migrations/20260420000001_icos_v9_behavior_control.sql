-- Phase 9: Behavior Control Layer Schema Extension
ALTER TABLE public.execution_traces 
ADD COLUMN IF NOT EXISTS stability_score FLOAT,
ADD COLUMN IF NOT EXISTS behavior_flag TEXT,
ADD COLUMN IF NOT EXISTS mutation_blocked BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.execution_traces.stability_score IS 'Calculated as 1 - avg(deviation_last_10)';
COMMENT ON COLUMN public.execution_traces.behavior_flag IS 'STABLE, OVER_CONSERVATIVE, or OVER_RISKY';
COMMENT ON COLUMN public.execution_traces.mutation_blocked IS 'Indicates if a mutation was prevented by the rate limiter';
