import { supabaseCompat as supabase } from '@/integrations/supabase/cmack-compat';
import { ICOS_CONSTITUTION } from '../constitution/icos.constitution';
import { MemoryGraphEngine } from './memory-graph';

/**
 * DynamicDNAEngine - CMACK v2.4 (Behavior-Bounded Kernel)
 */
export const DynamicDNAEngine = {
  fetchActiveDNA: async (sessionId: string) => {
    const subgraph = await MemoryGraphEngine.getWeightedSubgraph(sessionId, 50);
    
    // Normalized Weight Logic
    let weightedSum = 0;
    let factorSum = 0;
    
    subgraph.forEach(node => {
      const factor = (node.severity_factor || 1.0) * (node.effectiveWeight / (node.weight || 1.0) || 1.0);
      weightedSum += (node.weight || 0) * factor;
      factorSum += factor;
    });

    const normalizedWeight = factorSum > 0 ? weightedSum / factorSum : 0;
    
    // Fetch DB Traits
    const { data: dbDna } = await supabase
      .from('cognitive_dna')
      .select('trait_key, trait_value')
      .eq('is_active', true);

    const activeDNA = { ...ICOS_CONSTITUTION.traits };
    dbDna?.forEach(item => {
      if (item.trait_key in activeDNA) {
        (activeDNA as any)[item.trait_key] = Number(item.trait_value);
      }
    });

    // 1. DNA Guard Rails (PHASE 9 STRICT BOUNDING)
    const baseline = (activeDNA as any).risk_tolerance || 0.2;
    const derived = baseline * (1 - normalizedWeight);
    (activeDNA as any).risk_tolerance = Math.min(Math.max(derived, 0.1), 0.7); // Clamped MAX 0.7

    return activeDNA;
  },

  updateBias: async (recentTraces: any[]) => {
    if (recentTraces.length < 10) return;

    const avgDeviation = recentTraces.reduce((acc, t) => acc + (t.deviation || 0), 0) / recentTraces.length;
    
    if (avgDeviation > 0.15) {
      let weightedBiasSum = 0;
      let decaySum = 0;
      const lambda = 0.0001;
      const now = new Date().getTime();

      recentTraces.forEach(t => {
        const dt = now - new Date(t.created_at).getTime();
        const decay = Math.exp(-lambda * dt);
        weightedBiasSum += (t.bias || 0) * decay;
        decaySum += decay;
      });

      const weightedBias = decaySum > 0 ? weightedBiasSum / decaySum : 0;

      // 2. Controlled Adaptation (Drift + Clamping)
      const { data: current } = await supabase.from('cognitive_dna').select('*').eq('trait_key', 'risk_tolerance').single();
      if (current) {
        const candidate = Number(current.trait_value) + weightedBias;
        
        // ±10% Drift rule
        const drifted = Math.min(Math.max(candidate, current.trait_value * 0.9), current.trait_value * 1.1);
        
        // Hard Bounding Clamp
        const boundedValue = Math.min(Math.max(drifted, 0.1), 0.7);
        
        await supabase.from('cognitive_dna').update({ trait_value: boundedValue }).eq('trait_key', 'risk_tolerance');
      }
    }
  }
};
