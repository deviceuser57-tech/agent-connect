import { supabase } from '@/integrations/supabase/client';

/**
 * GOVERNANCE REFLECTION ENGINE (GRAVITY v1.5)
 * Responsibilities: Self-evaluating decision quality and calculating cognitive bias.
 */
export const GovernanceReflection = {
  
  reflect: async (sessionId: string, decisionId: string, outcomeScore: number) => {
    // 1. Fetch the original decision context
    const { data: conflict } = await supabase.from('conflict_logs').select('*').eq('id', decisionId).single();
    if (!conflict) return;

    // 2. Compute Self-Bias
    // Is the final decision aligned with the successful outcome?
    // outcomeScore (low = success, high = failure)
    const finalDecisionSource = conflict.final_arbitration.source || 'GOVERNANCE';
    const wasSuccessful = outcomeScore < 0.3;
    
    // Bias: Did we trust DNA when we shouldn't have? Or vice versa?
    let selfBias = 0;
    if (finalDecisionSource === 'DNA_OVERRIDE' && !wasSuccessful) selfBias = 0.8; // Bad DNA trust
    if (finalDecisionSource === 'GOVERNANCE' && wasSuccessful) {
        // If Governance blocked but it would have been safe? Hard to know without simulation.
        // We look at risk_delta.
        selfBias = (conflict.dna_preference.risk_tolerance - 0.2) * 0.5;
    }

    // 3. Log Reflection
    await supabase.from('governance_reflections').insert({
      session_id: sessionId,
      decision_id: decisionId,
      reflection_data: {
        winner: finalDecisionSource,
        wasSuccessful,
        reasoning: conflict.final_arbitration.arbitrationReason,
        dnaConfidence: conflict.dna_preference.confidence
      },
      self_bias_score: selfBias,
      success_alignment: wasSuccessful ? 1.0 : 0.0
    });

    return selfBias;
  }
};
