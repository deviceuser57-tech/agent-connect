-- PHASE 5: Dynamic Cognitive DNA (D-DNA)
CREATE TABLE IF NOT EXISTS public.cognitive_dna (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trait_key TEXT NOT NULL UNIQUE,
    trait_value JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed initial DNA from Constitution
INSERT INTO public.cognitive_dna (trait_key, trait_value)
VALUES 
('autonomy_level', '0.7'),
('risk_tolerance', '0.2'),
('reasoning_depth', '3'),
('max_loops', '10')
ON CONFLICT (trait_key) DO NOTHING;
