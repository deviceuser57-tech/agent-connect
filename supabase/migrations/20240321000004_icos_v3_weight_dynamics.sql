-- CCGK v3.1: Weight Dynamics Migration
ALTER TABLE public.memory_graph_nodes 
ADD COLUMN IF NOT EXISTS severity_factor FLOAT DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS context_multiplier FLOAT DEFAULT 1.0;

-- Propagate backward compatibility
UPDATE public.memory_graph_nodes SET severity_factor = 1.0, context_multiplier = 1.0 WHERE severity_factor IS NULL;
