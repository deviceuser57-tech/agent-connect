import { StabilityGovernor } from './stability-governor';

/**
 * MutationEngine (Phase 5 + ESGL v1.0)
 * Responsibilities: Propose and Apply Architecture Mutations
 */
export const MutationEngine = {
  applyMutation: async (reason: string, traitKey: string, newValue: any) => {
    // 1. ESGL Stability Check
    const { data: currentTrait } = await supabase
      .from('cognitive_dna')
      .select('trait_value')
      .eq('trait_key', traitKey)
      .single();

    const stabilityResult = await StabilityGovernor.validateMutationSafety(
      traitKey, 
      Number(currentTrait?.trait_value || 0), 
      Number(newValue)
    );

    if (!stabilityResult.safe) {
      console.error(`Mutation rejected by ESGL: ${stabilityResult.reason}`);
      return null;
    }

    // 2. Simulation Check
    const simResults = simulateScenario('nominal');
    const isStable = !simResults.some(log => log.includes('false'));

    if (!isStable) {
      console.error('Mutation rejected: Simulation instability detected.');
      return null;
    }

    // 2. Commit mutation to Dynamic DNA
    const { data, error } = await supabase
      .from('cognitive_dna')
      .update({ trait_value: newValue, updated_at: new Date().toISOString() })
      .eq('trait_key', traitKey)
      .select()
      .single();

    if (!error) {
      // 3. Log into Architecture Evolution Trace
      await supabase.from('architecture_change_log').insert({
        reason,
        affected_modules: ['cognitive_dna', 'gec'],
        before_hash: 'v_prev',
        after_hash: `v_${data.version}`
      });
    }

    return data;
  }
};
