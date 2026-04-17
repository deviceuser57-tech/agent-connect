import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { WorkflowPreviewDiagram } from '@/components/workflow/WorkflowPreviewDiagram';
import { getSupabaseUrl } from '@/lib/env';
import { autoCompleteWorkflow } from '@/lib/workflows/autoComplete';
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  Workflow,
  ArrowRight,
  Eye,
  Settings2,
  Brain,
  Shield,
  RefreshCw,
  GitBranch,
  Database,
  AlertTriangle,
  CheckCircle2,
  Layers,
} from 'lucide-react';

// ═══════════════════════════════════════
// Types for Fully Executable Workflow Spec
// ═══════════════════════════════════════

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AgentTaskStep {
  step: number;
  action: string;
  input_required: string;
  output_produced: string;
  success_criteria: string;
}

interface InputContract {
  accepts_user_input: boolean;
  accepts_from_agents: string[];
  input_prompt_template: string;
  required_context: string[];
  input_schema: {
    type: string;
    required_fields: string[];
    field_descriptions: Record<string, string>;
  };
}

interface OutputContract {
  output_format: 'structured' | 'json' | 'markdown' | 'freeform';
  output_schema: {
    type: string;
    fields: string[];
    field_descriptions: Record<string, string>;
  };
  passes_to_agents: string[];
  saves_to_memory: boolean;
  saves_to_knowledge_base: boolean;
}

interface KnowledgeBaseUsage {
  mode: 'none' | 'read' | 'write' | 'read_write';
  read_ratio: number;
  write_fields: string[];
  read_queries: string[];
  priority_folders: string[];
}

interface AgentMemoryUsage {
  reads_from_memory: boolean;
  writes_to_memory: boolean;
  memory_keys_read: string[];
  memory_keys_write: string[];
  version_tracking: boolean;
}

interface DependencyRequirements {
  must_complete_before: string[];
  can_run_parallel_with: string[];
  requires_data_from: string[];
}

interface FailureBehavior {
  on_error: 'retry' | 'skip' | 'escalate' | 'abort_workflow';
  on_low_confidence: 'rework' | 'escalate' | 'flag_and_continue';
  confidence_threshold: number;
  max_retries: number;
  retry_backoff_seconds: number;
  escalation_target: string;
}

interface GeneratedAgent {
  display_name: string;
  agent_type: 'worker' | 'orchestrator' | 'evaluator' | 'router';
  role_description: string;
  persona: string;
  intro_sentence: string;
  core_model: 'core_analyst' | 'core_reviewer' | 'core_synthesizer';
  task_list: AgentTaskStep[];
  input_contract: InputContract;
  output_contract: OutputContract;
  knowledge_base_usage: KnowledgeBaseUsage;
  memory_usage: AgentMemoryUsage;
  rag_policy: {
    knowledge_base_ratio: number;
    web_verification_ratio: number;
    creativity_level: 'none' | 'very_low' | 'low' | 'medium' | 'high';
    hallucination_tolerance: 'none' | 'very_low';
  };
  response_rules: {
    step_by_step: boolean;
    cite_if_possible: boolean;
    refuse_if_uncertain: boolean;
    include_confidence_scores: boolean;
    use_bullet_points: boolean;
    summarize_at_end: boolean;
    custom_response_template: string | null;
  };
  dependency_requirements: DependencyRequirements;
  failure_behavior: FailureBehavior;
  awareness_settings: {
    awareness_level: number;
    self_role_enabled: boolean;
    role_boundaries: string;
    state_awareness_enabled: boolean;
    proactive_reasoning: boolean;
    feedback_learning: boolean;
  };
  memory_settings: {
    short_term_enabled: boolean;
    context_window_size: number;
    long_term_enabled: boolean;
    retention_policy: string;
    learn_preferences: boolean;
  };
}

interface WorkflowEdge {
  from: number;
  to: number;
  condition: string;
  condition_value?: string | null;
  data_mapping: {
    description: string;
    fields_passed: string[];
    transformation: string;
  };
  priority: number;
  label: string;
}

interface DAGDefinition {
  entry_points: number[];
  exit_points: number[];
  parallel_groups: number[][];
  execution_order: number[][];
  critical_path: number[];
}

