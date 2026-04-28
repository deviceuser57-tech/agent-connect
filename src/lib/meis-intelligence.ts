import { MEIS, RuntimeState } from './meis-runtime';
import { TopologyType } from './topology-engine';

/**
 * AC-004.2: Conflict Resolver
 * Resolves governance rule conflicts via deterministic priority hierarchy.
 */
export class ConflictResolver {
  // Priority: SECURITY > GOVERNANCE > EFFICIENCY
  private static PRIORITY = {
    'SECURITY': 3,
    'GOVERNANCE': 2,
    'EFFICIENCY': 1,
    'NONE': 0
  };

  static resolve(rules: any[]): any {
    if (!rules || rules.length === 0) return null;
    
    return rules.reduce((prev, curr) => {
      const prevPriority = this.PRIORITY[prev.type as keyof typeof this.PRIORITY] || 0;
      const currPriority = this.PRIORITY[curr.type as keyof typeof this.PRIORITY] || 0;
      
      return currPriority > prevPriority ? curr : prev;
    });
  }
}

/**
 * AC-004.2: Uncertainty Engine
 * Computes uncertainty score based on static factors.
 * No probabilistic models allowed.
 */
export class UncertaintyEngine {
  static computeScore(step: any, runtimeState: RuntimeState): number {
    let score = 0.1; // Base uncertainty

    // Factor 1: Input completeness
    if (!step.params || Object.keys(step.params).length === 0) {
      score += 0.3;
    }

    // Factor 2: Dependency depth
    const depDepth = (step.depends_on || []).length;
    score += Math.min(depDepth * 0.1, 0.4);

    // Factor 3: Actor criticality
    if (step.actor_type === 'ADMIN' || step.metadata?.critical) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }
}

/**
 * AC-004.2: Topology Costing Engine
 * Deterministic cost comparison between Mesh, Hierarchical, and Hybrid.
 */
export class TopologyCosting {
  static getCostVector(topology: TopologyType, stepCount: number): { latency: number; coordination: number; security: number } {
    switch (topology) {
      case 'MESH':
        return {
          latency: 10 * stepCount,
          coordination: 50 * stepCount,
          security: 30
        };
      case 'HIERARCHICAL':
        return {
          latency: 40 * stepCount,
          coordination: 10 * stepCount,
          security: 10
        };
      case 'HYBRID':
        return {
          latency: 25 * stepCount,
          coordination: 30 * stepCount,
          security: 20
        };
      default:
        return { latency: 999, coordination: 999, security: 999 };
    }
  }

  static calculate(topology: TopologyType, stepCount: number, riskFactor: number): number {
    const vector = this.getCostVector(topology, stepCount);
    const rawScore = (vector.latency * 0.4 + vector.coordination * 0.4 + vector.security * 0.2) / (100 * stepCount);
    return Math.min(rawScore + riskFactor, 1.0);
  }
}
