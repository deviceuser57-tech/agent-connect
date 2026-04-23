import React, { useState, useEffect } from 'react';
import { supabaseCompat as supabase } from '@/integrations/supabase/cmack-compat';

/**
 * ConsensusMonitor (PHASE 10)
 * Responsibilities: Real-time visualization of multi-agent voting and consensus.
 */
export const ConsensusMonitor = ({ sessionId }: { sessionId: string }) => {
  const [negotiations, setNegotiations] = useState<any[]>([]);

  useEffect(() => {
    const fetchNegotiations = async () => {
      const { data } = await supabase
        .from('collective_negotiations')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(5);
      setNegotiations(data || []);
    };

    fetchNegotiations();

    const sub = supabase.channel('consensus-stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collective_negotiations', filter: `session_id=eq.${sessionId}` }, () => {
        fetchNegotiations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [sessionId]);

  if (negotiations.length === 0) return null;

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
      <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">Collective Consensus</h3>
      <div className="space-y-4">
        {negotiations.map((neg) => {
          const votes = neg.votes || {};
          const agents = Object.keys(votes);
          const approvals = Object.values(votes).filter(v => v === true).length;
          
          return (
            <div key={neg.id} className="p-3 bg-black/40 border border-slate-800 rounded flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono text-cyan-500 uppercase mb-1">State: {neg.proposed_state}</div>
                <div className="flex gap-1">
                  {agents.length > 0 ? (
                    agents.map(id => (
                      <div 
                        key={id} 
                        className={`w-2 h-2 rounded-full ${votes[id] ? 'bg-emerald-500' : 'bg-red-500'}`} 
                        title={`Agent ${id}`}
                      />
                    ))
                  ) : (
                    <span className="text-[9px] font-mono text-slate-600 italic">Waiting for votes...</span>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <div className={`text-xs font-mono font-bold ${neg.consensus_met ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {neg.consensus_met ? 'VALIDATED' : 'VOTING'}
                </div>
                <div className="text-[9px] font-mono text-slate-600">{approvals}/{agents.length || '?'} Approval</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
