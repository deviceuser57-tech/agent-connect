import { SystemState, ICOS_CONSTITUTION, ModeState } from '../constitution/icos.constitution';

export interface GecInput {
  currentState: SystemState;
  event: string;
  data: any;
  subgraph?: any[];
  modeState?: ModeState;
  projectedRisk?: number; // Injected from Simulation
}

export interface GecDecision {
  primary: SystemState;
  alternatives: SystemState[];
  confidence: number;
  riskScore: number;
}

export interface GecValidation {
  isValid: boolean;
  decision: GecDecision;
  reason?: string;
}

/**
 * GEC (Global Execution Controller) - v2.3 Hardened Logic
 */
export const evaluateTransition = (input: GecInput): GecValidation => {
  const { currentState, event, data, modeState, projectedRisk = 0 } = input;
  const dDna = input.data?.dDna || ICOS_CONSTITUTION.traits;

  // 1. Hard Rejection Logic (PHASE 8 v1.3)
  if (projectedRisk > dDna.risk_tolerance) {
    return {
      isValid: false,
      decision: {
        primary: 'PHASE_LOCKED',
        alternatives: ['IDLE'],
        confidence: 0,
        riskScore: projectedRisk
      },
      reason: `GEC_HARD_REJECT: Projected risk ${projectedRisk.toFixed(2)} exceeds DNA threshold ${dDna.risk_tolerance.toFixed(2)}.`
    };
  }

  // 2. State Machine Transition Rules
  const transitions: Partial<Record<SystemState, Record<string, SystemState>>> = {
    'IDLE': { 'START': 'PHASE_INITIALIZING' },
    'PHASE_INITIALIZING': { 'INITIALIZED': 'PHASE_RUNNING' },
    'PHASE_RUNNING': { 'COMPLETE': 'PHASE_VALIDATING' },
    'PHASE_VALIDATING': { 'PASS': 'PHASE_PENDING_APPROVAL', 'FAIL': 'IDLE' },
    'PHASE_EXPLORATION_RECOVERY': { 'STABILIZED': 'PHASE_RUNNING', 'FAIL': 'PHASE_LOCKED' },
    'PHASE_PENDING_APPROVAL': { 'APPROVE': 'PHASE_APPROVED', 'REJECT': 'PHASE_REJECTED' },
    'PHASE_LOCKED': { 'UNLOCK': 'IDLE' }
  };

  const primaryState = transitions[currentState]?.[event];
  
  // 3. Parametric Risk Scoring
  const loopRisk = (data?.loops || 0) / (dDna.max_loops || 10);
  const baseRisk = modeState?.mode === 'ADVERSARIAL' ? 0.4 : 0.1;
  const riskScore = Math.min(loopRisk + baseRisk + (projectedRisk * 0.5), 1.0);

  const confidence = primaryState ? Math.max(1.0 - riskScore - (1.0 - dDna.risk_tolerance), 0) : 0.0;

  if (!primaryState) {
    return {
      isValid: false,
      decision: { primary: 'PHASE_LOCKED', alternatives: ['IDLE'], confidence: 0, riskScore: 1.0 },
      reason: 'State transition rule violation.'
    };
  }

  return {
    isValid: true,
    decision: {
      primary: primaryState,
      alternatives: transitions[primaryState] ? Object.values(transitions[primaryState]) : [],
      confidence,
      riskScore
    }
  };
};
