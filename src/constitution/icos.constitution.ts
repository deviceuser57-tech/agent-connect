export const ICOS_CONSTITUTION: CognitiveDNA = {
  traits: {
    autonomy_level: 0.7,
    risk_tolerance: 0.2,
    reasoning_depth: 3,
  },
  constraints: {
    max_tokens: 4096,
    max_loops: 10,
    allowed_tools: ['search', 'calculate', 'db_read'],
  },
  governance: {
    approval_required: true,
    fail_safe_enabled: true,
    audit_level: 'full',
  },
};

export type ModeType = 'EXPLORATION' | 'EXECUTION' | 'RECOVERY' | 'OPTIMIZATION' | 'ADVERSARIAL';

// ESGL v1.0 Evolution Stability Governance Constants
export const ESGL_CONSTANTS = {
  MIN_COOLDOWN_MS: 3600000, // 1 hour mandatory rest between mutations
  MAX_TRAIT_VARIANCE: 0.1,  // Max 10% change per individual mutation
  DAMPING_FACTOR: 0.95,     // Evolution slows as the system matures (v^damping)
  IDENTITY_PROTECTION: true
};

export type ChaosType = 'STRUCTURAL' | 'CORRUPTION' | 'ADVERSARIAL' | 'DESYNC' | 'AMBIGUITY' | 'NONE';

// CCDB v1.0 Chaos Control Constants
export const CCDB_CONSTANTS = {
  STABILITY_BUDGET: 1.0,
  MAX_RECOVERY_CYCLES: 3,
  MAX_DEGRADED_STEPS: 5,
  ESCALATION_PENALTY: 0.2
};

export const SYSTEM_STATES = [
  'IDLE',
  'PHASE_INITIALIZING',
  'PHASE_RUNNING',
  'PHASE_VALIDATING',
  'PHASE_PENDING_APPROVAL',
  'PHASE_APPROVED',
  'PHASE_REJECTED',
  'PHASE_LOCKED',
  'PHASE_DEGRADED',
  'PHASE_SOFT_ISOLATION',
  'PHASE_EXPLORATION_RECOVERY',
  'PHASE_PENDING_CONSENSUS',
  'PHASE_CONSENSUS_FAILED'
] as const;

export type SystemState = typeof SYSTEM_STATES[number];
