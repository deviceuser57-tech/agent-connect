import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const getAIConfig = () => {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const groqKey = Deno.env.get("GROQ_API_KEY");

  if (lovableKey) return {
    apiUrl: "https://ai.gateway.lovable.dev/v1/chat/completions",
    apiKey: lovableKey,
    model: "google/gemini-2.5-flash",
    provider: "lovable"
  };
  if (openaiKey) return {
    apiUrl: "https://api.openai.com/v1/chat/completions",
    apiKey: openaiKey,
    model: "gpt-4o-mini",
    provider: "openai"
  };
  if (groqKey) return {
    apiUrl: "https://api.groq.com/openai/v1/chat/completions",
    apiKey: groqKey,
    model: "llama-3.1-70b-versatile",
    provider: "groq"
  };
  return { apiUrl: null, apiKey: null, model: null, provider: null };
};

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════

interface ExecutionSpec {
  agents: AgentSpec[];
  edges: EdgeSpec[];
  execution_rules: ExecutionRules;
  memory_spec: MemorySpec;
  rework_policy: ReworkPolicy;
  safety_policy: SafetyPolicy;
}

interface AgentSpec {
  nodeId: string;
  agentId: string;
  agent_type: string;
  model: string;
  label: string;
  task_list: { step: number; action: string; input_required: string; output_produced: string; success_criteria: string }[];
  input_contract: { accepts_user_input: boolean; accepts_from_agents: string[]; input_prompt_template: string; required_context: string[] };
  output_contract: { output_format: string; passes_to_agents: string[]; saves_to_memory: boolean; saves_to_knowledge_base: boolean };
  knowledge_base_usage: { mode: string; read_ratio: number; read_queries: string[]; write_fields: string[] };
  memory_usage: { reads_from_memory: boolean; writes_to_memory: boolean; memory_keys_read: string[]; memory_keys_write: string[] };
  dependency_requirements: { must_complete_before: string[]; can_run_parallel_with: string[]; requires_data_from: string[] };
  failure_behavior: { on_error: string; on_low_confidence: string; confidence_threshold: number; max_retries: number; retry_backoff_seconds: number; escalation_target: string };
  awareness_settings: { awareness_level: number; self_role_enabled: boolean; role_boundaries: string };
  memory_settings: { short_term_enabled: boolean; context_window_size: number; long_term_enabled: boolean; retention_policy: string };
}

interface EdgeSpec {
  from: number;
  to: number;
  condition: string;
  condition_value?: string | null;
  data_mapping: { description: string; fields_passed: string[]; transformation: string };
  label: string;
}

interface ExecutionRules {
  execution_mode: string;
  dag_definition: {
    entry_points: number[];
    exit_points: number[];
    parallel_groups: number[][];
    execution_order: number[][];
    critical_path: number[];
  };
  orchestrator: {
    agent_index: number | null;
    rework_triggering: { auto_rework_threshold: number };
    state_tracking: { tracks_per_task_id: boolean };
  };
  error_handling: string;
  timeout_seconds: number;
  max_total_retries: number;
}

interface MemorySpec {
  type: string;
  storage: { stores_all_agent_outputs: boolean; versioned_per_task_id: boolean; max_versions_per_key: number };
  access_rules: { read_access: string; write_access: string; conflict_resolution: string };
  retrieval_modes: string[];
}

interface ReworkPolicy {
  enabled: boolean;
  trigger_conditions: { type: string; threshold?: number; applies_to: string | string[] }[];
  max_rework_cycles: number;
  rework_routing: { failed_agent: string; rework_agent: string; include_feedback: boolean }[];
  escalation_path: { after_max_retries: string; notification_on_escalation: boolean };
}

interface SafetyPolicy {
  evaluation_enabled: boolean;
  evaluation_agent_index: number | null;
  evaluation_criteria: string[];
  minimum_safety_score: number;
  on_safety_failure: string;
  content_filters: { pii_detection: boolean; toxicity_check: boolean; hallucination_check: boolean };
}

// ═══════════════════════════════════════
// Blackboard Memory System
// ═══════════════════════════════════════

class BlackboardMemory {
  private store: Map<string, { value: unknown; versions: unknown[]; agent: string; timestamp: string; confidence?: number }[]> = new Map();

