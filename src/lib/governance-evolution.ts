import { CognitiveFeedbackReport } from './meis-feedback';
import { supabaseCompat as supabase } from '@/integrations/supabase/cmack-compat';

export interface GovernanceEvolutionResult {
  version_chain: string[];
  rule_diffs: {
    rule_id: string;
    action: 'ADD' | 'MODIFY' | 'DELETE';
    changes: any;
  }[];
  rollback_pointer: string | null;
  stability_score: number;
}

/**
 * AC-006: Evidence Evaluator
 * Validates AC-005 evidence before allowing evolution.
 */
export class EvidenceEvaluator {
  static validate(report: CognitiveFeedbackReport): { valid: boolean; error?: string } {
    if (!report.execution_id) return { valid: false, error: 'MISSING_JUSTIFICATION_TRACE' };
    if (report.drift_classification === 'UNSTABLE') {
      console.warn(`⚠️ [EvidenceEvaluator] System is UNSTABLE. Evolution requires caution.`);
    }
    return { valid: true };
  }
}

/**
 * AC-006: Governance Evolver
 * Deterministic rule mutation based on evidence.
 */
export class GovernanceEvolver {
  static evolve(report: CognitiveFeedbackReport): any[] {
    const diffs: any[] = [];
    
    for (const recommendation of report.governance_delta_recommendations) {
      diffs.push({
        rule_id: recommendation.rule_id,
        action: 'MODIFY',
        changes: { adjustment: recommendation.suggested_adjustment },
        justification_trace_id: report.execution_id
      });
    }

    return diffs;
  }
}

/**
 * AC-006: Constitution Version Manager
 * Manages append-only version chain.
 */
export class ConstitutionVersionManager {
  static async createVersion(
    sessionId: string,
    diffs: any[],
    parentVersionId: string | null
  ): Promise<string> {
    const newVersionId = `v_${Date.now()}`;
    
    // In a real system, this would insert into 'governance_versions' table
    console.log(`📜 [Constitution] Created Version: ${newVersionId} (Parent: ${parentVersionId})`);
    
    return newVersionId;
  }
}

/**
 * AC-006: Rollback Controller
 * Stability scoring and rollback management.
 */
export class RollbackController {
  static getPointer(stabilityIndex: number, currentVersion: string): string | null {
    if (stabilityIndex < 0.3) {
      console.error(`🚨 [Rollback] Stability Critical: ${stabilityIndex}. Suggesting rollback.`);
      return 'v_stable_fallback';
    }
    return null;
  }
}

/**
 * AC-006: Governance Evolution Engine
 * Evidence-based evolution and versioning.
 */
export class GovernanceEvolutionEngine {
  static async processEvolution(
    sessionId: string,
    report: CognitiveFeedbackReport,
    currentVersion: string
  ): Promise<GovernanceEvolutionResult | 'STALL'> {
    
    console.log(`🌱 [Evolution] Processing Governance Evolution for Session: ${sessionId}`);

    // 1. Evidence Evaluation
    const evidence = EvidenceEvaluator.validate(report);
    if (!evidence.valid) {
      console.error(`🛑 [Evolution] Gating failed: ${evidence.error}`);
      return 'STALL';
    }

    // 2. Deterministic Mutation
    const ruleDiffs = GovernanceEvolver.evolve(report);
    if (ruleDiffs.length === 0) {
      console.log(`ℹ️ [Evolution] No evolution required based on report.`);
      return {
        version_chain: [currentVersion],
        rule_diffs: [],
        rollback_pointer: null,
        stability_score: report.system_stability_index
      };
    }

    // 3. Versioning
    const newVersion = await ConstitutionVersionManager.createVersion(sessionId, ruleDiffs, currentVersion);

    // 4. Rollback Assessment
    const rollback = RollbackController.getPointer(report.system_stability_index, newVersion);

    return {
      version_chain: [currentVersion, newVersion],
      rule_diffs: ruleDiffs,
      rollback_pointer: rollback,
      stability_score: report.system_stability_index
    };
  }
}
