-- GRAVITY GOVERNANCE v1.5: Meta-Cognitive Self-Awareness
CREATE TABLE IF NOT EXISTS public.governance_reflections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    decision_id UUID, -- Reference to conflict_logs or governance_traces
    reflection_data JSONB NOT NULL,
    self_bias_score FLOAT,
    success_alignment FLOAT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.governance_causality_graph (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    source_node TEXT NOT NULL, -- e.g., 'DNA_INTENT', 'GOV_RULE', 'USER_ROLE'
    target_node TEXT NOT NULL, -- e.g., 'ARBITRATION_DECISION'
    influence_weight FLOAT DEFAULT 1.0,
    decision_pressure FLOAT DEFAULT 0.0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.meta_evaluation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    accuracy_trend FLOAT,
    effectiveness_trend FLOAT,
    stability_index FLOAT,
    adjustment_actions TEXT[],
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE governance_reflections, governance_causality_graph, meta_evaluation_logs;
