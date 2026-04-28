/**
 * AC-009.5 — Self-Stability Loop Controller (CLOSED SPEC v1.0)
 * Deterministic stability tracking and loop closure for CMACK.
 */

export type CycleState = "ACTIVE" | "DEGRADED" | "STALL" | "HALTED";
export type LoopDecision = "CONTINUE" | "SLOW_DOWN" | "RECALIBRATE" | "STALL";

export enum ExecutionPhase {
  PRE_EXECUTION = "PRE_EXECUTION",
  EXECUTION = "EXECUTION",
  POST_EXECUTION = "POST_EXECUTION",
  LOOP_CHECK = "LOOP_CHECK"
}

export interface DriftVector {
  governance: number;
  topology: number;
  execution: number;
  uncertainty: number;
  intent: number; // 🎯 AC-009.7
}

export interface LoopControlState {
  cycle_state: CycleState;
  execution_phase: ExecutionPhase;
  stability_index: number;
  drift_vector: DriftVector;
  trace_ref: string;
  last_cycle_timestamp: string;
  pending_violations: number;
}

export class SelfStabilityLoop {
  /**
   * 📉 R6: STABILITY INDEX FORMULA (UPDATED AC-009.7)
   * stability_index = 1.0 - (gov*0.3) - (top*0.2) - (exec*0.2) - (unc*0.1) - (int*0.2)
   */
  static calculateStabilityIndex(drift: DriftVector): number {
    const index = 1.0 
      - (drift.governance * 0.3)
      - (drift.topology * 0.2)
      - (drift.execution * 0.2)
      - (drift.uncertainty * 0.1)
      - (drift.intent * 0.2);
    
    return Math.max(0, Math.min(1, index));
  }

  /**
   * 🧠 AC-009.5: LOOP_CHECK ENGINE
   * The mandatory gatekeeper for all CMACK execution cycles.
   */
  static evaluate(state: LoopControlState): LoopDecision {
    // 🚨 HARD STOP RULE (MANDATORY)
    if (!state || !state.trace_ref) {
      console.error("🛑 [LoopControl] STALL: Missing mandatory trace_ref.");
      return "STALL";
    }

    if (state.stability_index < 0.7) {
      console.error(`🛑 [LoopControl] STALL: Stability Index Critical (${state.stability_index.toFixed(2)})`);
      return "STALL";
    }

    if (state.drift_vector.governance > 0.6 || 
        state.drift_vector.topology > 0.6 || 
        state.drift_vector.execution > 0.6 || 
        state.drift_vector.uncertainty > 0.6 ||
        state.drift_vector.intent > 0.6) {
      console.error("🛑 [LoopControl] STALL: Drift Vector Threshold Exceeded.");
      return "STALL";
    }

    if (state.pending_violations > 0) {
      console.warn(`⚠️ [LoopControl] RECALIBRATE: Unresolved violations detected (${state.pending_violations})`);
      return "STALL"; // Spec says ANY violation -> STALL
    }

    // Adaptive Decisions
    if (state.stability_index < 0.85) {
      console.warn("🔄 [LoopControl] RECALIBRATE: Minor drift detected.");
      return "RECALIBRATE";
    }

    if (state.stability_index < 0.95) {
      console.log("⏳ [LoopControl] SLOW_DOWN: Approaching threshold.");
      return "SLOW_DOWN";
    }

    return "CONTINUE";
  }
}