interface ExecutionRules {
  execution_mode: 'dag' | 'sequential' | 'parallel_where_possible';
  dag_definition: DAGDefinition;
  orchestrator: {
    agent_index: number | null;
    task_routing_rules: { condition: string; route_to: string; priority: number }[];
    state_tracking: {
      tracks_per_task_id: boolean;
      tracks_agent_status: boolean;
      tracks_data_flow: boolean;
    };
    rework_triggering: {
      monitors_confidence: boolean;
      monitors_output_quality: boolean;
      auto_rework_threshold: number;
    };
  };
  error_handling: string;
  timeout_seconds: number;
  max_total_retries: number;
  notifications: {
    on_complete: boolean;
    on_error: boolean;
    on_rework: boolean;
    on_timeout: boolean;
  };
}

interface MemorySpec {
  type: string;
  storage: {
    stores_all_agent_outputs: boolean;
    versioned_per_task_id: boolean;
    max_versions_per_key: number;
  };
  access_rules: {
    read_access: string;
    write_access: string;
    conflict_resolution: string;
  };
  retrieval_modes: string[];
  initial_state: Record<string, unknown>;
}

interface ReworkPolicy {
  enabled: boolean;
  trigger_conditions: {
    type: string;
    threshold?: number;
    applies_to: string | string[];
  }[];
  max_rework_cycles: number;
  rework_routing: {
    failed_agent: string;
    rework_agent: string;
    include_feedback: boolean;
  }[];
  escalation_path: {
    after_max_retries: string;
    fallback_agent_index: number | null;
    notification_on_escalation: boolean;
  };
}

interface SafetyPolicy {
  evaluation_enabled: boolean;
  evaluation_agent_index: number | null;
  evaluation_criteria: string[];
  minimum_safety_score: number;
  on_safety_failure: string;
  content_filters: {
    pii_detection: boolean;
    toxicity_check: boolean;
    hallucination_check: boolean;
  };
}

interface GeneratedWorkflow {
  name: string;
  description: string;
  agents: GeneratedAgent[];
  edges: WorkflowEdge[];
  execution_rules: ExecutionRules;
  memory_spec: MemorySpec;
  rework_policy: ReworkPolicy;
  safety_policy: SafetyPolicy;
}

interface WorkflowResult {
  ready: boolean;
  workflow: GeneratedWorkflow;
}

// ═══════════════════════════════════════
// Component
// ═══════════════════════════════════════

