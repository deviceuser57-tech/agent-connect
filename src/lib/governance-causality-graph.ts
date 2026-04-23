import { supabaseCompat as supabase } from '@/integrations/supabase/cmack-compat';

/**
 * DECISION CAUSALITY GRAPH (GRAVITY v1.5)
 * Responsibilities: Mapping the causal influence of internal cognitive components on decisions.
 */
export const GovernanceCausality = {
  
  mapCausality: async (sessionId: string, context: {
    dnaInfluence: number;
    govPressure: number;
    arbitrationResult: string;
  }) => {
    const edges = [
      {
        source_node: 'DNA_INTENT',
        target_node: 'ARBITRATION_DECISION',
        influence_weight: context.dnaInfluence,
        decision_pressure: context.dnaInfluence > 0.7 ? 1.0 : 0.2
      },
      {
        source_node: 'GOV_SAFETY_RULE',
        target_node: 'ARBITRATION_DECISION',
        influence_weight: context.govPressure,
        decision_pressure: context.govPressure > 0.5 ? 1.0 : 0.3
      }
    ];

    await supabase.from('governance_causality_graph').insert(
      edges.map(e => ({ ...e, session_id: sessionId }))
    );
  }
};
