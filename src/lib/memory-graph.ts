import { supabase } from '@/integrations/supabase/client';
import { DWE_CONSTANTS } from '../constitution/icos.constitution';

export interface GraphNode {
  id: string;
  state: string;
  weight: number;
  created_at: string;
  severity_factor: number;
  causal_parent?: string; // Runtime mapped property
  payload?: any;
}

/**
 * MemoryGraphEngine - v3.2 (Causal Reality Mapping)
 */
export const MemoryGraphEngine = {
  addNode: async (sessionId: string, state: string, payload: any, baseWeight: number, severity = 1.0) => {
    const contextMultiplier = (payload.dependencies?.length || 0) * 0.5 + 1.0;

    const { data: lastNode } = await supabase
      .from('memory_graph_nodes')
      .select('id')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const { data: node } = await supabase
      .from('memory_graph_nodes')
      .insert({ 
        session_id: sessionId, 
        state, 
        payload, 
        weight: baseWeight,
        severity_factor: severity,
        context_multiplier: contextMultiplier
      })
      .select()
      .single();

    if (node && lastNode) {
      await supabase.from('memory_graph_edges').insert({
        source_id: lastNode.id,
        target_id: node.id
      });
    }

    return node;
  },

  getWeightedSubgraph: async (sessionId: string, limit = 50) => {
    const { data: nodes } = await supabase
      .from('memory_graph_nodes')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (!nodes || nodes.length === 0) return [];

    // Step 2: Causal Mapping (Edges -> Propery)
    const nodeIds = nodes.map(n => n.id);
    const { data: edges } = await supabase
      .from('memory_graph_edges')
      .select('source_id, target_id')
      .in('target_id', nodeIds);

    const edgesMap: Record<string, string> = {};
    edges?.forEach(edge => {
      edgesMap[edge.target_id] = edge.source_id;
    });

    const now = new Date().getTime();
    return nodes.map(node => {
      const timeDiff = now - new Date(node.created_at).getTime();
      const decay = Math.exp(-DWE_CONSTANTS.DECAY_CONSTANT * timeDiff);
      const effectiveWeight = node.weight * node.severity_factor * (node.context_multiplier || 1.0) * decay;
      
      return { 
        ...node, 
        effectiveWeight,
        causal_parent: edgesMap[node.id] // Wired causal link
      };
    });
  }
};
