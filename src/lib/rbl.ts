import { supabase } from '@/integrations/supabase/client';
import { SystemState } from '../constitution/icos.constitution';

/**
 * RBL (Runtime Binding Layer) - v2.0 Transactional
 * State Mutation Gateway via Supabase RPC
 */
export const commitState = async (
  sessionId: string, 
  validatedState: SystemState, 
  payload: any
) => {
  const { data, error } = await supabase.rpc('atomic_state_commit', {
    p_session_id: sessionId,
    p_next_state: validatedState,
    p_payload: payload,
    p_action: 'DCK_V2_ATOMIC_COMMIT'
  });

  if (error) {
    throw new Error(`RBL Atomic Commit Failed: ${error.message}`);
  }

  return data;
};
