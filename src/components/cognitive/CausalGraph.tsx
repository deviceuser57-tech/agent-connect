import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * CausalGraph Component (CMACK v2.4)
 * Responsibilities: Visualizing the causal memory graph and weight dynamics.
 */
export const CausalGraph = ({ sessionId }: { sessionId: string }) => {
  const [nodes, setNodes] = useState<any[]>([]);

  useEffect(() => {
    const fetchNodes = async () => {
      const { data } = await supabase
        .from('memory_graph_nodes')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(20);
      setNodes(data || []);
    };

    fetchNodes();

    const sub = supabase.channel('graph-nodes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'memory_graph_nodes', filter: `session_id=eq.${sessionId}` }, (payload) => {
        setNodes(prev => [payload.new, ...prev].slice(0, 20));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [sessionId]);

  const getWeightColor = (weight: number) => {
    if (weight > 0.7) return 'bg-red-500 shadow-red-500/50';
    if (weight > 0.4) return 'bg-amber-500 shadow-amber-500/50';
    return 'bg-cyan-500 shadow-cyan-500/50';
  };

  return (
    <div className="w-full h-full p-8 overflow-y-auto space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest">Causal Memory Stream</h3>
        <span className="text-[10px] font-mono text-slate-600">Active Nodes: {nodes.length}</span>
      </div>

      <div className="relative space-y-4">
        {nodes.map((node, i) => (
          <div 
            key={node.id} 
            className="group relative flex items-center gap-4 bg-slate-900/40 border border-slate-800 p-4 rounded-lg hover:border-slate-700 transition-all cursor-default"
          >
            {/* Causal Line */}
            {i < nodes.length - 1 && (
              <div className="absolute left-[22px] top-[100%] w-[1px] h-4 bg-slate-800" />
            )}

            {/* Weight Indicator */}
            <div className={`w-3 h-3 rounded-full shadow-lg ${getWeightColor(node.weight || 0)}`} />

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-mono text-cyan-400 font-bold">{node.state}</span>
                <span className="text-[9px] font-mono text-slate-600">Node ID: {node.id.slice(0, 8)}</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono line-clamp-1 italic">
                {node.event} → {JSON.stringify(node.payload).slice(0, 100)}...
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Effective Weight</div>
              <div className="text-xs font-mono font-bold text-slate-300">{( (node.weight || 0) * 100 ).toFixed(1)}%</div>
            </div>
          </div>
        ))}

        {nodes.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 grayscale opacity-50">
            <div className="w-12 h-12 border-2 border-dashed border-slate-700 rounded-full animate-spin mb-4" />
            <span className="text-xs font-mono text-slate-500 uppercase">Awaiting Cognitive Pulse...</span>
          </div>
        )}
      </div>
    </div>
  );
};
