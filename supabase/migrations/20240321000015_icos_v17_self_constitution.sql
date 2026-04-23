-- GRAVITY GOVERNANCE v1.6: Self-Constitution & Policy Evolution
CREATE TABLE IF NOT EXISTS public.governance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    condition_type TEXT NOT NULL, -- e.g., 'ACTION', 'RISK', 'ROLE', 'DNA_HYBRID'
    condition_value JSONB,
    action TEXT NOT NULL, -- 'ALLOW', 'BLOCK', 'REQUIRE_APPROVAL'
    priority INTEGER DEFAULT 10,
    confidence_score FLOAT DEFAULT 0.5,
    is_active BOOLEAN DEFAULT TRUE,
    origin_trace_id UUID, -- Link to reflection or conflict that spawned it
    effectiveness_score FLOAT DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.policy_evolution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    evolution_type TEXT NOT NULL, -- 'RULE_STRENGTHENING', 'RULE_WEAKENING', 'RULE_HYBRIDIZATION'
    rule_id UUID,
    delta_data JSONB,
    evolution_score FLOAT, -- (success_rate * 0.5 + adaptation_speed * 0.3 + efficiency * 0.2)
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.constitutional_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    rule_set_snapshot JSONB NOT NULL,
    performance_evaluation JSONB,
    stability_valid BOOLEAN DEFAULT TRUE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE governance_rules, policy_evolution_logs, constitutional_snapshots;
