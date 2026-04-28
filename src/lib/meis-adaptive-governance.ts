import { MEIS, RuntimeState } from './meis-runtime';
import { TopologyType } from './topology-engine';

export interface AdaptiveGovernanceLayerResult {
  csi: number;
  resolvedConflictHierarchy: string[];
  propagatedUncertaintyMap: Record<string, number>;
  topologyTransitionPlan: string[];
}

/**
 * AC-004.3: Adaptive Governance Layer
 * Rule-driven adaptation for preflight simulation.
 */
export class AdaptiveGovernanceLayer {
  
  /**
   * Calculates Context Severity Index (CSI).
   */
  static calculateCSI(runtimeState: RuntimeState, projectedRisk: number): number {
    let csi = projectedRisk;
    
    // Factor 1: Drift Score influence
    const driftScore = runtimeState.globalState?.driftScore || 0;
    csi += driftScore * 0.5;

    // Factor 2: System Status influence
    if (runtimeState.systemStatus === 'HALTED' || runtimeState.systemStatus === 'FAILED') {
      csi += 0.4;
    }

    return Math.min(csi, 1.0);
  }

  /**
   * Adjusts conflict resolution priorities based on CSI.
   */
  static getAdaptivePriorities(csi: number): Record<string, number> {
    const basePriorities = { 'SECURITY': 3, 'GOVERNANCE': 2, 'EFFICIENCY': 1 };
    
    if (csi > 0.8) {
      return { ...basePriorities, 'SECURITY': 10, 'GOVERNANCE': 5 };
    }
    
    if (csi > 0.5) {
      return { ...basePriorities, 'SECURITY': 5 };
    }

    return basePriorities;
  }

  /**
   * Propagates uncertainty downstream in the DAG.
   */
  static propagateUncertainty(meis: MEIS, baseUncertaintyMap: Record<string, number>): Record<string, number> {
    const propagatedMap: Record<string, number> = { ...baseUncertaintyMap };
    const steps = meis.step_sequence || [];

    // Sort steps by dependencies (simple level-based approach)
    // In a real DAG, we'd use topological sort.
    for (const step of steps) {
      const deps = step.depends_on || [];
      if (deps.length > 0) {
        let maxDepUncertainty = 0;
        for (const depId of deps) {
          maxDepUncertainty = Math.max(maxDepUncertainty, propagatedMap[depId] || 0);
        }
        
        // Propagation Rule: Downstream uncertainty = current + (max upstream * 0.5)
        propagatedMap[step.id] = Math.min((propagatedMap[step.id] || 0) + (maxDepUncertainty * 0.5), 1.0);
      }
    }

    return propagatedMap;
  }

  /**
   * Determines topology transition plan based on thresholds.
   */
  static generateTransitionPlan(
    currentTopology: TopologyType, 
    csi: number, 
    propagatedUncertainty: Record<string, number>
  ): string[] {
    const plan: string[] = [];
    
    // Threshold Rule: High CSI or High Uncertainty -> Force HIERARCHICAL
    const maxUncertainty = Math.max(...Object.values(propagatedUncertainty));

    if (csi > 0.8 || maxUncertainty > 0.9) {
      if (currentTopology !== 'HIERARCHICAL') {
        plan.push(`TRANSITION_REQUIRED: ${currentTopology} -> HIERARCHICAL [Reason: CRITICAL_SEVERITY]`);
      }
    } else if (csi > 0.4 && currentTopology === 'MESH') {
      plan.push(`TRANSITION_RECOMMENDED: MESH -> HYBRID [Reason: MODERATE_SEVERITY]`);
    }

    return plan;
  }
}
