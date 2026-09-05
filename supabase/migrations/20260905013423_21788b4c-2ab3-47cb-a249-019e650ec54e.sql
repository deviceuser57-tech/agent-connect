CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner','admin','editor','viewer')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE (workspace_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_members_view" ON public.team_members FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR invited_by = auth.uid() OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.created_by = auth.uid())
);
CREATE POLICY "team_members_add" ON public.team_members FOR INSERT TO authenticated WITH CHECK (
  invited_by = auth.uid() AND EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.created_by = auth.uid())
);
CREATE POLICY "team_members_change" ON public.team_members FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.created_by = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.created_by = auth.uid())
);
CREATE POLICY "team_members_remove" ON public.team_members FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.created_by = auth.uid())
);

CREATE TABLE public.workspace_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider text NOT NULL,
  api_key_encrypted text NOT NULL,
  display_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, provider)
);
GRANT ALL ON public.workspace_api_keys TO service_role;
ALTER TABLE public.workspace_api_keys ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_workspace_api_keys_updated_at BEFORE UPDATE ON public.workspace_api_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ai_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  user_defined_name text NOT NULL DEFAULT 'New Agent',
  core_model text NOT NULL DEFAULT 'core_analyst' CHECK (core_model IN ('core_analyst','core_reviewer','core_synthesizer')),
  persona text,
  role_description text,
  intro_sentence text,
  rag_policy jsonb DEFAULT '{"creativity_level":"very_low","knowledge_base_ratio":0.9,"web_verification_ratio":0.1,"hallucination_tolerance":"very_low"}'::jsonb,
  allowed_folders uuid[] DEFAULT '{}',
  chunk_priority text[] DEFAULT ARRAY['high']::text[],
  response_rules jsonb DEFAULT '{"step_by_step":true,"cite_if_possible":true,"refuse_if_uncertain":true}'::jsonb,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  active_from time,
  active_until time,
  active_days integer[] DEFAULT ARRAY[0,1,2,3,4,5,6],
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  api_key_id uuid REFERENCES public.workspace_api_keys(id) ON DELETE SET NULL,
  agent_tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  memory_settings jsonb NOT NULL DEFAULT '{"short_term_enabled":true,"context_window_size":10,"long_term_enabled":false,"retention_policy":"keep_successful","learn_preferences":true}'::jsonb,
  awareness_settings jsonb NOT NULL DEFAULT '{"awareness_level":2,"self_role_enabled":false,"role_boundaries":null,"state_awareness_enabled":false,"state_context_source":"project_status","proactive_reasoning":false,"feedback_learning":false}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_profiles TO authenticated;
GRANT ALL ON public.ai_profiles TO service_role;
ALTER TABLE public.ai_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_profiles_owner" ON public.ai_profiles FOR ALL TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE TRIGGER update_ai_profiles_updated_at BEFORE UPDATE ON public.ai_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.multi_agent_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  canvas_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  agent_nodes jsonb NOT NULL DEFAULT '[]'::jsonb,
  connections jsonb NOT NULL DEFAULT '[]'::jsonb,
  input_folder_id uuid REFERENCES public.knowledge_folders(id) ON DELETE SET NULL,
  output_folder_id uuid REFERENCES public.knowledge_folders(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.multi_agent_configs TO authenticated;
GRANT ALL ON public.multi_agent_configs TO service_role;
ALTER TABLE public.multi_agent_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "multi_agent_configs_owner" ON public.multi_agent_configs FOR ALL TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE TRIGGER update_multi_agent_configs_updated_at BEFORE UPDATE ON public.multi_agent_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.agent_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  canvas_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  handoff_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  execution_mode text NOT NULL DEFAULT 'sequential' CHECK (execution_mode IN ('sequential','parallel')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_workflows TO authenticated;
GRANT ALL ON public.agent_workflows TO service_role;
ALTER TABLE public.agent_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_workflows_owner" ON public.agent_workflows FOR ALL TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE TRIGGER update_agent_workflows_updated_at BEFORE UPDATE ON public.agent_workflows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES public.multi_agent_configs(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  trigger_type text NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual','scheduled','webhook')),
  input_data jsonb,
  output_data jsonb,
  error_message text,
  execution_logs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.workflow_runs TO authenticated;
GRANT ALL ON public.workflow_runs TO service_role;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflow_runs_owner_view" ON public.workflow_runs FOR SELECT TO authenticated USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.created_by = auth.uid()));

CREATE TABLE public.scheduled_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES public.multi_agent_configs(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  cron_expression text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_jobs TO authenticated;
GRANT ALL ON public.scheduled_jobs TO service_role;
ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scheduled_jobs_owner" ON public.scheduled_jobs FOR ALL TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE TRIGGER update_scheduled_jobs_updated_at BEFORE UPDATE ON public.scheduled_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.ai_profiles(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  query text,
  response_time_ms integer,
  tokens_used integer,
  folders_accessed uuid[],
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.usage_logs TO authenticated;
GRANT ALL ON public.usage_logs TO service_role;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usage_logs_owner_view" ON public.usage_logs FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.ai_profiles(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'New Chat',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_conversations TO authenticated;
GRANT ALL ON public.chat_conversations TO service_role;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_conversations_owner" ON public.chat_conversations FOR ALL TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON public.chat_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  tokens_used integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_messages_owner_view" ON public.chat_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid()));
CREATE POLICY "chat_messages_owner_add" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.chat_conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid()));

