import { ChaosType, SystemState, CCDB_CONSTANTS } from '../constitution/icos.constitution';

export interface ChaosSignature {
  type: ChaosType;
  severity: number;
  isRepeated: boolean;
  intent: 'ACCIDENTAL' | 'MALICIOUS' | 'SYSTEMIC';
  budgetRemaining: number;
  escalationLevel: number; // 0 to 4
}

/**
 * ChaosControlEngine (CCDB v1.0)
 * Responsibilities: Limit adaptive drift via stability budgets and escalation logic.
 */
export const ChaosControlEngine = {
  evaluateChaos: (error: string, history: any[], currentBudget: number): ChaosSignature => {
    let type: ChaosType = 'AMBIGUITY';
    let intent: ChaosSignature['intent'] = 'ACCIDENTAL';

    if (error.includes('vulnerability') || error.includes('attack')) {
      type = 'ADVERSARIAL';
      intent = 'MALICIOUS';
    }

    const isRepeated = history.some(h => h.chaos?.type === type);
    const escalationLevel = isRepeated ? 2 : 1;
    const severity = (escalationLevel * 0.2) + (error.length > 100 ? 0.3 : 0.1);
    
    // Anti-Oscillation Check
    const statePath = history.slice(-4).map(h => h.state);
    const isOscillating = statePath.length >= 4 && statePath[0] === statePath[2] && statePath[1] === statePath[3];

    return {
      type,
      severity,
      isRepeated,
      intent,
      budgetRemaining: isOscillating ? 0 : currentBudget - severity,
      escalationLevel: isOscillating ? 4 : escalationLevel
    };
  },

  selectBoundedState: (signature: ChaosSignature, cycleCount: number): SystemState => {
    if (signature.budgetRemaining <= 0 || cycleCount >= CCDB_CONSTANTS.MAX_RECOVERY_CYCLES) {
      return 'PHASE_LOCKED';
    }

    if (signature.escalationLevel >= 3) return 'PHASE_DEGRADED';
    
    return 'PHASE_SOFT_ISOLATION';
  }
};