export const WorkflowBuilder: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [generatedWorkflow, setGeneratedWorkflow] = useState<WorkflowResult | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const getFunctionErrorMessage = (status: number, fallback: string) => {
    if (status === 401) return 'Please sign in to use the workflow builder.';
    if (status === 403) return 'You do not have permission to access this resource.';
    if (status >= 500) return 'The server encountered an error. Please try again soon.';
    return fallback;
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const parseWorkflowFromResponse = (content: string): WorkflowResult | null => {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.ready && parsed.workflow) {
          return parsed as WorkflowResult;
        }
      } catch (e) {
        console.error('Failed to parse workflow JSON:', e);
      }
    }
    return null;
  };

  const streamChat = async (userMessage: string) => {
    if (!userMessage.trim()) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: 'Authentication Required',
          description: 'Please sign in to use the workflow builder',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `${getSupabaseUrl()}/functions/v1/workflow-builder`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ messages: newMessages }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) throw new Error('Rate limit exceeded. Please try again later.');
        if (response.status === 402) throw new Error('Usage limit reached. Please add credits.');
        throw new Error(getFunctionErrorMessage(response.status, 'Failed to get response'));
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantContent = '';
      let buffer = '';

      setMessages([...newMessages, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                return updated;
              });
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      const workflow = parseWorkflowFromResponse(assistantContent);
      if (workflow) {
        // Defensive normalization: ensure required arrays exist so render code doesn't crash
        const wf = workflow.workflow ?? ({} as GeneratedWorkflow);
        const safeWorkflow: WorkflowResult = {
          ...workflow,
          workflow: {
            ...wf,
            name: wf.name ?? 'Untitled Workflow',
            description: wf.description ?? '',
            agents: Array.isArray(wf.agents) ? wf.agents : [],
            edges: Array.isArray(wf.edges) ? wf.edges : [],
          },
        };
        setGeneratedWorkflow(safeWorkflow);
      }
    } catch (error) {
      console.error('Stream error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process your request',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deployWorkflow = async () => {
    if (!generatedWorkflow || !currentWorkspace) return;

    setIsDeploying(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const wf = generatedWorkflow.workflow;

      // Create agents with full execution specs
      const createdAgentIds: string[] = [];
      for (const agent of wf.agents) {
        const { data: agentData, error: agentError } = await supabase
          .from('ai_profiles')
          .insert([{
            display_name: agent.display_name,
            role_description: agent.role_description,
            persona: agent.persona,
            intro_sentence: agent.intro_sentence,
            core_model: agent.core_model,
            workspace_id: currentWorkspace.id,
            created_by: user.user.id,
            is_active: true,
            rag_policy: agent.rag_policy,
            response_rules: agent.response_rules,
          }] as never)
          .select()
          .single();

        if (agentError) throw agentError;
        createdAgentIds.push(agentData.id);
      }

      // Resolve agent index references to actual IDs
      const getActualAgentId = (indexStr: string) => {
        const match = indexStr.match(/agent_index_(\d+)/);
        if (match) {
          const idx = parseInt(match[1]);
          return createdAgentIds[idx] || null;
        }
        return null;
      };

      // Build canvas nodes
      const nodeSpacing = 250;
      const startY = 200;
      const agentNodes = wf.agents.map((agent, index) => {
        const fromAgents = (agent.input_contract?.accepts_from_agents || [])
          .map(getActualAgentId)
          .filter((id): id is string => id !== null);

        const toAgents = (agent.output_contract?.passes_to_agents || [])
          .map(getActualAgentId)
          .filter((id): id is string => id !== null);

        return {
          id: `agent-${index}`,
          type: 'agent',
          position: { x: 100 + (index * nodeSpacing), y: startY },
          data: {
            label: agent.display_name,
            agentId: createdAgentIds[index],
            model: agent.core_model,
            role: agent.role_description,
            agentType: agent.agent_type,
            inputs: { fromKnowledgeBase: agent.knowledge_base_usage?.read_queries || [], fromAgents },
            outputs: { toKnowledgeBase: agent.output_contract?.saves_to_knowledge_base || false, toAgents },
          },
        };
      });

      const nodes = [
        { id: 'start', type: 'start', position: { x: 100, y: 50 }, data: { label: 'Start' } },
        ...agentNodes,
        { id: 'end', type: 'end', position: { x: 100 + (agentNodes.length * nodeSpacing), y: 50 }, data: { label: 'End' } },
      ];

      const edges = [
        { id: 'e-start-0', source: 'start', target: 'agent-0' },
        ...wf.edges.map((conn, index) => ({
          id: `e-${index}`,
          source: `agent-${conn.from}`,
          target: `agent-${conn.to}`,
          label: conn.label,
          data: { condition: conn.condition, data_mapping: conn.data_mapping },
        })),
        { id: 'e-last-end', source: `agent-${agentNodes.length - 1}`, target: 'end' },
      ];

      // Build full execution spec for storage
      const fullExecutionSpec = {
        agents: wf.agents.map((agent, index) => ({
          nodeId: `agent-${index}`,
          agentId: createdAgentIds[index],
          agent_type: agent.agent_type,
          model: agent.core_model,
          label: agent.display_name,
          task_list: agent.task_list,
          input_contract: agent.input_contract,
          output_contract: agent.output_contract,
          knowledge_base_usage: agent.knowledge_base_usage,
          memory_usage: agent.memory_usage,
          dependency_requirements: agent.dependency_requirements,
          failure_behavior: agent.failure_behavior,
          awareness_settings: agent.awareness_settings,
          memory_settings: agent.memory_settings,
        })),
        edges: wf.edges,
        execution_rules: wf.execution_rules,
        memory_spec: wf.memory_spec,
        rework_policy: wf.rework_policy,
        safety_policy: wf.safety_policy,
      };

      const { data: configData, error: configError } = await supabase
        .from('multi_agent_configs')
        .insert([{
          name: wf.name,
          description: wf.description,
          workspace_id: currentWorkspace.id,
          created_by: user.user.id,
          canvas_data: JSON.parse(JSON.stringify({ nodes, edges, execution_spec: fullExecutionSpec })),
          agent_nodes: JSON.parse(JSON.stringify(fullExecutionSpec.agents)),
          connections: JSON.parse(JSON.stringify(wf.edges)),
        }] as never)
        .select()
        .single();

      if (configError) throw configError;

      toast({
        title: 'Workflow Deployed!',
        description: `Created ${createdAgentIds.length} agents with full execution specs`,
      });

      navigate(`/multi-agent-canvas/${configData.id}`);
    } catch (error) {
      console.error('Deploy error:', error);
      toast({
        title: 'Deployment Failed',
        description: error instanceof Error ? error.message : 'Failed to deploy workflow',
        variant: 'destructive',
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      streamChat(input);
    }
  };

  const getCleanContent = (content: string) => {
    return content.replace(/```json[\s\S]*?```/g, '').trim();
  };

  const agentTypeColors: Record<string, string> = {
    worker: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    orchestrator: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
    evaluator: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    router: 'bg-green-500/10 text-green-500 border-green-500/30',
  };

  // Convert edges to connections format for WorkflowPreviewDiagram
  const getConnectionsForPreview = () => {
    if (!generatedWorkflow) return [];
    return generatedWorkflow.workflow.edges.map(e => ({
      from: e.from,
      to: e.to,
      condition: e.condition as 'always' | 'on_success' | 'on_specific_output',
      data_mapping: e.data_mapping?.description,
    }));
  };

  // Convert agents for preview diagram compatibility
  const getAgentsForPreview = () => {
    if (!generatedWorkflow) return [];
    return generatedWorkflow.workflow.agents.map(a => ({
      display_name: a.display_name,
      role_description: a.role_description,
      persona: a.persona,
      intro_sentence: a.intro_sentence,
      core_model: a.core_model,
      input_config: {
        accepts_user_input: a.input_contract?.accepts_user_input ?? false,
        accepts_from_agents: a.input_contract?.accepts_from_agents ?? [],
      },
      output_config: {
        output_format: a.output_contract?.output_format ?? 'freeform',
        passes_to_agents: a.output_contract?.passes_to_agents ?? [],
        saves_to_knowledge_base: a.output_contract?.saves_to_knowledge_base ?? false,
      },
      rag_policy: a.rag_policy,
      response_rules: a.response_rules,
    }));
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="border-b p-4 bg-card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">AI Workflow Builder</h1>
            <p className="text-sm text-muted-foreground">
              Describe your idea → Get a fully executable multi-agent system
            </p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <Card className="p-6 bg-muted/50">
              <div className="text-center space-y-4">
                <Workflow className="h-12 w-12 mx-auto text-primary" />
                <h2 className="text-lg font-medium">Cognitive Execution Engine Builder</h2>
                <p className="text-muted-foreground text-sm">
                  Describe your multi-agent workflow. The system will generate a <strong>fully executable</strong> specification
                  with DAG logic, memory, rework policies, safety checks, and complete I/O contracts.
                </p>
                <div className="grid gap-2 text-sm text-left max-w-lg mx-auto">
                  <Button variant="outline" className="justify-start h-auto py-2 px-3" onClick={() => streamChat("I want a content creation pipeline: research → write → review → edit → publish")}>
                    "Content pipeline: research → write → review → edit → publish"
                  </Button>
                  <Button variant="outline" className="justify-start h-auto py-2 px-3" onClick={() => streamChat("Build a customer support system that classifies queries, drafts responses, reviews for quality, and escalates when uncertain")}>
                    "Customer support: classify → draft → review → escalate"
                  </Button>
                  <Button variant="outline" className="justify-start h-auto py-2 px-3" onClick={() => streamChat("Data analysis workflow: collect data, clean it, analyze patterns, generate reports, and validate findings")}>
                    "Data analysis: collect → clean → analyze → report → validate"
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {messages.map((message, index) => (
            <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <Card className={`p-4 max-w-[80%] ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
                <p className="whitespace-pre-wrap text-sm">
                  {getCleanContent(message.content) || (isLoading && index === messages.length - 1 ? '...' : '')}
                </p>
              </Card>
              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {/* Workflow Ready Card */}
          {generatedWorkflow && (
            <Card className="p-6 border-primary bg-primary/5">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Execution-Ready Workflow</h3>
                  </div>
                  <div className="flex gap-1">
                    <Badge variant="outline" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {generatedWorkflow.workflow.agents.length} Agents
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <GitBranch className="h-3 w-3 mr-1" />
                      {generatedWorkflow.workflow.edges.length} Edges
                    </Badge>
                  </div>
                </div>

                <Tabs defaultValue="preview" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="preview" className="gap-1 text-xs">
                      <Eye className="h-3 w-3" />
                      Preview
                    </TabsTrigger>
                    <TabsTrigger value="agents" className="gap-1 text-xs">
                      <Settings2 className="h-3 w-3" />
                      Agents
                    </TabsTrigger>
                    <TabsTrigger value="execution" className="gap-1 text-xs">
                      <Layers className="h-3 w-3" />
                      DAG
                    </TabsTrigger>
                    <TabsTrigger value="memory" className="gap-1 text-xs">
                      <Brain className="h-3 w-3" />
                      Memory
                    </TabsTrigger>
                    <TabsTrigger value="safety" className="gap-1 text-xs">
                      <Shield className="h-3 w-3" />
                      Safety
                    </TabsTrigger>
                  </TabsList>

                  {/* Visual Preview Tab */}
                  <TabsContent value="preview" className="mt-4">
                    <WorkflowPreviewDiagram
                      agents={getAgentsForPreview()}
                      connections={getConnectionsForPreview()}
                      workflowName={generatedWorkflow.workflow.name}
                      editable={true}
                      onReorder={(newAgents, newConnections) => {
                        setGeneratedWorkflow({
                          ...generatedWorkflow,
                          workflow: {
                            ...generatedWorkflow.workflow,
                            agents: generatedWorkflow.workflow.agents.map((a, i) => ({
                              ...a,
                              display_name: newAgents[i]?.display_name ?? a.display_name,
                            })),
                            edges: newConnections.map(c => ({
                              ...generatedWorkflow.workflow.edges.find(e => e.from === c.from && e.to === c.to) || {
                                from: c.from,
                                to: c.to,
                                condition: 'always',
                                data_mapping: { description: 'pass_full_output', fields_passed: [], transformation: 'none' },
                                priority: 1,
                                label: `${c.from} → ${c.to}`,
                              },
                            })),
                          },
                        });
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      💡 Drag agents to reorder the workflow sequence
                    </p>
                  </TabsContent>

                  {/* Agents Detail Tab */}
                  <TabsContent value="agents" className="mt-4">
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      <div className="grid gap-2 text-sm mb-3">
                        <p><strong>Name:</strong> {generatedWorkflow.workflow.name}</p>
                        <p className="text-muted-foreground">{generatedWorkflow.workflow.description}</p>
                      </div>

                      {generatedWorkflow.workflow.agents.map((agent, index) => (
                        <Card key={index} className="p-4 border-border">
                          <div className="space-y-3">
                            {/* Agent header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">{agent.display_name}</span>
                                <Badge variant="outline" className={`text-[10px] ${agentTypeColors[agent.agent_type] || ''}`}>
                                  {agent.agent_type}
                                </Badge>
                              </div>
                              <Badge variant="secondary" className="text-[10px]">
                                {agent.core_model.replace('core_', '')}
                              </Badge>
                            </div>

                            <p className="text-xs text-muted-foreground">{agent.role_description}</p>

                            {/* Task list */}
                            {agent.task_list && agent.task_list.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Tasks ({agent.task_list.length})
                                </p>
                                <div className="space-y-1 pl-4">
                                  {agent.task_list.map((task, ti) => (
                                    <div key={ti} className="text-[11px] text-muted-foreground">
                                      <span className="font-medium text-foreground">{task.step}.</span> {task.action}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* I/O contracts */}
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div className="p-2 rounded bg-muted/50">
                                <p className="font-medium mb-1">📥 Input</p>
                                <p>From: {agent.input_contract?.accepts_from_agents?.join(', ') || 'user'}</p>
                                <p>Format: {agent.input_contract?.input_schema?.type || 'any'}</p>
                              </div>
                              <div className="p-2 rounded bg-muted/50">
                                <p className="font-medium mb-1">📤 Output</p>
                                <p>To: {agent.output_contract?.passes_to_agents?.join(', ') || 'end'}</p>
                                <p>Format: {agent.output_contract?.output_format || 'freeform'}</p>
                              </div>
                            </div>

                            {/* KB & Memory */}
                            <div className="flex gap-2 text-[11px]">
                              <Badge variant="outline" className="text-[10px]">
                                <Database className="h-2.5 w-2.5 mr-1" />
                                KB: {agent.knowledge_base_usage?.mode || 'none'}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                <Brain className="h-2.5 w-2.5 mr-1" />
                                Mem: {agent.memory_usage?.writes_to_memory ? 'R/W' : agent.memory_usage?.reads_from_memory ? 'R' : 'none'}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                <RefreshCw className="h-2.5 w-2.5 mr-1" />
                                Retry: {agent.failure_behavior?.max_retries || 0}
                              </Badge>
                            </div>

                            {/* RAG Policy */}
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>KB: {Math.round((agent.rag_policy?.knowledge_base_ratio || 0) * 100)}%</span>
                              <span>•</span>
                              <span>Creativity: {agent.rag_policy?.creativity_level || 'low'}</span>
                              <span>•</span>
                              <span>Confidence ≥ {agent.failure_behavior?.confidence_threshold || 0.7}</span>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  {/* DAG / Execution Tab */}
                  <TabsContent value="execution" className="mt-4">
                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                      {generatedWorkflow.workflow.execution_rules && (
                        <>
                          <div className="p-3 rounded-lg bg-muted/50 space-y-2 text-sm">
                            <p className="font-medium flex items-center gap-1">
                              <Layers className="h-4 w-4" /> Execution Mode
                            </p>
                            <p className="text-muted-foreground">{generatedWorkflow.workflow.execution_rules.execution_mode}</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <strong>Error Handling:</strong> {generatedWorkflow.workflow.execution_rules.error_handling}
                              </div>
                              <div>
                                <strong>Timeout:</strong> {generatedWorkflow.workflow.execution_rules.timeout_seconds}s
                              </div>
                              <div>
                                <strong>Max Retries:</strong> {generatedWorkflow.workflow.execution_rules.max_total_retries}
                              </div>
                            </div>
                          </div>

                          {generatedWorkflow.workflow.execution_rules.dag_definition && (
                            <div className="p-3 rounded-lg bg-muted/50 space-y-2 text-sm">
                              <p className="font-medium">DAG Definition</p>
                              <div className="space-y-1 text-xs text-muted-foreground">
                                <p><strong>Entry:</strong> Agent {generatedWorkflow.workflow.execution_rules.dag_definition.entry_points?.join(', ')}</p>
                                <p><strong>Exit:</strong> Agent {generatedWorkflow.workflow.execution_rules.dag_definition.exit_points?.join(', ')}</p>
                                {generatedWorkflow.workflow.execution_rules.dag_definition.parallel_groups?.length > 0 && (
                                  <p><strong>Parallel Groups:</strong> {generatedWorkflow.workflow.execution_rules.dag_definition.parallel_groups.map(g => `[${g.join(',')}]`).join(' | ')}</p>
                                )}
                                <p><strong>Execution Order:</strong> {generatedWorkflow.workflow.execution_rules.dag_definition.execution_order?.map(g => `[${g.join(',')}]`).join(' → ')}</p>
                                <p><strong>Critical Path:</strong> {generatedWorkflow.workflow.execution_rules.dag_definition.critical_path?.join(' → ')}</p>
                              </div>
                            </div>
                          )}

                          {generatedWorkflow.workflow.execution_rules.orchestrator && (
                            <div className="p-3 rounded-lg bg-muted/50 space-y-2 text-sm">
                              <p className="font-medium">Orchestrator</p>
                              <div className="text-xs text-muted-foreground space-y-1">
                                {generatedWorkflow.workflow.execution_rules.orchestrator.agent_index !== null && (
                                  <p><strong>Agent:</strong> #{generatedWorkflow.workflow.execution_rules.orchestrator.agent_index}</p>
                                )}
                                <p><strong>Tracks:</strong> {[
                                  generatedWorkflow.workflow.execution_rules.orchestrator.state_tracking?.tracks_per_task_id && 'task_id',
                                  generatedWorkflow.workflow.execution_rules.orchestrator.state_tracking?.tracks_agent_status && 'agent_status',
                                  generatedWorkflow.workflow.execution_rules.orchestrator.state_tracking?.tracks_data_flow && 'data_flow',
                                ].filter(Boolean).join(', ')}</p>
                                <p><strong>Auto-rework threshold:</strong> {generatedWorkflow.workflow.execution_rules.orchestrator.rework_triggering?.auto_rework_threshold}</p>
                              </div>
                              {generatedWorkflow.workflow.execution_rules.orchestrator.task_routing_rules?.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  <p className="text-xs font-medium">Routing Rules:</p>
                                  {generatedWorkflow.workflow.execution_rules.orchestrator.task_routing_rules.map((rule, ri) => (
                                    <div key={ri} className="text-[11px] text-muted-foreground pl-2 border-l-2 border-primary/30">
                                      {rule.condition} → {rule.route_to}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Edges detail */}
                          <div className="p-3 rounded-lg bg-muted/50 space-y-2 text-sm">
                            <p className="font-medium">Data Flow Edges ({generatedWorkflow.workflow.edges.length})</p>
                            <div className="space-y-2">
                              {generatedWorkflow.workflow.edges.map((edge, ei) => (
                                <div key={ei} className="text-xs p-2 rounded bg-background border">
                                  <div className="flex items-center gap-1 font-medium">
                                    Agent {edge.from} → Agent {edge.to}
                                    <Badge variant="outline" className="text-[9px] ml-auto">{edge.condition}</Badge>
                                  </div>
                                  <p className="text-muted-foreground mt-1">{edge.label}</p>
                                  {edge.data_mapping && (
                                    <p className="text-muted-foreground">
                                      Fields: {edge.data_mapping.fields_passed?.join(', ') || 'all'} | Transform: {edge.data_mapping.transformation}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </TabsContent>

                  {/* Memory Tab */}
                  <TabsContent value="memory" className="mt-4">
                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                      {generatedWorkflow.workflow.memory_spec && (
                        <div className="p-3 rounded-lg bg-muted/50 space-y-2 text-sm">
                          <p className="font-medium flex items-center gap-1">
                            <Brain className="h-4 w-4" /> Blackboard Memory System
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div><strong>Type:</strong> {generatedWorkflow.workflow.memory_spec.type}</div>
                            <div><strong>Versioned:</strong> {generatedWorkflow.workflow.memory_spec.storage?.versioned_per_task_id ? 'Yes' : 'No'}</div>
                            <div><strong>Max Versions:</strong> {generatedWorkflow.workflow.memory_spec.storage?.max_versions_per_key}</div>
                            <div><strong>Read Access:</strong> {generatedWorkflow.workflow.memory_spec.access_rules?.read_access}</div>
                            <div><strong>Write Access:</strong> {generatedWorkflow.workflow.memory_spec.access_rules?.write_access}</div>
                            <div><strong>Conflict:</strong> {generatedWorkflow.workflow.memory_spec.access_rules?.conflict_resolution}</div>
                          </div>
                          <div className="mt-2">
                            <p className="text-xs font-medium">Retrieval Modes:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {generatedWorkflow.workflow.memory_spec.retrieval_modes?.map((mode, mi) => (
                                <Badge key={mi} variant="outline" className="text-[10px]">{mode}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Rework Policy */}
                      {generatedWorkflow.workflow.rework_policy && (
                        <div className="p-3 rounded-lg bg-muted/50 space-y-2 text-sm">
                          <p className="font-medium flex items-center gap-1">
                            <RefreshCw className="h-4 w-4" /> Rework Engine
                          </p>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p><strong>Enabled:</strong> {generatedWorkflow.workflow.rework_policy.enabled ? 'Yes' : 'No'}</p>
                            <p><strong>Max Cycles:</strong> {generatedWorkflow.workflow.rework_policy.max_rework_cycles}</p>
                            <p><strong>Escalation:</strong> {generatedWorkflow.workflow.rework_policy.escalation_path?.after_max_retries}</p>
                          </div>
                          {generatedWorkflow.workflow.rework_policy.trigger_conditions?.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs font-medium">Triggers:</p>
                              {generatedWorkflow.workflow.rework_policy.trigger_conditions.map((tc, ti) => (
                                <div key={ti} className="text-[11px] text-muted-foreground pl-2 border-l-2 border-amber-500/30">
                                  {tc.type} {tc.threshold ? `< ${tc.threshold}` : ''} → {Array.isArray(tc.applies_to) ? tc.applies_to.join(', ') : tc.applies_to}
                                </div>
                              ))}
                            </div>
                          )}
                          {generatedWorkflow.workflow.rework_policy.rework_routing?.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs font-medium">Routing:</p>
                              {generatedWorkflow.workflow.rework_policy.rework_routing.map((rr, ri) => (
                                <div key={ri} className="text-[11px] text-muted-foreground pl-2 border-l-2 border-primary/30">
                                  {rr.failed_agent} → {rr.rework_agent} {rr.include_feedback ? '(with feedback)' : ''}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Safety Tab */}
                  <TabsContent value="safety" className="mt-4">
                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                      {generatedWorkflow.workflow.safety_policy && (
                        <div className="p-3 rounded-lg bg-muted/50 space-y-2 text-sm">
                          <p className="font-medium flex items-center gap-1">
                            <Shield className="h-4 w-4" /> Safety & Evaluation Policy
                          </p>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p><strong>Evaluation:</strong> {generatedWorkflow.workflow.safety_policy.evaluation_enabled ? 'Enabled' : 'Disabled'}</p>
                            {generatedWorkflow.workflow.safety_policy.evaluation_agent_index !== null && (
                              <p><strong>Evaluator Agent:</strong> #{generatedWorkflow.workflow.safety_policy.evaluation_agent_index}</p>
                            )}
                            <p><strong>Min Safety Score:</strong> {generatedWorkflow.workflow.safety_policy.minimum_safety_score}</p>
                            <p><strong>On Failure:</strong> {generatedWorkflow.workflow.safety_policy.on_safety_failure}</p>
                          </div>
                          <div className="mt-2">
                            <p className="text-xs font-medium">Evaluation Criteria:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {generatedWorkflow.workflow.safety_policy.evaluation_criteria?.map((c, ci) => (
                                <Badge key={ci} variant="outline" className="text-[10px]">{c}</Badge>
                              ))}
                            </div>
                          </div>
                          <div className="mt-2">
                            <p className="text-xs font-medium">Content Filters:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {generatedWorkflow.workflow.safety_policy.content_filters?.pii_detection && <Badge variant="outline" className="text-[10px]">PII Detection</Badge>}
                              {generatedWorkflow.workflow.safety_policy.content_filters?.toxicity_check && <Badge variant="outline" className="text-[10px]">Toxicity Check</Badge>}
                              {generatedWorkflow.workflow.safety_policy.content_filters?.hallucination_check && <Badge variant="outline" className="text-[10px]">Hallucination Check</Badge>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                <Button onClick={deployWorkflow} disabled={isDeploying} className="w-full" size="lg">
                  {isDeploying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deploying Execution Engine...
                    </>
                  ) : (
                    <>
                      Deploy Execution-Ready System
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-4 bg-card">
        <div className="max-w-4xl mx-auto flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your multi-agent workflow idea..."
            className="min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <Button onClick={() => streamChat(input)} disabled={isLoading || !input.trim()} size="icon" className="h-[60px] w-[60px]">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WorkflowBuilder;
