/**
 * CONFLICT DETECTOR ENGINE (GRAVITY v1.4)
 * Responsibilities: Identifying mismatches between internal intent (DNA) and external control (Governance).
 */

export type ConflictType = 'RISK_CONFLICT' | 'ACTION_CONFLICT' | 'PATH_CONFLICT' | 'EXPLORATION_CONFLICT';

export interface ConflictSignature {
  type: ConflictType;
  severity: number;
  dnaPreference: any;
  govDecision: any;
  hasConflict: boolean;
}

export const ConflictDetector = {
  detect: (dnaTraits: any, govDecision: any, projectedRisk: number): ConflictSignature => {
    let type: ConflictType = 'RISK_CONFLICT';
    let hasConflict = false;

    // 1. RISK_CONFLICT: DNA allows more risk than Governance currently permits
    const riskDiff = Math.max(0, dnaTraits.risk_tolerance - (0.4 - (govDecision.thresholdAdj || 0)));
    if (riskDiff > 0.1) {
      hasConflict = true;
      type = 'RISK_CONFLICT';
    }

    // 2. ACTION_CONFLICT: DNA wants to explore vs Gov wants to block
    if (govDecision.isBlocked && dnaTraits.exploration_bias > 0.6) {
      hasConflict = true;
      type = 'EXPLORATION_CONFLICT';
    }

    // 3. Severity Calculation
    // (dna_confidence * 0.4) + (governance_confidence * 0.4) + (risk_delta * 0.2)
    const dnaConfidence = dnaTraits.confidence || 0.5;
    const govConfidence = 0.8; // Hardened Governance baseline
    const severity = (dnaConfidence * 0.4) + (govConfidence * 0.4) + (riskDiff * 0.2);

    return {
      type,
      severity: Math.min(severity, 1.0),
      dnaPreference: dnaTraits,
      govDecision,
      hasConflict
    };
  }
};
