/**
 * AC-009.7 — Intent Binding & Action Legitimacy Lock
 * Enforces high-level system alignment and prevents "Safety vs Speed" tradeoffs.
 */

import { RuntimeState } from './meis-runtime';

export const SYSTEM_INTENT = {
  primary: "DETERMINISTIC_SAFE_EXECUTION",
  constraints: [
    "NO_UNVERIFIED_EXECUTION",
    "NO_UNTRACEABLE_MUTATION",
    "NO_GOVERNANCE_BYPASS",
    "NO_STABILITY_DEGRADATION"
  ]
};

export interface IntentSignature {
  intent_id: string;
  alignment_hash: string;
}

export class IntentValidator {
  /**
   * 🎯 AC-009.7: LEGITIMACY CHECK
   * Ensures the action is aligned with the System Intent.
   */
  static validateStep(step: any, systemIntent: typeof SYSTEM_INTENT): 'ALLOW' | 'STALL' {
    // R1: Explicit Forbidden Actions
    if (step.action === 'SKIP_VALIDATION') {
      console.error(`🛑 [IntentValidator] STALL: 'SKIP_VALIDATION' violates 'NO_UNVERIFIED_EXECUTION'.`);
      return 'STALL';
    }

    // R3: Optimization vs Safety Constraint
    if (step.action === 'OPTIMIZE' && step.metadata?.reduces_safety === true) {
      console.error(`🛑 [IntentValidator] STALL: Optimization reduces safety. Rejected.`);
      return 'STALL';
    }

    return 'ALLOW';
  }

  static validateRewiring(plan: any, systemIntent: typeof SYSTEM_INTENT): 'ALLOW' | 'STALL' {
    // R4: Rewiring MUST respect Intent
    // Any rewiring that attempts to bypass core stability or governance is rejected.
    const violates = plan.actions.some((a: any) => 
        a.target === 'DISABLE_GOVERNANCE' || 
        a.target === 'REDUCE_STABILITY_THRESHOLD'
    );
    
    if (violates) {
        console.error("🛑 [IntentValidator] STALL: Rewiring attempt to weaken core constraints detected.");
        return 'STALL';
    }
    return 'ALLOW';
  }
}

export class IntentDriftDetector {
  /**
   * 📉 AC-009.7: INTENT DRIFT CALCULATION
   * Measures how far execution has strayed from the intended alignment.
   */
  static detect(runtimeState: RuntimeState): number {
    let drift = 0;

    for (const step of runtimeState.stepExecutionLog) {
      // Logic to detect implicit alignment drift from results
      if (step.result?.violates_intent) {
        drift += 0.2;
      }
    }

    return Math.min(1.0, drift);
  }
}

export class PostExecutionValidator {
  /**
   * 🔍 AC-009.8: RESULT INTEGRITY CHECK
   * Validates side-effects and intent alignment after a step completes.
   */
  static validate(context: {
    step: any;
    result: any;
    expectedIntent: string;
    preflightPrediction?: string;
  }): 'ALLOW' | 'STALL' {
    // 1. Result Integrity
    if (context.result === undefined || context.result === null) {
      console.error(`🛑 [PostExecution] STALL: Integrity failure in step ${context.step.id}.`);
      return 'STALL';
    }

    // 2. Intent Alignment check on result
    if (context.result.violates_intent === true) {
      console.error(`🛑 [PostExecution] STALL: Step ${context.step.id} result violates system intent.`);
      return 'STALL';
    }

    // 3. Side-effect check
    if (context.result.unauthorized_side_effects?.length > 0) {
      console.error(`🛑 [PostExecution] STALL: Unauthorized side-effects detected.`);
      return 'STALL';
    }

    return 'ALLOW';
  }
}

export class SequenceValidator {
  /**
   * 🧵 AC-009.8: MULTI-STEP EMERGENT DRIFT
   * Validates the trajectory of the entire sequence towards the intended goal.
   */
  static validate(steps: any[], runtimeState: RuntimeState, intendedGoal: string): 'ALLOW' | 'STALL' {
    const log = runtimeState.stepExecutionLog;
    const completionRate = log.filter(s => s.status === 'COMPLETED').length / steps.length;
    
    // Detect "Stealth Drift" - tiny per-step drifts that accumulate
    const currentDrift = IntentDriftDetector.detect(runtimeState);
    if (completionRate > 0.5 && currentDrift > 0.4) {
      console.error(`🛑 [SequenceValidator] STALL: Emergent Intent Drift detected (${currentDrift.toFixed(2)}). Sequence misaligned.`);
      return 'STALL';
    }

    return 'ALLOW';
  }
}
