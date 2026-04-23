-- Phase 6: Multi-Agent Collective Identity & Memory
CREATE TABLE IF NOT EXISTS public.agent_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name TEXT NOT NULL UNIQUE,
    cognitive_signature TEXT NOT NULL,
    version TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.collective_negotiations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    proposer_agent_id UUID REFERENCES agent_registry(id),
    proposed_state TEXT NOT NULL,
    votes JSONB DEFAULT '{}'::jsonb,
    consensus_met BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.memory_graph_nodes ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agent_registry(id);
