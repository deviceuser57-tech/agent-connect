import { supabaseCompat as supabase } from '@/integrations/supabase/cmack-compat';
import { ConflictSignature } from './conflict-detector';

/**
 * GOVERNANCE ARBITRATOR (GRAVITY v1.4)
 * Responsibilities: Final decision authority through dual-intelligence balancing.
 */
export const GovernanceArbitrator = {
  
  arbitrate: async (sessionId: string, conflict: ConflictSignature) => {
    // 1. Fetch Authority Factors
    const { data: state } = await supabase.from('governance_state').select('*').eq('session_id', sessionId).single();
    const adaptabilityFactor = state?.adaptability_factor || 0.5;
    const safetyFactor = state?.safety_factor || 0.5;

    let finalDecision: any = conflict.govDecision;
    let reason = 'DEFAULT_GOVERNANCE_PATH';

    // 2. Decision Intelligence Rules
    if (!conflict.hasConflict) {
       finalDecision = conflict.govDecision;
       reason = 'CONSENSUS_REACHED';
    } else if (conflict.severity < 0.3) {
       // DNA WINS (Exploration allowed)
       finalDecision = { ...conflict.govDecision, isBlocked: false, source: 'DNA_OVERRIDE' };
       reason = 'DNA_EXPLORATION_PREFERRED';
    } else if (conflict.severity < 0.7) {
       // GOVERNANCE WINS (Safety first)
       finalDecision = conflict.govDecision;
       reason = 'GOVERNANCE_SAFETY_ENFORCED';
    } else {
       // CRITICAL CONFLICT (Safe Resolution Mode)
       finalDecision = { ...conflict.govDecision, isBlocked: true, source: 'ARBITRATOR_FALLBACK' };
       reason = 'CRITICAL_CONFLICT_SAFE_FALLBACK';
    }

    // 3. Log conflict memory
    const { data: log } = await supabase.from('conflict_logs').insert({
       session_id: sessionId,
       type: conflict.type,
       severity: conflict.severity,
       dna_preference: conflict.dnaPreference,
       governance_decision: conflict.govDecision,
       final_arbitration: { ...finalDecision, arbitrationReason: reason }
    }).select().single();

    return { 
       decision: finalDecision, 
       reason, 
       conflictLogId: log?.id 
    };
  },

  // Meta-Learning: Adjust authority based on results
  updateAuthority: async (sessionId: string, logId: string, outcomeScore: number) => {
    const { data: log } = await supabase.from('conflict_logs').select('*').eq('id', logId).single();
    if (!log) return;

    const winner = log.final_arbitration.source || 'GOVERNANCE';
    const wasSuccessful = outcomeScore < 0.3;

    const { data: state } = await supabase.from('governance_state').select('*').eq('session_id', sessionId).single();
    if (!state) return;

    let dAdapt = state.adaptability_factor;
    let dSafe = state.safety_factor;

    if (winner === 'DNA_OVERRIDE' && wasSuccessful) dAdapt += 0.02;
    if (winner === 'GOVERNANCE' && !wasSuccessful) dSafe += 0.02;
    if (winner === 'DNA_OVERRIDE' && !wasSuccessful) dAdapt -= 0.05;

    await supabase.from('governance_state').update({
       adaptability_factor: Math.min(Math.max(dAdapt, 0.2), 0.8),
       safety_factor: Math.min(Math.max(dSafe, 0.2), 0.8)
    }).eq('session_id', sessionId);
  }
};
