-- GRAVITY GOVERNANCE v1.3: Stability & Drift Control
ALTER TABLE public.governance_state 
ADD COLUMN IF NOT EXISTS drift_score FLOAT DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS stability_window_counter INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_mode_change_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS is_drift_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS optimal_policy_snapshot JSONB;

-- Governance Accuracy Log update
ALTER TABLE public.governance_accuracy_log 
ADD COLUMN IF NOT EXISTS signal_type TEXT; -- EXECUTION vs GOVERNANCE
