import { supabaseCompat as supabase } from '@/integrations/supabase/cmack-compat';

/**
 * GOVERNANCE MEMORY LAYER (GRAVITY v1.2)
 * Responsibilities: Tracking historical patterns and outcome correlations.
 */
export const GovernanceMemory = {
  
  // 1. Snapshot retrieval
  getBehavioralProfile: async (sessionId: string, userRole: string) => {
    const { data: traces } = await supabase
      .from('governance_traces')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_role', userRole)
      .order('timestamp', { ascending: false })
      .limit(20);

    const failures = traces?.filter(t => (t.outcome_score || 0) > 0.7).length || 0;
    const blocks = traces?.filter(t => t.is_blocked).length || 0;

    return {
      historyCount: traces?.length || 0,
      failureRate: (traces?.length || 0) > 0 ? failures / traces!.length : 0,
      blockRate: (traces?.length || 0) > 0 ? blocks / traces!.length : 0
    };
  },

  // 2. Correlation Mapping
  correlateOutcome: async (traceId: string, outcomeScore: number) => {
    const { data: trace } = await supabase
      .from('governance_traces')
      .select('*')
      .eq('id', traceId)
      .single();

    if (!trace) return;

    // Bias = (actual_outcome - decision_quality)
    // decision_quality is inferred; if approved it's 0.2 (expected success), if blocked it's 0.8 (expected fail)
    const predictedRisk = trace.is_blocked ? 0.8 : 0.2;
    const biasDelta = outcomeScore - predictedRisk;

    await supabase.from('governance_traces').update({
      outcome_score: outcomeScore,
      governance_bias_delta: biasDelta
    }).eq('id', traceId);

    return biasDelta;
  },

  // 3. Signature verification (SPOOF PROTECTION)
  verifySignature: async (sessionId: string, signature: string) => {
    const { data } = await supabase
      .from('governance_traces')
      .select('id')
      .eq('session_id', sessionId)
      .eq('execution_signature', signature)
      .single();

    return !data; // Return true if valid (not used before)
  }
};
