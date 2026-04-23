import React, { useState, useEffect } from 'react';
import { supabaseCompat as supabase } from '@/integrations/supabase/cmack-compat';

/**
 * StatePanel Component (EIL v1.2 - Behavior Control Patch)
 * Responsibilities: Real-time visualization of Risk, DNA, and Behavioral Stability.
 */
export const StatePanel = ({ sessionId }: { sessionId: string }) => {
  const [state, setState] = useState<any>(null);
  const [dna, setDna] = useState<any>({});
  const [lastTrace, setLastTrace] = useState<any>(null);
  const [mutationRate, setMutationRate] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const { data: stateData } = await supabase.from('system_state').select('*').eq('session_id', sessionId).single();
      setState(stateData);

      const { data: dnaData } = await supabase.from('cognitive_dna').select('*').eq('is_active', true);
      const dnaMap = dnaData?.reduce((acc: any, item) => ({ ...acc, [item.trait_key]: item.trait_value }), {}) || {};
      setDna(dnaMap);

      const { data: traceData } = await supabase.from('execution_traces')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      setLastTrace(traceData);

      // Fetch mutation rate (last 10 steps)
      const { data: recentTraces } = await supabase.from('execution_traces').select('created_at').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(10);
      if (recentTraces && recentTraces.length > 0) {
        const { count } = await supabase
          .from('architecture_change_log')
          .select('*', { count: 'exact', head: true })
          .eq('change_type', 'DNA_MUTATION')
          .gte('created_at', recentTraces[recentTraces.length - 1].created_at);
        setMutationRate(count || 0);
      }
    };

    fetchData();

    const stateSub = supabase.channel('system-state').on('postgres_changes', { event: '*', schema: 'public', table: 'system_state', filter: `session_id=eq.${sessionId}` }, (p) => setState(p.new)).subscribe();
    const dnaSub = supabase.channel('dna-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'cognitive_dna' }, () => fetchData()).subscribe();
    const traceSub = supabase.channel('trace-changes').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'execution_traces', filter: `session_id=eq.${sessionId}` }, () => fetchData()).subscribe();

    return () => {
      supabase.removeChannel(stateSub);
      supabase.removeChannel(dnaSub);
      supabase.removeChannel(traceSub);
    };
  }, [sessionId]);

  if (!state) return <div className="p-4 animate-pulse">Initializing Brain...</div>;

  const projectedRisk = lastTrace?.predicted_risk || 0;
  const riskLimit = Number(dna.risk_tolerance) || 0.4;
  const isRejected = projectedRisk > riskLimit;
  
  const behaviorFlag = lastTrace?.behavior_flag || 'STABLE';
  const stabilityScore = lastTrace?.stability_score || 1.0;

  const getBehaviorColor = (flag: string) => {
    if (flag === 'OVER_CONSERVATIVE') return 'text-yellow-500';
    if (flag === 'OVER_RISKY') return 'text-red-500';
    return 'text-emerald-500';
  };

  return (
    <div className="space-y-4">
      {/* 🧠 Risk Monitor */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl">
        <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">Risk Monitor</h3>
        <div className="flex justify-between items-end mb-2">
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold">Projected Risk</label>
            <div className={`text-2xl font-mono font-bold ${projectedRisk > riskLimit ? 'text-red-500' : 'text-emerald-400'}`}>
              {(projectedRisk * 100).toFixed(0)}%
            </div>
          </div>
          <div className="text-right">
            <label className="text-[10px] text-slate-400 uppercase font-bold">DNA Limit</label>
            <div className="text-xl font-mono text-slate-300">{(riskLimit * 100).toFixed(0)}%</div>
          </div>
        </div>
        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full transition-all ${isRejected ? 'bg-red-600' : 'bg-cyan-500'}`} style={{ width: `${projectedRisk * 100}%` }} />
        </div>
      </div>

      {/* 🛡️ Behavior Panel */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
        <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">Behavioral Control</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-slate-500 uppercase font-bold">Stability Score</span>
              <span className="text-slate-300 font-mono">{(stabilityScore * 100).toFixed(0)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${stabilityScore < 0.7 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                style={{ width: `${stabilityScore * 100}%` }} 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Status</label>
              <span className={`text-xs font-mono font-bold ${getBehaviorColor(behaviorFlag)}`}>{behaviorFlag}</span>
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Mutation Rate</label>
              <span className={`text-xs font-mono ${mutationRate > 2 ? 'text-red-500' : 'text-slate-300'}`}>
                {mutationRate}/10 steps
              </span>
            </div>
          </div>
          {lastTrace?.mutation_blocked && (
            <div className="p-2 bg-red-900/20 border border-red-900/50 rounded text-[9px] font-mono text-red-500 animate-pulse text-center">
              ⚠ MUTATION BLOCKED BY RATE LIMITER
            </div>
          )}
        </div>
      </div>

      {/* 🧬 DNA Panel */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
        <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">DNA State</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-[10px] text-slate-500 font-bold uppercase">Risk Tolerance</label>
            <span className="text-lg font-mono text-white">{Number(dna.risk_tolerance || 0).toFixed(3)}</span>
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] text-slate-500 font-bold uppercase">Max Loops</label>
            <span className="text-lg font-mono text-white">{dna.max_loops || 10}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
