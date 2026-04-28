import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Activity, GitBranch, RefreshCw, Lock, Cpu, Clock, AlertCircle, CheckCircle2, ChevronRight, TrendingUp, Layers
} from 'lucide-react';
import { supabaseCompat as supabase } from '@/integrations/supabase/cmack-compat';
import { ExecutionOrchestrator, MEIS } from '@/lib/meis-runtime';
import { PreflightCompiler } from '@/lib/meis-preflight';

const GovernanceDashboard: React.FC = () => {
  const [session, setSession] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [status, setStatus] = useState<string>('IDLE');
  const [loading, setLoading] = useState(false);

  // Fetch real-time logs from Supabase
  useEffect(() => {
    if (!session) return;

    const fetchLogs = async () => {
      const { data } = await supabase
        .from('governance_traces')
        .select('*')
        .eq('execution_id', session)
        .order('created_at', { ascending: true });
      if (data) setLogs(data);
    };

    fetchLogs();

    const channel = supabase
      .channel('governance_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'governance_traces', filter: `execution_id=eq.${session}` }, 
      (payload) => {
        setLogs(prev => [...prev, payload.new]);
        if (payload.new.event_type === 'STATUS_TRANSITION') {
          setStatus(payload.new.metadata.status);
        }
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [session]);

  const triggerExecution = async () => {
    setLoading(true);
    const sessionId = `exec_${Date.now()}`;
    setSession(sessionId);
    setLogs([]);

    const meis: MEIS = {
      id: 'meis_production_001',
      constitution_signature: 'VALID_SIGNATURE_AC008',
      operational_layer: { topology: 'MESH' },
      step_sequence: [
        { id: 'step_1', action: 'DATA_INGEST', depends_on: [], metadata: { projectedRisk: 0.1 } },
        { id: 'step_2', action: 'TRANSFORM', depends_on: ['step_1'], metadata: { projectedRisk: 0.2 } },
        { id: 'step_3', action: 'FINAL_COMMIT', depends_on: ['step_2'], metadata: { projectedRisk: 0.1 } }
      ]
    };

    try {
      // Real Preflight
      await PreflightCompiler.simulate(sessionId, meis, {});
      
      // Real Execution
      const orch = new ExecutionOrchestrator(meis);
      await orch.run();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
            Cognitive Kernel Monitor
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <div className={`w-2 h-2 rounded-full ${status === 'EXECUTING' ? 'bg-blue-500 animate-pulse' : status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-gray-700'}`} />
            <span className="text-xs font-mono text-gray-500">SESSION: {session || 'NO_ACTIVE_SESSION'}</span>
          </div>
        </div>
        <button 
          onClick={triggerExecution}
          disabled={loading}
          className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4 text-blue-500" />}
          Execute MEIS Pipeline
        </button>
      </header>

      <div className="grid grid-cols-12 gap-8">
        {/* Execution Timeline */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8">
            <h2 className="text-xl font-semibold mb-8 flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-500" />
              Real-time Execution Trace
            </h2>
            <div className="space-y-6">
              {logs.filter(l => l.event_type === 'STEP_EXECUTION').map((log, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={log.id}
                  className="flex gap-6 items-start"
                >
                  <div className="flex flex-col items-center">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    {i < logs.length - 1 && <div className="w-[1px] h-12 bg-white/10 my-2" />}
                  </div>
                  <div className="flex-1 p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-mono text-sm text-white">{log.step_id}</div>
                        <div className="text-[10px] text-gray-500 uppercase mt-1">STATUS: {log.metadata.status}</div>
                      </div>
                      <span className="text-[10px] font-mono text-gray-600">{new Date(log.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
              {logs.length === 0 && (
                <div className="py-20 text-center text-gray-600 italic">No execution data in current session.</div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Status */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-3">
              <Shield className="w-5 h-5 text-emerald-500" />
              System Integrity
            </h3>
            <div className="space-y-4">
              <StatusRow label="Execution Gating" status="ACTIVE" color="emerald" />
              <StatusRow label="Constitution Lock" status="SEALED" color="amber" />
              <StatusRow label="CEC Validation" status="STRICT" color="blue" />
            </div>
          </div>

          <div className="p-8 bg-white/[0.02] border border-white/5 rounded-3xl">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-3">
              <Layers className="w-5 h-5 text-purple-500" />
              Topology Engine
            </h3>
            <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl">
              <div className="text-xs text-purple-500 font-bold mb-1 uppercase tracking-widest">Active Mode</div>
              <div className="text-xl font-mono">MESH (Parallel)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusRow = ({ label, status, color }: any) => (
  <div className="flex justify-between items-center py-3 border-b border-white/5">
    <span className="text-sm text-gray-500">{label}</span>
    <span className={`text-[10px] font-bold px-2 py-1 rounded bg-${color}-500/10 text-${color}-500 border border-${color}-500/20`}>{status}</span>
  </div>
);

export default GovernanceDashboard;
