// Auto-completes a partial workflow spec into a fully execution-ready system.
// Fills missing edges (sequential), DAG, memory_spec, rework_policy, safety_policy
// using best-practice multi-agent defaults.

type AnyAgent = Record<string, unknown> & { display_name?: string };

interface PartialWorkflow {
  name?: string;
  description?: string;
  agents?: AnyAgent[];
  edges?: Array<Record<string, unknown>>;
  execution_rules?: Record<string, unknown>;
  memory_spec?: Record<string, unknown>;
  rework_policy?: Record<string, unknown>;
  safety_policy?: Record<string, unknown>;
}

export function autoCompleteWorkflow<T extends PartialWorkflow>(wf: T): T {
  const agents = Array.isArray(wf.agents) ? wf.agents : [];
  const n = agents.length;

  // 1) Edges — if missing/empty, build a sequential chain 0→1→2→...
  let edges = Array.isArray(wf.edges) ? wf.edges : [];
  if (edges.length === 0 && n > 1) {
    edges = [];
    for (let i = 0; i < n - 1; i++) {
      edges.push({
        from: i,
        to: i + 1,
        condition: 'on_success',
        condition_value: null,
        data_mapping: {
          description: `Output of ${agents[i]?.display_name ?? `Agent ${i}`} flows to ${agents[i + 1]?.display_name ?? `Agent ${i + 1}`}`,
          fields_passed: ['output', 'context'],
          transformation: 'none',
        },
        priority: 1,
        label: `${agents[i]?.display_name ?? `Agent ${i}`} → ${agents[i + 1]?.display_name ?? `Agent ${i + 1}`}`,
      });
    }
  }

  // 2) Per-agent dependency_requirements + I/O contracts (light auto-fill)
  const enrichedAgents = agents.map((a, i) => {
    const next: AnyAgent = { ...a };
    if (!next.dependency_requirements || typeof next.dependency_requirements !== 'object') {
      next.dependency_requirements = {
        must_complete_before: i < n - 1 ? [`agent_index_${i + 1}`] : [],
        can_run_parallel_with: [],
        requires_data_from: i > 0 ? [`agent_index_${i - 1}`] : [],
      };
    }
    if (!next.input_contract || typeof next.input_contract !== 'object') {
      next.input_contract = {
        accepts_user_input: i === 0,
        accepts_from_agents: i > 0 ? [`agent_index_${i - 1}`] : [],
        input_prompt_template: i === 0 ? '{user_input}' : `{output_from_agent_${i - 1}}`,
        required_context: [],
        input_schema: { type: 'object', required_fields: [], field_descriptions: {} },
      };
    }
    if (!next.output_contract || typeof next.output_contract !== 'object') {
      next.output_contract = {
        output_format: i === n - 1 ? 'markdown' : 'structured',
        output_schema: { type: 'object', fields: ['result'], field_descriptions: { result: 'Agent output' } },
        passes_to_agents: i < n - 1 ? [`agent_index_${i + 1}`] : [],
        saves_to_memory: true,
        saves_to_knowledge_base: false,
      };
    }
    if (!next.failure_behavior || typeof next.failure_behavior !== 'object') {
      next.failure_behavior = {
        on_error: 'retry',
        on_low_confidence: 'rework',
        confidence_threshold: 0.7,
        max_retries: 3,
        retry_backoff_seconds: 5,
        escalation_target: 'orchestrator',
      };
    }
    if (!next.memory_usage || typeof next.memory_usage !== 'object') {
      next.memory_usage = {
        reads_from_memory: i > 0,
        writes_to_memory: true,
        memory_keys_read: i > 0 ? [`agent_${i - 1}_output`] : [],
        memory_keys_write: [`agent_${i}_output`],
        version_tracking: true,
      };
    }
    return next;
  });

  // 3) Execution rules / DAG
  const execution_rules = wf.execution_rules && Object.keys(wf.execution_rules).length > 0
    ? wf.execution_rules
    : {
        execution_mode: 'dag',
        dag_definition: {
          entry_points: n > 0 ? [0] : [],
          exit_points: n > 0 ? [n - 1] : [],
          parallel_groups: [],
          execution_order: agents.map((_, i) => [i]),
          critical_path: agents.map((_, i) => i),
        },
        orchestrator: {
          agent_index: null,
          task_routing_rules: [],
          state_tracking: { tracks_per_task_id: true, tracks_agent_status: true, tracks_data_flow: true },
          rework_triggering: { monitors_confidence: true, monitors_output_quality: true, auto_rework_threshold: 0.6 },
        },
        error_handling: 'retry_then_escalate',
        timeout_seconds: 300,
        max_total_retries: 10,
        notifications: { on_complete: true, on_error: true, on_rework: true, on_timeout: true },
      };

  // 4) Memory spec (blackboard)
  const memory_spec = wf.memory_spec && Object.keys(wf.memory_spec).length > 0
    ? wf.memory_spec
    : {
        type: 'blackboard',
        storage: { stores_all_agent_outputs: true, versioned_per_task_id: true, max_versions_per_key: 5 },
        access_rules: { read_access: 'all_agents', write_access: 'own_keys_only', conflict_resolution: 'last_write_wins' },
        retrieval_modes: ['latest_version', 'specific_agent_output', 'confidence_threshold_filter', 'by_task_id'],
        initial_state: {},
      };

  // 5) Rework policy
  const rework_policy = wf.rework_policy && Object.keys(wf.rework_policy).length > 0
    ? wf.rework_policy
    : {
        enabled: true,
        trigger_conditions: [
          { type: 'confidence_below', threshold: 0.7, applies_to: 'all' },
          { type: 'validation_failed', applies_to: 'all' },
        ],
        max_rework_cycles: 3,
        rework_routing: agents.map((_, i) => ({
          failed_agent: `agent_index_${i}`,
          rework_agent: `agent_index_${i}`,
          include_feedback: true,
        })),
        escalation_path: { after_max_retries: 'human_review', fallback_agent_index: null, notification_on_escalation: true },
      };

  // 6) Safety policy
  const safety_policy = wf.safety_policy && Object.keys(wf.safety_policy).length > 0
    ? wf.safety_policy
    : {
        evaluation_enabled: true,
        evaluation_agent_index: null,
        evaluation_criteria: ['factual_accuracy', 'completeness', 'consistency', 'safety', 'bias_check'],
        minimum_safety_score: 0.8,
        on_safety_failure: 'flag_for_review',
        content_filters: { pii_detection: true, toxicity_check: true, hallucination_check: true },
      };

  return {
    ...wf,
    name: wf.name ?? 'Untitled Workflow',
    description: wf.description ?? '',
    agents: enrichedAgents,
    edges,
    execution_rules,
    memory_spec,
    rework_policy,
    safety_policy,
  } as T;
}
