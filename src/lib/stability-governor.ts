import { supabaseCompat as supabase } from '@/integrations/supabase/cmack-compat';
import { ESGL_CONSTANTS } from '../constitution/icos.constitution';

/**
 * StabilityGovernor (ESGL v1.0)
 * Responsibilities: Prevent Hyper-Evolution and Trait Drift
 */
export const StabilityGovernor = {
  validateMutationSafety: async (traitKey: string, currentValue: number, proposedValue: number) => {
    // 1. Check Cooldown
    const { data: lastMutation } = await supabase
      .from('architecture_change_log')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastMutation) {
      const timeSinceLast = new Date().getTime() - new Date(lastMutation.created_at).getTime();
      if (timeSinceLast < ESGL_CONSTANTS.MIN_COOLDOWN_MS) {
        return { safe: false, reason: 'ESGL_COOLDOWN_ACTIVE: System cooling down.' };
      }
    }

    // 2. Check Variance (prevent radical mutation)
    const variance = Math.abs(currentValue - proposedValue) / (currentValue || 1);
    if (variance > ESGL_CONSTANTS.MAX_TRAIT_VARIANCE) {
      return { safe: false, reason: `ESGL_VARIANCE_VIOLATION: Mutation too radical (${(variance * 100).toFixed(2)}%).` };
    }

    return { safe: true };
  }
};
