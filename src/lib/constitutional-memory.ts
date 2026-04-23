import { supabaseCompat as supabase } from '@/integrations/supabase/cmack-compat';

/**
 * CONSTITUTIONAL MEMORY (GRAVITY v1.6)
 * Responsibilities: Maintaining the lineage and lineage of evolved governing laws.
 */
export const ConstitutionalMemory = {
  
  getHistory: async (sessionId: string) => {
    return await supabase
      .from('policy_evolution_logs')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: false });
  },

  getSnapshots: async (sessionId: string) => {
    return await supabase
      .from('constitutional_snapshots')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: false });
  }
};
