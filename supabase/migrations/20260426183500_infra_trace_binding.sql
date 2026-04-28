-- AC-009.6 — Trace Binding & Drift Protection (INFRA Layer)

-- 1. ADD TRACE COLUMNS TO CORE TABLES
ALTER TABLE public.execution_logs 
ADD COLUMN IF NOT EXISTS trace_ref TEXT DEFAULT 'LEGACY',
ADD COLUMN IF NOT EXISTS execution_id TEXT DEFAULT 'LEGACY',
ADD COLUMN IF NOT EXISTS meis_id TEXT DEFAULT 'LEGACY';

ALTER TABLE public.system_state 
ADD COLUMN IF NOT EXISTS trace_ref TEXT DEFAULT 'LEGACY',
ADD COLUMN IF NOT EXISTS execution_id TEXT DEFAULT 'LEGACY',
ADD COLUMN IF NOT EXISTS meis_id TEXT DEFAULT 'LEGACY';

ALTER TABLE public.governance_traces 
ADD COLUMN IF NOT EXISTS trace_ref TEXT DEFAULT 'LEGACY',
ADD COLUMN IF NOT EXISTS execution_id TEXT DEFAULT 'LEGACY',
ADD COLUMN IF NOT EXISTS meis_id TEXT DEFAULT 'LEGACY';

-- 2. ENFORCE BINDING FOR NEW ENTRIES
-- Ensuring we don't have nulls, which forces the app to at least provide 'LEGACY' if unknown.
ALTER TABLE public.execution_logs 
ALTER COLUMN trace_ref SET NOT NULL,
ALTER COLUMN execution_id SET NOT NULL,
ALTER COLUMN meis_id SET NOT NULL;

ALTER TABLE public.system_state 
ALTER COLUMN trace_ref SET NOT NULL,
ALTER COLUMN execution_id SET NOT NULL,
ALTER COLUMN meis_id SET NOT NULL;

ALTER TABLE public.governance_traces 
ALTER COLUMN trace_ref SET NOT NULL,
ALTER COLUMN execution_id SET NOT NULL,
ALTER COLUMN meis_id SET NOT NULL;

-- 3. GOVERNANCE DRIFT PROTECTION
-- Function to validate that rule changes are justified by a deterministic trace.
CREATE OR REPLACE FUNCTION public.validate_governance_change()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- RULE: Any modification to governance_rules MUST be linked to an origin trace.
    -- This prevents manual DB injection of rules without a cognitive audit trail.
    IF (TG_OP = 'UPDATE') THEN
        IF (NEW.condition_value != OLD.condition_value OR NEW.action != OLD.action OR NEW.is_active != OLD.is_active) THEN
            IF (NEW.origin_trace_id IS NULL) THEN
                RAISE EXCEPTION 'GOVERNANCE_DRIFT_VIOLATION: Manual mutation of governance rules is forbidden. origin_trace_id required.';
            END IF;
        END IF;
    ELSIF (TG_OP = 'INSERT') THEN
        IF (NEW.origin_trace_id IS NULL) THEN
            RAISE EXCEPTION 'GOVERNANCE_DRIFT_VIOLATION: New rules must have an origin_trace_id (from reflection or AC-006).';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger to protect governance integrity
DROP TRIGGER IF EXISTS tr_protect_governance_drift ON public.governance_rules;
CREATE TRIGGER tr_protect_governance_drift
BEFORE INSERT OR UPDATE ON public.governance_rules
FOR EACH ROW EXECUTE FUNCTION public.validate_governance_change();
