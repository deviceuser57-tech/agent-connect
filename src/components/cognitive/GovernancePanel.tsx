import React, { useState, useEffect } from 'react';
import { supabaseCompat as supabase } from '@/integrations/supabase/cmack-compat';

/**
 * GovernancePanel (GRAVITY v1.4 - Conflict Resolution)
 * Responsibilities: Visualizing dual-intelligence authority and arbitration outcomes.
 */
export const GovernancePanel = ({ sessionId }: { sessionId: string }) => {
  const [traces, setTraces] = useState<any[]>([]);
  const [govState, setGovState] = useState<any>(null);
  const [conflicts, setConflicts] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: traceData } = await supabase.from('governance_traces').select('*').eq('session_id', sessionId).order('timestamp', { ascending: false }).limit(5);
      setTraces(traceData || []);

      const { data: stateData } = await supabase.from('governance_state').select('*').eq('session_id', sessionId).single();
      setGovState(stateData);

      const { data: conflictData } = await supabase.from('conflict_logs').select('*').eq('session_id', sessionId).order('timestamp', { ascending: false }).limit(3);
      setConflicts(conflictData || []);
    };

    fetchData();

    const sub = supabase.channel('gov-dual-intel').on('postgres_changes', { event: '*', schema: 'public', table: 'governance_state', filter: `session_id=eq.${sessionId}` }, () => fetchData()).subscribe();
    const conflictSub = supabase.channel('gov-conflicts').on('postgres_changes', { event: '*', schema: 'public', table: 'conflict_logs', filter: `session_id=eq.${sessionId}` }, () => fetchData()).subscribe();

    return () => {
      supabase.removeChannel(sub);
      supabase.removeChannel(conflictSub);
    };
  }, [sessionId]);

  const getConflictColor = (type: string) => {
    switch (type) {
      case 'EXPLORATION_CONFLICT': return 'text-cyan-400';
      case 'RISK_CONFLICT': return 'text-red-400';
      default: return 'text-amber-400';
    }
  };

  const adpFactor = (govState?.adaptability_factor || 0.5) * 100;
  const safeFactor = (govState?.safety_factor || 0.5) * 100;

  return (
    <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-3xl relative overflow-hidden">
      {/* AUTHORITY BALANCE HEADER */}
      <div className="mb-6">
        <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-ping shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
          🛡️ Dual-Intelligence v1.4
        </h3>
        
        <div className="space-y-2">
           <div className="flex justify-between text-[9px] font-mono mb-1">
              <span className="text-cyan-500 uppercase font-bold">Adaptability (DNA)</span>
              <span className="text-slate-500 uppercase font-bold">Safety (GOV)</span>
           </div>
           <div className="h-2 w-full bg-slate-900 rounded-full flex overflow-hidden border border-slate-800">
              <div className="h-full bg-cyan-600 transition-all duration-700" style={{ width: `${adpFactor}%` }} />
              <div className="h-full bg-red-900 transition-all duration-700" style={{ width: `${safeFactor}%` }} />
           </div>
           <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>{adpFactor.toFixed(0)}% TRUST</span>
              <span>{safeFactor.toFixed(0)}% TRUST</span>
           </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* CONFLICT MONITOR (WAR ROOM) */}
        {conflicts.length > 0 && (
          <div className="space-y-2">
            <label className="text-[9px] font-mono text-slate-600 uppercase font-bold">Realtime Conflict Arbitration</label>
            <div className="space-y-2">
              {conflicts.map((c) => (
                <div key={c.id} className="p-2.5 bg-red-950/20 border border-red-900/30 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-[9px] font-mono font-bold ${getConflictColor(c.type)}`}>{c.type}</span>
                    <span className="text-[10px] font-mono text-slate-500">SEVERITY: {c.severity.toFixed(2)}</span>
                  </div>
                  <div className="text-[9px] font-mono text-slate-400 italic">
                     Decision: <span className="text-white not-italic">{c.final_arbitration?.arbitrationReason}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RECENT TRACES FEED */}
        <div className="space-y-2">
          <label className="text-[9px] font-mono text-slate-600 uppercase font-bold">Decision Integrity Stream</label>
          <div className="space-y-1">
            {traces.map((trace) => (
              <div key={trace.id} className="text-[10px] font-mono flex justify-between items-center py-1.5 border-b border-slate-900/50 last:border-0 opacity-80 hover:opacity-100 transition-opacity">
                <div className="flex gap-2">
                  <span className="text-slate-500">[{trace.user_role}]</span>
                  <span className="text-slate-200">{trace.action}</span>
                </div>
                <div className={trace.is_blocked ? 'text-red-500' : 'text-emerald-500'}>
                  {trace.is_blocked ? 'HALT' : 'GO'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SYSTEM STATUS */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-900">
           <div>
             <label className="block text-[8px] text-slate-600 uppercase font-mono">Arbitration Mode</label>
             <span className="text-[10px] font-mono text-emerald-500/80 uppercase tracking-tighter">CONTEXTUALV4</span>
           </div>
           <div className="text-right">
             <label className="block text-[8px] text-slate-600 uppercase font-mono">Balance State</label>
             <span className="text-[10px] font-mono text-slate-400">ACTIVE_LEARNING</span>
           </div>
        </div>
      </div>
    </div>
  );
};
