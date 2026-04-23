import { ModeState, GraphNode } from '../constitution/icos.constitution';

/**
 * ModeInferenceEngine (New Module - CMACK v1.0)
 * Responsibilities: Graph State -> Cognitive Mode Inference
 */
export const ModeInferenceEngine = {
  inferMode: (subgraph: any[], stabilityMetrics: any): ModeState => {
    // 1. Calculate Entropy Score (variance in historical weights)
    const weights = subgraph.map(n => n.effectiveWeight || n.weight);
    const avgWeight = weights.reduce((a, b) => a + b, 0) / (weights.length || 1);
    const variance = weights.reduce((a, b) => a + Math.pow(b - avgWeight, 2), 0) / (weights.length || 1);
    const entropyScore = Math.min(variance * 10, 1.0);

    // 2. Determine Primary Mode
    let mode: ModeState['mode'] = 'EXECUTION';
    let confidence = 0.9;

    if (avgWeight > 0.7) {
      mode = 'ADVERSARIAL';
      confidence = avgWeight;
    } else if (stabilityMetrics.failureCount > 0) {
      mode = 'RECOVERY';
      confidence = 0.8;
    } else if (entropyScore > 0.5) {
      mode = 'EXPLORATION';
      confidence = 1.0 - entropyScore;
    }

    return {
      mode,
      confidence,
      entropyScore,
      stabilityIndex: 1.0 - avgWeight
    };
  }
};
