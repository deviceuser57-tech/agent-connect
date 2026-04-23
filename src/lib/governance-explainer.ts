/**
 * GOVERNANCE EXPLAINER (GRAVITY v1.5)
 * Responsibilities: Generating human-readable interpretability of internal cognitive arbitration.
 */
export const GovernanceExplainer = {
  
  explain: (conflict: any, arbitration: any) => {
    const dnaRisk = conflict.dna_preference?.risk_tolerance || 0;
    const govStrictness = conflict.governance_decision?.mode === 'STRICT_MODE' ? 'HIGH' : 'MODERATE';
    
    let reasoning = "";
    if (arbitration.reason === 'DNA_EXPLORATION_PREFERRED') {
      reasoning = `DNA exploration weight (${conflict.dna_preference.exploration_bias}) exceeded safe-governance threshold, allowing innovation override.`;
    } else if (arbitration.reason === 'GOVERNANCE_SAFETY_ENFORCED') {
      reasoning = `Governance strictness (${govStrictness}) prioritized over DNA intent due to elevated severity score (${conflict.severity.toFixed(2)}).`;
    } else {
      reasoning = `Consensus reached: ${arbitration.reason}`;
    }

    return {
      summary: `Arbitrated Decision: ${arbitration.decision.isBlocked ? 'BLOCK' : 'PASS'}`,
      logic_path: arbitration.reason,
      detailed_explanation: reasoning,
      severity_context: conflict.severity
    };
  }
};