  write(key: string, value: unknown, agent: string, maxVersions: number, confidence?: number) {
    const entries = this.store.get(key) || [];
    entries.push({ value, versions: [], agent, timestamp: new Date().toISOString(), confidence });
    if (entries.length > maxVersions) entries.shift();
    this.store.set(key, entries);
  }

  readLatest(key: string): unknown | null {
    const entries = this.store.get(key);
    if (!entries || entries.length === 0) return null;
    return entries[entries.length - 1].value;
  }

  readByAgent(agent: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, entries] of this.store) {
      const agentEntries = entries.filter(e => e.agent === agent);
      if (agentEntries.length > 0) {
        result[key] = agentEntries[agentEntries.length - 1].value;
      }
    }
    return result;
  }

  readAboveConfidence(threshold: number): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, entries] of this.store) {
      const filtered = entries.filter(e => (e.confidence || 0) >= threshold);
      if (filtered.length > 0) {
        result[key] = filtered[filtered.length - 1].value;
      }
    }
    return result;
  }

  getFullState(): Record<string, unknown> {
    const state: Record<string, unknown> = {};
    for (const [key, entries] of this.store) {
      state[key] = entries.map(e => ({ value: e.value, agent: e.agent, timestamp: e.timestamp, confidence: e.confidence }));
    }
    return state;
  }

  getAllLatest(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, entries] of this.store) {
      if (entries.length > 0) result[key] = entries[entries.length - 1].value;
    }
    return result;
  }
}

// ═══════════════════════════════════════
// Agent Executor
// ═══════════════════════════════════════

interface AgentResult {
  success: boolean;
  output: string;
  confidence: number;
  error?: string;
}

