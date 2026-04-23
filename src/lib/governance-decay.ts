/**
 * GOVERNANCE DECAY ENGINE (GRAVITY v1.3)
 * Responsibilities: Weighting signals based on temporal relevance.
 */
export const GovernanceDecay = {
  LAMBDA: 0.0005, // Decay constant

  computeDecayedWeight: (originalWeight: number, timestamp: string | Date) => {
    const now = new Date().getTime();
    const then = new Date(timestamp).getTime();
    const dt = Math.max(0, now - then) / (1000 * 60); // Difference in minutes

    // Formula: original * exp(-λ * Δt)
    const decayFactor = Math.exp(-GovernanceDecay.LAMBDA * dt);
    
    return originalWeight * decayFactor;
  },

  applyDecayToTraces: (traces: any[]) => {
    return traces.map(t => ({
      ...t,
      effective_bias: GovernanceDecay.computeDecayedWeight(t.governance_bias_delta || 0, t.timestamp),
      effective_outcome: GovernanceDecay.computeDecayedWeight(t.outcome_score || 0, t.timestamp)
    }));
  }
};
