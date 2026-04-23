import React from 'react';
import { StatePanel } from './StatePanel';
import { CausalGraph } from './CausalGraph';
import { ConsensusMonitor } from './ConsensusMonitor';
import { GovernancePanel } from './GovernancePanel';
import { ExecutionInterface } from '../../lib/execution-interface';

/**
 * CognitiveDashboard (PHASE 10 - Hardened Kernel)
 * The primary interactive interface for CMACK v2.4.
 */
export const CognitiveDashboard = ({ sessionId }: { sessionId: string }) => {
  return (
    <div className="min-h-screen bg-[#050608] p-4 lg:p-8 font-sans antialiased text-slate-200">
      <div className="max-w-[1600px] mx-auto grid grid-cols-12 gap-6 lg:gap-8">
        
        {/* LEFTSIDE: COGNITIVE OVERVIEW */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent italic">CMACK v2.4 KERNEL</h1>
          </div>

          <StatePanel sessionId={sessionId} />
          
          <GovernancePanel sessionId={sessionId} />

          <ConsensusMonitor sessionId={sessionId} />

          <div className="p-6 bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl">
            <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">Manual Intervention</h3>
            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={() => ExecutionInterface.executeAction(sessionId, 'START_WORKFLOW', { currentState: 'IDLE' })}
                className="group relative p-3 bg-cyan-600/10 border border-cyan-500/30 hover:bg-cyan-600/20 text-cyan-400 rounded font-mono text-xs font-bold transition-all overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                INIT_SEQUENCE(PHASE_START)
              </button>
              <button 
                onClick={() => ExecutionInterface.executeAction(sessionId, 'FORCE_UNLOCK', { currentState: 'PHASE_LOCKED' })}
                className="p-3 border border-slate-700 hover:bg-slate-800 text-slate-400 rounded font-mono text-xs transition-all"
              >
                KERNEL_EMERGENCY_UNLOCK()
              </button>
            </div>
          </div>
        </div>

        {/* CENTER/RIGHT: VISUALIZATION & TIMELINE */}
        <div className="col-span-12 lg:col-span-8 bg-slate-900/20 border border-slate-800/50 rounded-2xl flex flex-col overflow-hidden backdrop-blur-xl">
          <div className="border-b border-slate-800 p-4 bg-slate-900/50 flex justify-between items-center">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-cyan-500" />
              Causal Graph Projection
            </div>
            <div className="text-[10px] font-mono text-slate-500">REALTIME_STREAM_v0.92</div>
          </div>
          <div className="flex-1 min-h-[600px]">
            <CausalGraph sessionId={sessionId} />
          </div>
        </div>

      </div>
    </div>
  );
};
