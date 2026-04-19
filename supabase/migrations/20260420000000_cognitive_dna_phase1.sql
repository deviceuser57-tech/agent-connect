-- Cognitive Architecture — Phase 1: DNA + Memory Foundation
CREATE TABLE IF NOT EXISTS public.cognitive_dna (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  version int NOT NULL DEFAULT 1,
  parent_version int,
  identity jsonb NOT NULL DEFAULT '{}'::jsonb,
  philosophy jsonb NOT NULL DEFAULT '{}'::jsonb,
  value_system jsonb NOT NULL DEFAULT '{}'::jsonb,
  reasoning_constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
  learning_boundaries jsonb NOT NULL DEFAULT '{}'::jsonb,
  evolution_permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  governance jsonb NOT NULL DEFAULT '{"adversarial_provider":"openai/gpt-5-mini","primary_provider":"google/gemini-3-flash-preview"}'::jsonb,
  hot_path jsonb NOT NULL DEFAULT '{"enabled":true,"threshold":0.35}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, version)
);
CREATE INDEX IF NOT EXISTS idx_cognitive_dna_workspace ON public.cognitive_dna(workspace_id, is_active);
ALTER TABLE public.cognitive_dna ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dna_read" ON public.cognitive_dna FOR SELECT TO authenticated
USING (workspace_id IN (
  SELECT id FROM public.workspaces WHERE created_by = auth.uid()
  UNION SELECT workspace_id FROM public.team_members WHERE user_id = auth.uid()
));
CREATE POLICY "dna_write" ON public.cognitive_dna FOR ALL TO authenticated
USING (workspace_id IN (
  SELECT id FROM public.workspaces WHERE created_by = auth.uid()
  UNION SELECT workspace_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner','admin')
))
WITH CHECK (workspace_id IN (
  SELECT id FROM public.workspaces WHERE created_by = auth.uid()
  UNION SELECT workspace_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner','admin')
));

CREATE TABLE IF NOT EXISTS public.dna_overlays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  base_dna_id uuid REFERENCES public.cognitive_dna(id) ON DELETE SET NULL,
  overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dna_overlays_workflow ON public.dna_overlays(workflow_id);
ALTER TABLE public.dna_overlays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "overlays_all" ON public.dna_overlays FOR ALL TO authenticated
USING (workspace_id IN (
  SELECT id FROM public.workspaces WHERE created_by = auth.uid()
  UNION SELECT workspace_id FROM public.team_members WHERE user_id = auth.uid()
))
WITH CHECK (workspace_id IN (
  SELECT id FROM public.workspaces WHERE created_by = auth.uid()
  UNION SELECT workspace_id FROM public.team_members WHERE user_id = auth.uid()
));

CREATE TABLE IF NOT EXISTS public.decision_memory_graph (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  dna_version int,
  context jsonb NOT NULL,
  reasoning_path jsonb NOT NULL DEFAULT '[]'::jsonb,
  simulation_branches jsonb NOT NULL DEFAULT '[]'::jsonb,
  outcome_feedback jsonb NOT NULL DEFAULT '{}'::jsonb,
  fidelity_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  context_summary text,
  embedding_text text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dmg_workspace ON public.decision_memory_graph(workspace_id, created_at DESC);
ALTER TABLE public.decision_memory_graph ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dmg_all" ON public.decision_memory_graph FOR ALL TO authenticated
USING (workspace_id IN (
  SELECT id FROM public.workspaces WHERE created_by = auth.uid()
  UNION SELECT workspace_id FROM public.team_members WHERE user_id = auth.uid()
))
WITH CHECK (workspace_id IN (
  SELECT id FROM public.workspaces WHERE created_by = auth.uid()
  UNION SELECT workspace_id FROM public.team_members WHERE user_id = auth.uid()
));

CREATE TABLE IF NOT EXISTS public.dna_mutations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  base_dna_id uuid REFERENCES public.cognitive_dna(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'workspace' CHECK (scope IN ('workspace','overlay')),
  overlay_id uuid REFERENCES public.dna_overlays(id) ON DELETE CASCADE,
  proposed_mutation jsonb NOT NULL,
  trigger_reason text,
  shadow_test_results jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','superseded')),
  governance_verdict jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dna_mutations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mut_read" ON public.dna_mutations FOR SELECT TO authenticated
USING (workspace_id IN (
  SELECT id FROM public.workspaces WHERE created_by = auth.uid()
  UNION SELECT workspace_id FROM public.team_members WHERE user_id = auth.uid()
));
CREATE POLICY "mut_write" ON public.dna_mutations FOR ALL TO authenticated
USING (workspace_id IN (
  SELECT id FROM public.workspaces WHERE created_by = auth.uid()
  UNION SELECT workspace_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner','admin')
))
WITH CHECK (workspace_id IN (
  SELECT id FROM public.workspaces WHERE created_by = auth.uid()
  UNION SELECT workspace_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner','admin')
));

CREATE TABLE IF NOT EXISTS public.cognition_traces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  workflow_id uuid,
  dna_id uuid REFERENCES public.cognitive_dna(id) ON DELETE SET NULL,
  user_input text NOT NULL,
  layers jsonb NOT NULL DEFAULT '{}'::jsonb,
  final_spec jsonb,
  hot_path_taken boolean DEFAULT false,
  total_duration_ms int,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','failed','aborted')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_traces_workspace ON public.cognition_traces(workspace_id, created_at DESC);
ALTER TABLE public.cognition_traces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trace_all" ON public.cognition_traces FOR ALL TO authenticated
USING (workspace_id IN (
  SELECT id FROM public.workspaces WHERE created_by = auth.uid()
  UNION SELECT workspace_id FROM public.team_members WHERE user_id = auth.uid()
))
WITH CHECK (workspace_id IN (
  SELECT id FROM public.workspaces WHERE created_by = auth.uid()
  UNION SELECT workspace_id FROM public.team_members WHERE user_id = auth.uid()
));
