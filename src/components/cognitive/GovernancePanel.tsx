import React, { useState, useEffect } from 'react';
import { supabaseCompat as supabase } from '@/integrations/supabase/cmack-compat';
import { runKernelIntegrityTest } from '@/lib/test-governance-e2e';

/**
 * GovernancePanel (GRAVITY v2.0 - CZTEA Execution Architecture)
 * Responsibilities: Real-time visualization of cognitive legal evolution and zero-trust security.
 */
export const GovernancePanel = ({ sessionId }: { sessionId: string }) => {
  const [activeTab, setActiveTab] = useState<'PERF' | 'CONST' | 'SEC'>('PERF');
  const [traces, setTraces] = useState<any[]>([]);
  const [govState, setGovState] = useState<any>(null);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Performance Data
      const { data: traceData } = await supabase.from('governance_traces').select('*').eq('session_id', sessionId).order('timestamp', { ascending: false }).limit(8);
      setTraces(traceData || []);

      const { data: stateData } = await supabase.from('governance_state').select('*').eq('session_id', sessionId).single();
      setGovState(stateData);

      const { data: conflictData } = await supabase.from('conflict_logs').select('*').eq('session_id', sessionId).order('timestamp', { ascending: false }).limit(5);
      setConflicts(conflictData || []);

      // 2. Constitution Data
      const { data: ruleData } = await supabase.from('governance_rules').select('*').eq('session_id', sessionId).order('priority', { ascending: false });
      setRules(ruleData || []);

      // 3. Security Data
      const { data: roleData } = await supabase.from('user_roles').select('*');
      setRoles(roleData || []);
    };

    fetchData();

    const subs = [
      supabase.channel('gov-state').on('postgres_changes', { event: '*', schema: 'public', table: 'governance_state', filter: `session_id=eq.${sessionId}` }, () => fetchData()).subscribe(),
      supabase.channel('gov-rules').on('postgres_changes', { event: '*', schema: 'public', table: 'governance_rules', filter: `session_id=eq.${sessionId}` }, () => fetchData()).subscribe(),
      supabase.channel('gov-traces').on('postgres_changes', { event: '*', schema: 'public', table: 'governance_traces', filter: `session_id=eq.${sessionId}` }, () => fetchData()).subscribe(),
      supabase.channel('user-roles').on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => fetchData()).subscribe()
    ];

    return () => {
      subs.forEach(s => supabase.removeChannel(s));
    };
  }, [sessionId]);

  const handleTest = async () => {
    setIsTesting(true);
    await runKernelIntegrityTest(sessionId);
    setIsTesting(false);
  };

  const adpFactor = (govState?.adaptability_factor || 0.5) * 100;
  const safeFactor = (govState?.safety_factor || 0.5) * 100;
  const shadowAlerts = traces.filter(t => t.violation_flag);

  return (
    <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-3xl relative overflow-hidden text-slate-300">
      
      {/* 🛑 SHADOW ALERT BANNER */}
      {shadowAlerts.length > 0 && (
        <div className="absolute top-0 left-0 w-full h-1 bg-red-600 animate-pulse shadow-[0_0_15px_rgba(220,38,38,1)] z-10" />
      )}

      {/* HEADER & TABS */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2">
            <span className={`w-2 h-2 ${shadowAlerts.length > 0 ? 'bg-red-500 animate-ping' : 'bg-emerald-500'} rounded-full`} />
            🧠 Gravity Control v2.0
          </h3>
          <div className="flex gap-4 font-mono text-[10px] uppercase">
             <button onClick={() => setActiveTab('PERF')} className={`${activeTab === 'PERF' ? 'text-cyan-400 border-b border-cyan-400' : 'text-slate-600'} pb-1`}>Performance</button>
             <button onClick={() => setActiveTab('CONST')} className={`${activeTab === 'CONST' ? 'text-amber-400 border-b border-amber-400' : 'text-slate-600'} pb-1`}>Constitution</button>
             <button onClick={() => setActiveTab('SEC')} className={`${activeTab === 'SEC' ? 'text-red-400 border-b border-red-400' : 'text-slate-600'} pb-1`}>Security (Zero-Trust)</button>
          </div>
        </div>
        <button 
          onClick={handleTest} 
          disabled={isTesting}
          className="bg-slate-900 border border-slate-800 p-2 rounded hover:bg-slate-800 transition-all text-[9px] font-mono text-slate-400 uppercase tracking-tighter"
        >
          {isTesting ? 'Analyzing...' : 'Run Integrity Scan'}
        </button>
      </div>

      <div className="min-h-[300px]">
        {/* --- TAB 1: PERFORMANCE --- */}
        {activeTab === 'PERF' && (
          <div className="space-y-6">
            <div className="space-y-2">
               <div className="flex justify-between text-[9px] font-mono mb-1">
                  <span className="text-cyan-500 uppercase font-bold">DNA (Innovation)</span>
                  <span className="text-red-500 uppercase font-bold">Governance (Enforcement)</span>
               </div>
               <div className="h-1.5 w-full bg-slate-900 rounded-full flex overflow-hidden">
                  <div className="h-full bg-cyan-600 transition-all duration-700" style={{ width: `${adpFactor}%` }} />
                  <div className="h-full bg-red-900 transition-all duration-700" style={{ width: `${safeFactor}%` }} />
               </div>
               <div className="flex justify-between text-[9px] font-mono text-slate-600">
                  <span>{adpFactor.toFixed(1)}% ADAPTABILITY</span>
                  <span>{safeFactor.toFixed(1)}% STABILITY</span>
               </div>
            </div>

            <div className="space-y-2 pt-4">
              <label className="text-[9px] font-mono text-slate-600 uppercase font-bold">Trace Stream</label>
              <div className="space-y-1">
                {traces.map((trace) => (
                  <div key={trace.id} className={`text-[10px] font-mono flex justify-between items-center p-2 rounded ${trace.violation_flag ? 'bg-red-950/20 border-l-2 border-red-600' : 'border-b border-slate-900/50'}`}>
                    <div className="flex gap-2 min-w-0">
                      <span className="text-slate-500">[{trace.user_role}]</span>
                      <span className="text-slate-200 truncate">{trace.action}</span>
                      {trace.violation_flag && <span className="text-red-500 font-bold bg-red-600/10 px-1 border border-red-600/20 animate-pulse">SHADOW_DETECTED</span>}
                    </div>
                    <div className={trace.is_blocked ? 'text-red-500' : 'text-emerald-500'}>
                      {trace.is_blocked ? 'BLOCKED' : 'AUTH_GO'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 2: CONSTITUTION --- */}
        {activeTab === 'CONST' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <label className="text-[9px] font-mono text-slate-600 uppercase font-bold">Evolved Dynamic Ruleset</label>
              <span className="text-[9px] font-mono text-slate-500">Active Rules: {rules.length}</span>
            </div>
            {rules.map((rule) => (
              <div key={rule.id} className="p-3 bg-slate-900/40 border border-slate-800 rounded flex justify-between items-center group hover:border-amber-900/50 transition-colors">
                <div className="min-w-0 flex-1 px-2 border-l border-amber-600/30">
                  <div className="text-[10px] font-mono text-amber-500 uppercase font-bold">Rule_{rule.id.slice(0,4)}</div>
                  <div className="text-[9px] text-slate-400 font-mono italic truncate">IF {rule.condition_type} == {JSON.stringify(rule.condition_value)} THEN {rule.action}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono text-emerald-500">{(rule.effectiveness_score * 100).toFixed(0)}% Eff</div>
                  <div className="text-[9px] font-mono text-slate-600">v{rule.priority}</div>
                </div>
              </div>
            ))}
            {rules.length === 0 && <div className="text-center py-20 text-[10px] text-slate-600 font-mono italic">Constitution awaiting initial generation cycle...</div>}
          </div>
        )}

        {/* --- TAB 3: SECURITY (ZERO-TRUST) --- */}
        {activeTab === 'SEC' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="text-[9px] font-mono text-slate-600 uppercase font-bold">User Role Hierarchy</label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map((role) => (
                  <div key={role.id} className="p-2.5 bg-slate-900/60 border border-slate-800 rounded flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 truncate">{role.user_id.slice(0,10)}...</span>
                    <span className="text-[10px] font-mono text-red-500 font-bold uppercase py-0.5 px-2 bg-red-600/5 border border-red-600/20">{role.role}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <label className="text-[9px] font-mono text-slate-600 uppercase font-bold">Security Violation Alerts</label>
              <div className="space-y-1">
                {shadowAlerts.length > 0 ? (
                  shadowAlerts.map(alert => (
                    <div key={alert.id} className="p-3 bg-red-950/30 border border-red-600/50 rounded flex gap-4 items-center animate-pulse">
                      <div className="w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-[10px] font-bold">!</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-red-500 font-mono uppercase">Unauthorized DB Mutation</div>
                        <div className="text-[9px] text-slate-400 font-mono italic truncate">Bypass Attempt in {alert.action} (Ref: {alert.id.slice(0,6)})</div>
                      </div>
                    </div>
                  ))
                ) : (
                   <div className="flex flex-col items-center justify-center py-12 border border-dashed border-slate-800 rounded opacity-30">
                      <div className="w-6 h-6 border rounded-full border-slate-600 mb-2" />
                      <span className="text-[9px] font-mono text-slate-500 uppercase">Perimeter Secure - No Violations</span>
                   </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SYSTEM STATUS FOOTER */}
      <div className="flex justify-between items-center pt-6 mt-6 border-t border-slate-900 font-mono">
         <div className="flex gap-4">
           <div>
             <label className="block text-[8px] text-slate-600 uppercase">Kernel Auth</label>
             <span className="text-[9px] text-emerald-500 uppercase tracking-tighter">Verified_CZTEA_v2.0</span>
           </div>
           <div>
             <label className="block text-[8px] text-slate-600 uppercase">Mode</label>
             <span className="text-[9px] text-slate-400 uppercase tracking-tighter">{govState?.current_mode || 'STABILIZING...'}</span>
           </div>
         </div>
         <div className="text-right">
            <div className="text-[9px] text-slate-600 uppercase tracking-tighter">Session Trace Record</div>
            <div className="text-[9px] text-slate-400">{sessionId.slice(0, 16)}...</div>
         </div>
      </div>
    </div>
  );
};
