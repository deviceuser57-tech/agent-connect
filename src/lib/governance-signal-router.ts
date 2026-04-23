import { supabase } from '@/integrations/supabase/client';

/**
 * GOVERNANCE SIGNAL ROUTER (GRAVITY v1.3)
 * Responsibilities: Enforcing signal separation between Execution and Governance learning.
 */
export const GovernanceSignalRouter = {
  
  routeSignal: async (sessionId: string, type: 'EXECUTION' | 'GOVERNANCE', payload: any) => {
    // 1. Log signal into the primary accuracy log with clear separation
    await supabase.from('governance_accuracy_log').insert({
      session_id: sessionId,
      signal_type: type,
      accuracy_score: payload.accuracy,
      deviation: payload.deviation
    });

    // 2. Prevent signal bleeding (Hard Rule)
    if (type === 'EXECUTION') {
      console.log(`[ROUTER] Routing Execution Signal (Outcome Correlation) -> Session ${sessionId}`);
      // This routes to CMACK Feedback loops (indirectly via tracers)
    } else {
      console.log(`[ROUTER] Routing Governance Signal (Decision Accuracy) -> Session ${sessionId}`);
      // This routes to Governance Memory / Tuner
    }
  },

  computeSeparatedMetrics: (traces: any[]) => {
    const govSignals = traces.filter(t => t.signal_type === 'GOVERNANCE');
    const execSignals = traces.filter(t => t.signal_type === 'EXECUTION');

    return {
      governanceAccuracy: govSignals.reduce((acc, s) => acc + s.accuracy_score, 0) / (govSignals.length || 1),
      executionSuccessRate: execSignals.reduce((acc, s) => acc + s.accuracy_score, 0) / (execSignals.length || 1)
    };
  }
};
