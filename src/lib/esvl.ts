import { MemoryGraphEngine } from './memory-graph';
import { DWE_CONSTANTS } from '../constitution/icos.constitution';

/**
 * ESVL Simulation Engine - v2.5 (Reality Grounded Causal Engine)
 */
export const simulateOutcome = async (
  sessionId: string,
  targetState: string,
  payload: any,
  mode: string = 'EXECUTION',
  chaosType: string = 'NONE'
): Promise<{ projectedRisk: number }> => {
  const subgraph = await MemoryGraphEngine.getWeightedSubgraph(sessionId, 50);
  
  if (subgraph.length === 0) return { projectedRisk: 0.1 };

  const now = new Date().getTime();
  const windowMs = 5 * 60 * 1000; // 5 minute temporal window

  const matches = subgraph.map(node => {
    const stateMatch = node.state === targetState ? 1.0 : 0.0;
    const modeMatch = node.payload?.mode === mode ? 1.0 : 0.0;
    const chaosMatch = node.payload?.chaosType === chaosType ? 1.0 : 0.0;
    
    const payloadKeys = Object.keys(payload);
    const nodeKeys = Object.keys(node.payload || {});
    const commonKeys = payloadKeys.filter(k => nodeKeys.includes(k));
    const payloadMatch = payloadKeys.length > 0 ? commonKeys.length / payloadKeys.length : 1.0;

    const score = (stateMatch * 0.3) + (modeMatch * 0.2) + (payloadMatch * 0.3) + (chaosMatch * 0.2);
    
    // Temporal Factor: Failures in the recent window
    const timeDiff = now - new Date(node.created_at).getTime();
    const temporalDecay = Math.exp(-DWE_CONSTANTS.DECAY_CONSTANT * timeDiff);
    const isRecentFailure = (node.weight > 0.7 && timeDiff < windowMs) ? 1.0 : 0.0;

    return { 
      score: Math.min(Math.max(score, 0), 1), 
      weight: node.weight || 0, 
      isRecentFailure,
      temporalDecay
    };
  });

  // 1. Time-Window Clustering
  const temporalClusterFactor = matches.reduce((acc, m) => acc + (m.isRecentFailure * m.temporalDecay), 0) / Math.max(matches.length, 1);

  // 2. Causal Chain Depth Scoring (Realization)
  let ancestorCount = 0;
  let chainDepthScore = 0;
  
  if (subgraph.length > 0) {
    const entryNode = [...subgraph]
      .map(n => {
        const payloadKeys = Object.keys(payload || {});
        const nodeKeys = Object.keys(n.payload || {});
        const commonKeys = payloadKeys.filter(k => nodeKeys.includes(k));
        const payloadMatch = payloadKeys.length > 0 ? (commonKeys.length / payloadKeys.length) : 1.0;
        
        const stateMatch = n.state === targetState ? 1.0 : 0.0;
        const timeDiff = now - new Date(n.created_at).getTime();
        
        const matchScore = (stateMatch * 100) + (payloadMatch * 50) - (timeDiff / 1000000);
        return { node: n, matchScore };
      })
      .sort((a, b) => b.matchScore - a.matchScore)[0]?.node;
    
    let currentId = entryNode?.id;
    let depthLimit = 10;
    while (currentId && depthLimit > 0) {
      const ancestor = subgraph.find(n => n.id === currentId);
      if (!ancestor) break;
      
      const timeDiff = now - new Date(ancestor.created_at).getTime();
      const decay = Math.exp(-DWE_CONSTANTS.DECAY_CONSTANT * timeDiff);
      
      chainDepthScore += (ancestor.weight || 0.1) * decay;
      ancestorCount++;
      
      currentId = ancestor.causal_parent;
      depthLimit--;
    }
  }
  chainDepthScore = ancestorCount > 0 ? Math.min(chainDepthScore / ancestorCount, 1.0) : 0.1;

  const totalScore = matches.reduce((acc, m) => acc + m.score, 0);
  if (totalScore === 0) return { projectedRisk: 0.1 + temporalClusterFactor };

  const rawRisk = matches.reduce((acc, m) => acc + (m.score * m.weight), 0) / totalScore;
  
  // 3. Updated Risk Formula: (rawRisk * 0.5) + (temporalClusterFactor * 0.3) + (chainDepthScore * 0.2)
  const projectedRisk = (rawRisk * 0.5) + (temporalClusterFactor * 0.3) + (chainDepthScore * 0.2);
  
  return { projectedRisk: Math.min(Math.max(projectedRisk, 0), 1) };
};