async function executeAgent(
  agentSpec: AgentSpec,
  agentProfile: Record<string, unknown> | null,
  memory: BlackboardMemory,
  inputData: Record<string, unknown>,
  previousOutputs: Record<number, AgentResult>,
  agentIndex: number,
  supabaseUrl: string,
): Promise<AgentResult> {
  const { apiUrl, apiKey, model: aiModel } = getAIConfig();
  if (!apiKey) return { success: false, output: '', confidence: 0, error: 'No AI provider configured' };

  // Build context from memory
  let memoryContext = '';
  if (agentSpec.memory_usage?.reads_from_memory) {
    const keys = agentSpec.memory_usage.memory_keys_read || [];
    const memData: Record<string, unknown> = {};
    for (const key of keys) {
      const val = memory.readLatest(key);
      if (val !== null) memData[key] = val;
    }
    if (Object.keys(memData).length > 0) {
      memoryContext = `\n\n### BLACKBOARD MEMORY STATE:\n${JSON.stringify(memData, null, 2)}`;
    }
  }

  // Build context from previous agent outputs (dependency chain)
  let dependencyContext = '';
  const deps = agentSpec.dependency_requirements?.requires_data_from || [];
  for (const dep of deps) {
    const depIdx = parseInt(dep.replace('agent_index_', ''));
    if (!isNaN(depIdx) && previousOutputs[depIdx]) {
      dependencyContext += `\n\n### OUTPUT FROM AGENT ${depIdx}:\n${previousOutputs[depIdx].output}`;
    }
  }

  // Knowledge base retrieval
  let kbContext = '';
  if (agentSpec.knowledge_base_usage?.mode !== 'none' && (agentSpec.knowledge_base_usage?.mode === 'read' || agentSpec.knowledge_base_usage?.mode === 'read_write')) {
    try {
      const ragQuery = agentSpec.knowledge_base_usage.read_queries?.join('. ') || inputData?.prompt || 'Retrieve relevant context';
      const ragResponse = await fetch(`${supabaseUrl}/functions/v1/rag-retrieve`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: String(ragQuery).substring(0, 5000), config: { top_k: 5 } }),
      });
      if (ragResponse.ok) {
        const ragData = await ragResponse.json();
        const chunks = ragData.chunks || [];
        if (chunks.length > 0) {
          kbContext = '\n\n### KNOWLEDGE BASE CONTEXT:\n' +
            chunks.map((c: { source_file: string; content: string }, i: number) =>
              `[Source ${i + 1}: ${c.source_file}]\n${c.content}`
            ).join('\n\n');
        }
      }
    } catch (e) {
      console.error('RAG retrieval failed for agent', agentSpec.label, e);
    }
  }

  // Build system prompt
  const persona = (agentProfile as Record<string, string>)?.persona || agentSpec.label;
  const roleDesc = (agentProfile as Record<string, string>)?.role_description || '';
  const taskListStr = (agentSpec.task_list || [])
    .map(t => `Step ${t.step}: ${t.action} (needs: ${t.input_required}, produces: ${t.output_produced}, success: ${t.success_criteria})`)
    .join('\n');

  const awarenessStr = agentSpec.awareness_settings?.self_role_enabled
    ? `\nYou are aware of your role boundaries: ${agentSpec.awareness_settings.role_boundaries || 'none specified'}.`
    : '';

  const outputFormatStr = agentSpec.output_contract?.output_format
    ? `\nYou MUST format your output as: ${agentSpec.output_contract.output_format}.`
    : '';

  const systemPrompt = `${persona}\n\nRole: ${roleDesc}${awarenessStr}${outputFormatStr}

YOUR TASK LIST (execute each step):
${taskListStr || 'Execute your role.'}

RESPONSE RULES:
- Include a confidence score (0.0-1.0) on the LAST line formatted as: CONFIDENCE: 0.XX
- Be thorough and follow your task list precisely.
${kbContext}${memoryContext}${dependencyContext}`;

  // Build user prompt
  const userPrompt = inputData?.prompt
    ? String(inputData.prompt).substring(0, 10000)
    : `Execute your assigned tasks. Previous workflow context is provided above.`;

  try {
    const response = await fetch(apiUrl!, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, output: '', confidence: 0, error: `AI error ${response.status}: ${errText.substring(0, 200)}` };
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';

    // Extract confidence from output
    const confidenceMatch = content.match(/CONFIDENCE:\s*([\d.]+)/i);
    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.75;

    return { success: true, output: content, confidence: Math.min(1, Math.max(0, confidence)) };
  } catch (e) {
    return { success: false, output: '', confidence: 0, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ═══════════════════════════════════════
// Safety Evaluator
// ═══════════════════════════════════════

async function evaluateSafety(
  output: string,
  policy: SafetyPolicy,
  agentLabel: string,
): Promise<{ passed: boolean; score: number; issues: string[] }> {
  if (!policy.evaluation_enabled) return { passed: true, score: 1.0, issues: [] };

  const { apiUrl, apiKey, model: aiModel } = getAIConfig();
  if (!apiKey) return { passed: true, score: 0.8, issues: ['No AI provider for safety check'] };

  const criteriaStr = (policy.evaluation_criteria || []).join(', ');
  const filtersStr = [
    policy.content_filters?.pii_detection && 'PII detection',
    policy.content_filters?.toxicity_check && 'toxicity check',
    policy.content_filters?.hallucination_check && 'hallucination check',
  ].filter(Boolean).join(', ');

  try {
    const response = await fetch(apiUrl!, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          {
            role: "system",
            content: `You are a safety evaluator. Evaluate the following output from agent "${agentLabel}" against these criteria: ${criteriaStr}. Also check: ${filtersStr}.
Return ONLY a JSON object: {"score": 0.0-1.0, "issues": ["issue1", "issue2"], "passed": true/false}
Score threshold for passing: ${policy.minimum_safety_score}`
          },
          { role: "user", content: `Evaluate this output:\n\n${output.substring(0, 5000)}` },
        ],
      }),
    });

    if (!response.ok) return { passed: true, score: 0.8, issues: ['Safety evaluation API error'] };

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: typeof parsed.score === 'number' ? parsed.score : 0.8,
        passed: parsed.score >= policy.minimum_safety_score,
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      };
    }
    return { passed: true, score: 0.8, issues: [] };
  } catch {
    return { passed: true, score: 0.8, issues: ['Safety eval parse error'] };
  }
}

