import { supabaseCompat as supabase } from '@/integrations/supabase/cmack-compat';

/**
 * CollectiveNegotiator (Phase 6)
 * Responsibilities: Cross-kernel consensus and collaborative decision evaluation
 */
export const CollectiveNegotiator = {
  proposeStateChange: async (sessionId: string, agentId: string, newState: string) => {
    const { data, error } = await supabase
      .from('collective_negotiations')
      .insert({ session_id: sessionId, proposer_agent_id: agentId, proposed_state: newState })
      .select()
      .single();
    
    return data;
  },

  submitVote: async (negotiationId: string, voterAgentId: string, approve: boolean) => {
    // 1. Fetch current votes
    const { data: neg } = await supabase
      .from('collective_negotiations')
      .select('votes')
      .eq('id', negotiationId)
      .single();
    
    const updatedVotes = { ...((neg?.votes as any) || {}), [voterAgentId]: approve };

    // 2. Check Consensus (Threshold = 100% for Phase 6 initial release)
    const voteValues = Object.values(updatedVotes);
    const consensusMet = voteValues.length >= 2 && voteValues.every(v => v === true);

    await supabase
      .from('collective_negotiations')
      .update({ votes: updatedVotes, consensus_met: consensusMet })
      .eq('id', negotiationId);

    return { consensusMet };
  }
};