CREATE TABLE public.activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_name text,
  description text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_feed TO authenticated;
GRANT ALL ON public.activity_feed TO service_role;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_feed_workspace_view" ON public.activity_feed FOR SELECT TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.created_by = auth.uid()));
CREATE POLICY "activity_feed_owner_add" ON public.activity_feed FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE public.marketplace_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  item_type text NOT NULL CHECK (item_type IN ('single_agent','multi_agent')),
  config_data jsonb NOT NULL,
  canvas_data jsonb,
  agent_count integer NOT NULL DEFAULT 1,
  tags text[],
  category text,
  publisher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  publisher_workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_config_id uuid,
  is_public boolean NOT NULL DEFAULT true,
  download_count integer NOT NULL DEFAULT 0,
  rating numeric(2,1) NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_items TO authenticated;
GRANT ALL ON public.marketplace_items TO service_role;
ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "marketplace_items_view" ON public.marketplace_items FOR SELECT TO authenticated USING (is_public OR publisher_id = auth.uid());
CREATE POLICY "marketplace_items_add" ON public.marketplace_items FOR INSERT TO authenticated WITH CHECK (publisher_id = auth.uid());
CREATE POLICY "marketplace_items_change" ON public.marketplace_items FOR UPDATE TO authenticated USING (publisher_id = auth.uid()) WITH CHECK (publisher_id = auth.uid());
CREATE POLICY "marketplace_items_remove" ON public.marketplace_items FOR DELETE TO authenticated USING (publisher_id = auth.uid());
CREATE TRIGGER update_marketplace_items_updated_at BEFORE UPDATE ON public.marketplace_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.marketplace_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_item_id uuid NOT NULL REFERENCES public.marketplace_items(id) ON DELETE CASCADE,
  imported_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  imported_config_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.marketplace_imports TO authenticated;
GRANT ALL ON public.marketplace_imports TO service_role;
ALTER TABLE public.marketplace_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "marketplace_imports_owner" ON public.marketplace_imports FOR ALL TO authenticated USING (imported_by = auth.uid()) WITH CHECK (imported_by = auth.uid());

CREATE TABLE public.agent_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_name text NOT NULL,
  description text,
  tool_type text NOT NULL CHECK (tool_type IN ('search','web','calculate','summarize','compare','analyze')),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.agent_tools TO authenticated;
GRANT ALL ON public.agent_tools TO service_role;
ALTER TABLE public.agent_tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_tools_view" ON public.agent_tools FOR SELECT TO authenticated USING (workspace_id IS NULL OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.created_by = auth.uid()));
CREATE TRIGGER update_agent_tools_updated_at BEFORE UPDATE ON public.agent_tools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.exported_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  multi_agent_config_id uuid NOT NULL REFERENCES public.multi_agent_configs(id) ON DELETE CASCADE,
  config_data jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  exported_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.exported_configs TO authenticated;
GRANT ALL ON public.exported_configs TO service_role;
ALTER TABLE public.exported_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exported_configs_owner" ON public.exported_configs FOR ALL TO authenticated USING (exported_by = auth.uid()) WITH CHECK (exported_by = auth.uid());

CREATE INDEX idx_ai_profiles_created_by ON public.ai_profiles(created_by);
CREATE INDEX idx_ai_profiles_workspace ON public.ai_profiles(workspace_id);
CREATE INDEX idx_multi_agent_configs_workspace ON public.multi_agent_configs(workspace_id);
CREATE INDEX idx_workflow_runs_workspace_created ON public.workflow_runs(workspace_id, created_at DESC);
CREATE INDEX idx_usage_logs_user_created ON public.usage_logs(user_id, created_at DESC);
CREATE INDEX idx_chat_conversations_owner ON public.chat_conversations(created_by, updated_at DESC);
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at);
CREATE INDEX idx_activity_feed_workspace_created ON public.activity_feed(workspace_id, created_at DESC);
CREATE INDEX idx_marketplace_items_public ON public.marketplace_items(is_public, created_at DESC);
CREATE INDEX idx_scheduled_jobs_workspace ON public.scheduled_jobs(workspace_id);