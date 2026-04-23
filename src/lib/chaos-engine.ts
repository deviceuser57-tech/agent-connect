import { ChaosType, SystemState } from '../constitution/icos.constitution';

export interface ChaosSignature {
  type: ChaosType;
  severity: number;
  isRepeated: boolean;
  intent: 'ACCIDENTAL' | 'MALICIOUS' | 'SYSTEMIC';
}

/**
 * ChaosEngine (New Module - CIL v1.0)
 * Responsibilities: Classify instability and determine adaptive response modes.
 */
export const ChaosEngine = {
  classifyChaos: (error: string, history: any[]): ChaosSignature => {
    let type: ChaosType = 'AMBIGUITY';
    let intent: ChaosSignature['intent'] = 'ACCIDENTAL';

    if (error.includes('vulnerability') || error.includes('attack')) {
      type = 'ADVERSARIAL';
      intent = 'MALICIOUS';
    } else if (error.includes('loop') || error.includes('retry')) {
      type = 'STRUCTURAL';
      intent = 'SYSTEMIC';
    }

    const isRepeated = history.filter(h => h.state === 'PHASE_LOCKED').length > 1;

    return {
      type,
      severity: isRepeated ? 0.9 : 0.4,
      isRepeated,
      intent
    };
  },

  selectAdaptiveState: (signature: ChaosSignature): SystemState => {
    if (signature.type === 'ADVERSARIAL') return 'PHASE_LOCKED';
    if (signature.type === 'STRUCTURAL' && !signature.isRepeated) return 'PHASE_EXPLORATION_RECOVERY';
    if (signature.severity > 0.8) return 'PHASE_DEGRADED';
    
    return 'PHASE_SOFT_ISOLATION';
  }
};