// ═══════════════════════════════════════
// DAG Execution Engine
// ═══════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { workflowId, workspaceId, triggerType = "manual", inputData } = await req.json();

    if (!workflowId) {
      return new Response(JSON.stringify({ error: "workflowId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(workflowId)) {
      return new Response(JSON.stringify({ error: "Invalid workflowId format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load workflow
    const { data: workflow, error: workflowError } = await supabase
      .from("multi_agent_configs")
      .select("*")
      .eq("id", workflowId)
      .single();

    if (workflowError || !workflow) {
      return new Response(JSON.stringify({ error: "Workflow not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Extract execution spec from canvas_data
    const canvasData = workflow.canvas_data as Record<string, unknown> || {};
    const executionSpec = (canvasData.execution_spec || {}) as Partial<ExecutionSpec>;
    const agentSpecs = executionSpec.agents || (workflow.agent_nodes as AgentSpec[]) || [];
    const edgeSpecs = executionSpec.edges || (workflow.connections as EdgeSpec[]) || [];
    const executionRules = executionSpec.execution_rules || { execution_mode: 'sequential', dag_definition: { entry_points: [0], exit_points: [agentSpecs.length - 1], parallel_groups: [], execution_order: agentSpecs.map((_, i) => [i]), critical_path: agentSpecs.map((_, i) => i) }, orchestrator: { agent_index: null, rework_triggering: { auto_rework_threshold: 0.6 }, state_tracking: { tracks_per_task_id: true } }, error_handling: 'retry_then_escalate', timeout_seconds: 300, max_total_retries: 10 } as ExecutionRules;
    const memorySpec = executionSpec.memory_spec || { type: 'blackboard', storage: { stores_all_agent_outputs: true, versioned_per_task_id: true, max_versions_per_key: 5 }, access_rules: { read_access: 'all_agents', write_access: 'own_keys_only', conflict_resolution: 'last_write_wins' }, retrieval_modes: ['latest_version', 'specific_agent_output'] } as MemorySpec;
    const reworkPolicy = executionSpec.rework_policy || { enabled: true, trigger_conditions: [{ type: 'confidence_below', threshold: 0.6, applies_to: 'all' }], max_rework_cycles: 3, rework_routing: [], escalation_path: { after_max_retries: 'abort', notification_on_escalation: true } } as ReworkPolicy;
    const safetyPolicy = executionSpec.safety_policy || { evaluation_enabled: false, evaluation_agent_index: null, evaluation_criteria: [], minimum_safety_score: 0.7, on_safety_failure: 'flag_for_review', content_filters: { pii_detection: false, toxicity_check: false, hallucination_check: false } } as SafetyPolicy;

    if (agentSpecs.length === 0) {
      return new Response(JSON.stringify({ error: "No agents in workflow" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (agentSpecs.length > 50) {
      return new Response(JSON.stringify({ error: "Maximum 50 agents per workflow" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create workflow run
    const { data: run, error: runError } = await supabase
      .from("workflow_runs")
      .insert({
        workflow_id: workflowId,
        workspace_id: workspaceId || workflow.workspace_id,
        trigger_type: triggerType,
        status: "running",
        started_at: new Date().toISOString(),
        input_data: inputData || {},
        execution_logs: [],
        created_by: user.id,
      })
      .select()
      .single();

    if (runError) throw runError;

    console.log(`[Engine] Run ${run.id} started for workflow ${workflowId} with ${agentSpecs.length} agents`);

    // Initialize systems
    const memory = new BlackboardMemory();
    const logs: { timestamp: string; type: string; message: string; agent?: string; phase?: string; data?: unknown }[] = [];
    const agentOutputs: Record<number, AgentResult> = {};
    const agentStatuses: Record<number, string> = {};
    let totalRetries = 0;

    const log = (type: string, message: string, agent?: string, phase?: string, data?: unknown) => {
      logs.push({ timestamp: new Date().toISOString(), type, message, agent, phase, data });
      if (logs.length > 2000) logs.splice(0, logs.length - 2000);
    };

    log('info', 'Workflow execution started', undefined, 'init', {
      execution_mode: executionRules.execution_mode,
      agent_count: agentSpecs.length,
      edge_count: edgeSpecs.length,
      memory_type: memorySpec.type,
      rework_enabled: reworkPolicy.enabled,
      safety_enabled: safetyPolicy.evaluation_enabled,
    });

    // Write initial input to memory
    if (inputData) {
      memory.write('workflow_input', inputData, 'system', memorySpec.storage?.max_versions_per_key || 5);
    }

    // Preload agent profiles
    const agentProfiles: Record<string, Record<string, unknown>> = {};
    for (const spec of agentSpecs) {
      if (spec.agentId) {
        const { data: profile } = await supabase.from("ai_profiles").select("*").eq("id", spec.agentId).single();
        if (profile) agentProfiles[spec.agentId] = profile as Record<string, unknown>;
      }
    }

    // Determine execution order
    const executionOrder: number[][] = executionRules.dag_definition?.execution_order
      || agentSpecs.map((_, i) => [i]);

    try {
      const startTime = Date.now();
      const timeoutMs = (executionRules.timeout_seconds || 300) * 1000;

      // Execute in DAG order (groups can run in parallel)
      for (const group of executionOrder) {
        // Check timeout
        if (Date.now() - startTime > timeoutMs) {
          log('error', `Workflow timed out after ${executionRules.timeout_seconds}s`, undefined, 'timeout');
          break;
        }

        log('info', `Executing group: [${group.join(', ')}]`, undefined, 'dag');

        // Check dependencies for each agent in group
        const groupAgents = group.filter(idx => {
          const spec = agentSpecs[idx];
          if (!spec) return false;
          const deps = spec.dependency_requirements?.must_complete_before || [];
          for (const dep of deps) {
            const depIdx = parseInt(dep.replace('agent_index_', ''));
            if (!isNaN(depIdx) && agentStatuses[depIdx] !== 'completed') {
              log('warning', `Skipping agent ${idx} - dependency ${depIdx} not completed`, spec.label, 'dependency');
              agentStatuses[idx] = 'skipped_dependency';
              return false;
            }
          }
          return true;
        });

        // Check edge conditions
        const validAgents = groupAgents.filter(idx => {
          const incomingEdges = edgeSpecs.filter(e => e.to === idx);
          if (incomingEdges.length === 0) return true; // entry point
          return incomingEdges.some(edge => {
            const sourceResult = agentOutputs[edge.from];
            if (!sourceResult) return edge.condition === 'always';
            switch (edge.condition) {
              case 'always': return true;
              case 'on_success': return sourceResult.success;
              case 'on_failure': return !sourceResult.success;
              case 'on_confidence_above':
                return sourceResult.confidence >= parseFloat(edge.condition_value || '0.7');
              case 'on_confidence_below':
                return sourceResult.confidence < parseFloat(edge.condition_value || '0.7');
              default: return true;
            }
          });
        });

        // Execute agents (parallel within group if DAG mode)
        const executeOne = async (agentIdx: number) => {
          const spec = agentSpecs[agentIdx];
          if (!spec) return;

          const agentLabel = spec.label || `Agent ${agentIdx}`;
          const profile = spec.agentId ? agentProfiles[spec.agentId] : null;

          // Check lifecycle
          if (profile && profile.is_active === false) {
            log('skipped', 'Agent disabled', agentLabel, 'lifecycle');
            agentStatuses[agentIdx] = 'skipped';
            return;
          }

          log('start', `Executing agent`, agentLabel, 'execute', { agent_type: spec.agent_type, tasks: spec.task_list?.length || 0 });
          agentStatuses[agentIdx] = 'running';

          let result = await executeAgent(spec, profile, memory, inputData || {}, agentOutputs, agentIdx, supabaseUrl);
          let retryCount = 0;
          const maxRetries = spec.failure_behavior?.max_retries || 3;
          const backoff = spec.failure_behavior?.retry_backoff_seconds || 2;

          // Rework loop
          while (reworkPolicy.enabled && totalRetries < (executionRules.max_total_retries || 10)) {
            const needsRework = !result.success
              || (result.confidence < (spec.failure_behavior?.confidence_threshold || 0.6));

            if (!needsRework || retryCount >= maxRetries) break;

            retryCount++;
            totalRetries++;
            log('rework', `Rework attempt ${retryCount}/${maxRetries} (confidence: ${result.confidence.toFixed(2)})`, agentLabel, 'rework');

            // Backoff
            await new Promise(r => setTimeout(r, backoff * 1000 * retryCount));

            // Re-execute with feedback
            const feedbackInput = {
              ...inputData,
              prompt: `REWORK REQUEST: Your previous output had confidence ${result.confidence.toFixed(2)} (threshold: ${spec.failure_behavior?.confidence_threshold || 0.6}). ${!result.success ? 'Error: ' + result.error : 'Please improve quality and confidence.'}\n\nPrevious output:\n${result.output.substring(0, 3000)}\n\nPlease try again with higher quality.`,
            };
            result = await executeAgent(spec, profile, memory, feedbackInput, agentOutputs, agentIdx, supabaseUrl);
          }

          if (!result.success) {
            log('error', `Agent failed: ${result.error}`, agentLabel, 'execute');
            agentStatuses[agentIdx] = 'failed';

            // Escalation
            if (retryCount >= maxRetries && reworkPolicy.escalation_path) {
              log('escalation', `Max retries reached. Action: ${reworkPolicy.escalation_path.after_max_retries}`, agentLabel, 'escalation');
              if (reworkPolicy.escalation_path.after_max_retries === 'abort') {
                throw new Error(`Agent ${agentLabel} failed after ${retryCount} retries`);
              }
            }

            // Error handling
            if (executionRules.error_handling === 'stop_on_error') {
              throw new Error(`Agent ${agentLabel} failed: ${result.error}`);
            }
            return;
          }

          // Safety evaluation
          if (safetyPolicy.evaluation_enabled) {
            const safety = await evaluateSafety(result.output, safetyPolicy, agentLabel);
            log('safety', `Safety score: ${safety.score.toFixed(2)}, passed: ${safety.passed}`, agentLabel, 'safety', { issues: safety.issues });

            if (!safety.passed) {
              if (safetyPolicy.on_safety_failure === 'block_output') {
                log('safety', 'Output blocked by safety policy', agentLabel, 'safety');
                agentStatuses[agentIdx] = 'blocked';
                return;
              } else if (safetyPolicy.on_safety_failure === 'rework' && retryCount < maxRetries) {
                log('safety', 'Safety failure triggered rework', agentLabel, 'safety');
                // One more attempt with safety feedback
                const safetyInput = {
                  ...inputData,
                  prompt: `SAFETY REWORK: Your output failed safety evaluation. Issues: ${safety.issues.join(', ')}. Please regenerate with these issues addressed.\n\nPrevious output:\n${result.output.substring(0, 3000)}`,
                };
                result = await executeAgent(spec, profile, memory, safetyInput, agentOutputs, agentIdx, supabaseUrl);
              }
            }
          }

          // Store result
          agentOutputs[agentIdx] = result;
          agentStatuses[agentIdx] = 'completed';

          // Write to memory
          if (spec.output_contract?.saves_to_memory || spec.memory_usage?.writes_to_memory) {
            const memKeys = spec.memory_usage?.memory_keys_write || [`agent_${agentIdx}_output`];
            for (const key of memKeys) {
              memory.write(key, result.output, agentLabel, memorySpec.storage?.max_versions_per_key || 5, result.confidence);
            }
            log('memory', `Wrote to memory keys: ${memKeys.join(', ')}`, agentLabel, 'memory');
          }

          log('complete', `Agent completed (confidence: ${result.confidence.toFixed(2)}, retries: ${retryCount})`, agentLabel, 'execute', {
            confidence: result.confidence,
            retries: retryCount,
            output_preview: result.output.substring(0, 200),
          });
        };

        // Run group (parallel or sequential based on mode)
        if (executionRules.execution_mode === 'dag' || executionRules.execution_mode === 'parallel_where_possible') {
          await Promise.all(validAgents.map(executeOne));
        } else {
          for (const idx of validAgents) {
            await executeOne(idx);
          }
        }
      }

      // Build final output
      const finalOutput: Record<string, unknown> = {};
      for (const [idx, result] of Object.entries(agentOutputs)) {
        const spec = agentSpecs[parseInt(idx)];
        finalOutput[spec?.label || `agent_${idx}`] = {
          output: result.output,
          confidence: result.confidence,
          success: result.success,
        };
      }

      // Update run as completed
      await supabase
        .from("workflow_runs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          execution_logs: logs,
          output_data: {
            agent_outputs: finalOutput,
            memory_state: memory.getFullState(),
            agent_statuses: agentStatuses,
            total_retries: totalRetries,
            execution_time_ms: Date.now() - Date.parse(run.started_at),
          },
        })
        .eq("id", run.id);

      log('info', `Workflow completed successfully. ${Object.keys(agentOutputs).length}/${agentSpecs.length} agents executed.`, undefined, 'complete');

      return new Response(JSON.stringify({
        success: true,
        runId: run.id,
        status: "completed",
        executionLogs: logs,
        outputData: finalOutput,
        memoryState: memory.getAllLatest(),
        agentStatuses,
        totalRetries,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (execError) {
      log('error', execError instanceof Error ? execError.message : 'Execution failed', undefined, 'fatal');

      await supabase
        .from("workflow_runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: execError instanceof Error ? execError.message : "Execution failed",
          execution_logs: logs,
          output_data: {
            agent_outputs: agentOutputs,
            memory_state: memory.getFullState(),
            agent_statuses: agentStatuses,
          },
        })
        .eq("id", run.id);

      throw execError;
    }
  } catch (error) {
    console.error("Workflow engine error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Execution failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
