import { MemoryGraphEngine } from './memory-graph';

/**
 * SelfCorrectionEngine - Phase 8 v1.3 (Cluster Detection)
 */
export const SelfCorrectionEngine = {
  analyzeSystemicFailures: async (sessionId: string) => {
    const subgraph = await MemoryGraphEngine.getWeightedSubgraph(sessionId, 20);
    
    if (subgraph.length < 5) return { recommend_mutation: false };

    // Group by causal parent (simplified to same state path)
    const paths: Record<string, any[]> = {};
    subgraph.forEach(node => {
      const key = node.state;
      if (!paths[key]) paths[key] = [];
      paths[key].push(node);
    });

    for (const state in paths) {
      const pathNodes = paths[state];
      
      // 1. Cluster Min Size
      if (pathNodes.length < 5) continue;

      // 2. Same Path Ratio
      const samePathRatio = pathNodes.length / subgraph.length;
      if (samePathRatio <= 0.7) continue;

      // 3. Average Weight (Severity)
      const avgWeight = pathNodes.reduce((acc, n) => acc + (n.weight || 0), 0) / pathNodes.length;
      if (avgWeight <= 0.7) continue;

      // 4. Time Window (Short Window: < 5 minutes)
      const times = pathNodes.map(n => new Date(n.created_at).getTime());
      const windowMs = Math.max(...times) - Math.min(...times);
      const windowThreshold = 5 * 60 * 1000; // 5 minutes

      if (windowMs < windowThreshold) {
        return {
          recommend_mutation: true,
          reason: `CLUSTER_DETECTED: Path ${state} exceeds density threshold (${samePathRatio.toFixed(2)}) with severity ${avgWeight.toFixed(2)}.`,
          target_trait: 'risk_tolerance',
          adjustment: -0.05
        };
      }
    }

    return { recommend_mutation: false };
  }
};
