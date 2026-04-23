import { supabase } from '@/integrations/supabase/client';
import { GovernanceDecay } from './governance-decay';
import { GovernanceSignalRouter } from './governance-signal-router';

export type GovernanceMode = 'STRICT_MODE' | 'BALANCED_MODE' | 'PERMISSIVE_MODE' | 'INVESTIGATIVE_MODE';

/**
 * GOVERNANCE TUNER (GRAVITY v1.3)
 * Responsibilities: Stable self-regulating control with drift containment.
 */
export const GovernanceTuner = {
  STABILITY_WINDOW: 10,
  DRIFT_THRESHOLD: 0.5,

  tune: async (sessionId: string) => {
    // 1. Fetch Stability-Aware State
    const { data: state } = await supabase.from('governance_state').select('*').eq('session_id', sessionId).single();
    if (!state || state.is_drift_locked) {
      console.log(`[GOVERNANCE] Tuning Blocked: ${state?.is_drift_locked ? 'DRIFT_LOCKED' : 'NO_STATE'}`);
      return;
    }

    // 2. Stability Window Enforcement (Hysteresis)
    if (state.stability_window_counter < GovernanceTuner.STABILITY_WINDOW) {
      console.log(`[GOVERNANCE] Stability Window Active: ${state.stability_window_counter}/${GovernanceTuner.STABILITY_WINDOW}`);
      return;
    }

    // 3. Fetch Decayed History
    const { data: rawTraces } = await supabase
      .from('governance_traces')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: false })
      .limit(15);

    if (!rawTraces || rawTraces.length < 5) return;

    // Apply Decay Model
    const lastTraces = GovernanceDecay.applyDecayToTraces(rawTraces);

    // 4. Signal Separation Intelligence
    const validOutcomes = lastTraces.filter(t => t.outcome_score !== null);
    const avgBias = validOutcomes.reduce((acc, t) => acc + Math.abs(t.effective_bias || 0), 0) / (validOutcomes.length || 1);
    
    // 5. Drift Containment Logic
    // Compute drift from initial optimal policy (placeholder logic)
    const driftScore = avgBias; // Simplified for MVP
    let isFailingDrift = driftScore > GovernanceTuner.DRIFT_THRESHOLD;

    if (isFailingDrift) {
      await supabase.from('governance_state').update({
        current_mode: 'BALANCED_MODE',
        is_drift_locked: true,
        drift_score: driftScore
      }).eq('session_id', sessionId);
      console.error(`[GOVERNANCE] DRIFT_EXPLOSION: Locking System to BALANCED_MODE (Score: ${driftScore.toFixed(3)})`);
      return;
    }

    // 6. Refined Mode Switching (Hysteresis)
    const failureCount = validOutcomes.filter(t => (t.outcome_score || 0) > 0.7).length;
    const shadowCount = lastTraces.filter(t => t.shadow_detected).length;

    let nextMode: GovernanceMode = state.current_mode;
    
    // Hysteresis Rules: Only transition on sustained signals
    if (failureCount >= 3 && state.current_mode !== 'STRICT_MODE') {
      nextMode = 'STRICT_MODE';
    } else if (shadowCount >= 2 && state.current_mode !== 'INVESTIGATIVE_MODE') {
      nextMode = 'INVESTIGATIVE_MODE';
    } else if (avgBias < 0.05 && failureCount === 0 && state.current_mode !== 'PERMISSIVE_MODE') {
      nextMode = 'PERMISSIVE_MODE';
    } else if (avgBias > 0.3 && state.current_mode === 'PERMISSIVE_MODE') {
      nextMode = 'BALANCED_MODE'; // Downgrade due to instability
    }

    // 7. Adaptive Thresholding with Signal Routing
    const outcomeMismatch = lastTraces.filter(t => !t.is_blocked && (t.outcome_score || 0) > 0.6).length;
    let adj = state.approval_threshold_adj || 0;
    if (outcomeMismatch >= 2) adj = Math.min(adj + 0.05, 0.3); // Conservative tightening

    // 8. Commit Tuned State
    await supabase.from('governance_state').update({
      current_mode: nextMode,
      governance_bias: avgBias,
      approval_threshold_adj: adj,
      last_tuned_at: new Date().toISOString(),
      stability_window_counter: 0, // Reset window after tune
      drift_score: driftScore,
      last_mode_change_at: nextMode !== state.current_mode ? new Date().toISOString() : state.last_mode_change_at
    }).eq('session_id', sessionId);

    // Route Governance Decision signal
    await GovernanceSignalRouter.routeSignal(sessionId, 'GOVERNANCE', { accuracy: 1 - avgBias, deviation: avgBias });

    console.log(`[GOVERNANCE] v1.3 TUNE: Mode=${nextMode}, Bias=${avgBias.toFixed(3)}, Drift=${driftScore.toFixed(3)}`);
  },

  incrementExecution: async (sessionId: string) => {
    const { data: state } = await supabase.from('governance_state').select('*').eq('session_id', sessionId).single();
    if (state) {
      if (state.is_drift_locked) return; // Static while locked

      const newCounter = (state.stability_window_counter || 0) + 1;
      await supabase.from('governance_state').update({ 
        stability_window_counter: newCounter 
      }).eq('session_id', sessionId);
      
      if (newCounter >= GovernanceTuner.STABILITY_WINDOW) {
        await GovernanceTuner.tune(sessionId);
      }
    } else {
      await supabase.from('governance_state').insert({ session_id: sessionId });
    }
  }
};
