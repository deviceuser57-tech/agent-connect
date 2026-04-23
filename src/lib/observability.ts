import { supabase } from '@/integrations/supabase/client';

export interface DecisionTrace {
  sessionId: string;
  stateBefore: string;
  inferredMode: string;
  chaosType: string;
  chaosLevel: number;
  stabilityBudget: number;
  gecDecision: any;
  selectedPath: string;
  finalState: string;
  mutationStatus?: any;
}

/**
 * ObservabilityEngine (COL v1.0)
 * Responsibilities: Structured logging of cognitive reasoning and state.
 */
export const ObservabilityEngine = {
  logTrace: async (trace: DecisionTrace) => {
    const { error } = await supabase
      .from('execution_traces')
      .insert({
        session_id: trace.sessionId,
        trace_data: trace
      });
    
    if (error) console.error('Observability Error:', error.message);
  },

  getTimeline: async (sessionId: string) => {
    const { data } = await supabase
      .from('execution_traces')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    
    return data || [];
  }
};
