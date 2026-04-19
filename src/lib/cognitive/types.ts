// Cognitive Architecture — shared types
export interface CognitiveDNA {
  id: string;
  workspace_id: string;
  version: number;
  parent_version: number | null;
  identity: Record<string, unknown>;
  philosophy: Record<string, unknown>;
  value_system: Record<string, unknown>;
  reasoning_constraints: Record<string, unknown>;
  learning_boundaries: Record<string, unknown>;
  evolution_permissions: Record<string, unknown>;
  governance: {
    primary_provider?: string;
    adversarial_provider?: string;
    [k: string]: unknown;
  };
  hot_path: { enabled: boolean; threshold: number; [k: string]: unknown };
  is_active: boolean;
  created_at: string;
}

export interface ModeInference {
  scores: { workflow: number; cognitive: number; hybrid: number };
  factors: { complexity: number; risk: number; abstraction: number; simulation_need: number };
  recommended_mode: 'workflow' | 'cognitive' | 'hybrid';
  confidence: number;
  hot_path_eligible: boolean;
  reasoning: string;
}

export interface DecisionContract {
  mode: 'workflow' | 'cognitive' | 'hybrid';
  user_intent: string;
  refinements: string[];
  signed_at: string;
  inference: ModeInference;
}

export interface DecomposedInput {
  intent: string;
  entities: string[];
  ambiguities: string[];
  contradictions: string[];
}

export interface MemoryRecord {
  id: string;
  context_summary: string | null;
  fidelity_scores: Record<string, number>;
  outcome_feedback: Record<string, unknown>;
  created_at: string;
}

export interface OrchestrationCycle {
  think: string;
  simulate: { branch: string; likelihood: number; outcome: string }[];
  evaluate: { weaknesses: string[]; assumptions: string[] };
  adjust: string;
  proposed_spec: { summary: string; components: string[]; data_flow: string };
  self_assessment: { confidence: number; divergence: number; stability: number };
  fidelity?: {
    confidence: number;
    divergence: number;
    stability: number;
    overall: number;
    passed: boolean;
  };
}

export interface CognitionTrace {
  L0?: DecomposedInput;
  L1?: ModeInference;
  L2?: DecisionContract;
  L3?: { recalled: MemoryRecord[]; reason: string };
  L4?: { cycles: OrchestrationCycle[]; final_cycle_idx: number; converged: boolean };
  L5?: unknown;
  L6?: unknown;
  L7?: unknown;
  L8?: unknown;
  L9?: unknown;
  L10?: unknown;
  L11?: unknown;
}

export const DEFAULT_DNA: Omit<CognitiveDNA, 'id' | 'workspace_id' | 'created_at'> = {
  version: 1,
  parent_version: null,
  identity: {
    name: 'Adaptive System Designer',
    purpose: 'Design the right kind of system for the user\'s true intent',
    immutable: true,
  },
  philosophy: {
    principle: 'Reasoning before execution. Negotiate, don\'t assume.',
    bias_toward: 'truthfulness over speed',
  },
  value_system: {
    transparency: 0.9,
    safety: 0.95,
    creativity: 0.6,
    rigor: 0.85,
  },
  reasoning_constraints: {
    max_cycles: 3,
    min_fidelity: 0.7,
    require_governance: true,
  },
  learning_boundaries: {
    can_evolve: ['philosophy', 'value_system', 'reasoning_constraints'],
    immutable: ['identity'],
  },
  evolution_permissions: {
    auto_approve_overlay: true,
    require_human_approval_workspace: true,
  },
  governance: {
    primary_provider: 'google/gemini-3-flash-preview',
    adversarial_provider: 'openai/gpt-5-mini',
  },
  hot_path: { enabled: true, threshold: 0.35 },
  is_active: true,
};
