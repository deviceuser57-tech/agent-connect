import { supabaseCompat as supabase } from '@/integrations/supabase/cmack-compat';
import { PolicyGenerator } from './policy-generation';

/**
 * POLICY EVOLVER (GRAVITY v1.6)
 * Responsibilities: Continuous refinement of the governing constitution through selection and hybridization.
 */
export const PolicyEvolver = {
  EVOLUTION_CYCLE: 20, // Evolve every 20 executions

  evolve: async (sessionId: string) => {
    // 1. Fetch Rule Performance and Reflections
    const { data: rules } = await supabase.from('governance_rules').select('*').eq('session_id', sessionId).eq('is_active', true);
    const { data: reflections } = await supabase.from('governance_reflections').select('*').eq('session_id', sessionId).limit(50);
    
    if (!rules || !reflections) return;

    // 2. Selection: Strengthen/Weaken based on reflection outcome alignment
    for (const rule of rules) {
        const relevantReflections = reflections.filter(r => r.reflection_data.winner === 'GOVERNANCE'); // Simplified mapping
        const successRate = relevantReflections.filter(r => r.success_alignment > 0.7).length / (relevantReflections.length || 1);
        
        let newEffectiveness = rule.effectiveness_score;
        if (successRate > 0.8) newEffectiveness += 0.05;
        else if (successRate < 0.4) newEffectiveness -= 0.1;

        await supabase.from('governance_rules').update({ 
            effectiveness_score: Math.min(Math.max(newEffectiveness, 0), 2.0),
            is_active: newEffectiveness > 0.2 // Deactivate rules that consistently fail
        }).eq('id', rule.id);
    }

    // 3. Hybridization: Merge DNA success patterns into Governance rules
    // If a certain DNA exploration bias consistently succeeds when gov allows it,
    // turn it into a formal "DNA_HYBRID" rule.
    const explorationSuccesses = reflections.filter(r => r.reflection_data.winner === 'DNA_OVERRIDE' && r.success_alignment > 0.8);
    if (explorationSuccesses.length > 5) {
        await PolicyGenerator.generateFromPattern(sessionId, {
            type: 'DNA_HYBRID_EXPLORATION',
            action: 'ALLOW',
            confidence: 0.85,
            traceId: explorationSuccesses[0].id
        });
    }

    // 4. Constitution Snapshot
    await PolicyEvolver.captureSnapshot(sessionId, rules);
  },

  captureSnapshot: async (sessionId: string, rules: any[]) => {
    await supabase.from('constitutional_snapshots').insert({
      session_id: sessionId,
      rule_set_snapshot: rules,
      performance_evaluation: {
        total_rules: rules.length,
        average_effectiveness: rules.reduce((acc, r) => acc + r.effectiveness_score, 0) / rules.length
      }
    });
  }
};
