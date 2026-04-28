import { MEIS, RuntimeState } from './meis-runtime';

export type TopologyType = 'MESH' | 'HIERARCHICAL' | 'HYBRID';

/**
 * AC-003: Topology Resolver
 * Strictly reads topology from MEIS operational layer.
 */
export class TopologyResolver {
  static resolve(meis: MEIS): TopologyType | 'STALL' {
    const topology = meis.operational_layer?.topology;
    const validTopologies: TopologyType[] = ['MESH', 'HIERARCHICAL', 'HYBRID'];
    
    if (validTopologies.includes(topology)) {
      return topology as TopologyType;
    }

    console.error(`🛑 [TopologyResolver] Invalid or missing topology: ${topology}`);
    return 'STALL';
  }
}

/**
 * AC-003: Agent Allocation Engine
 * Assigns actor_id to steps dynamically.
 */
export class AgentAllocationEngine {
  static allocate(step: any, runtimeState: RuntimeState): string | 'STALL' {
    // In a real system, this would query available agents of the required type.
    // For now, we use a deterministic assignment based on actor type and step ID.
    const actorType = step.actor_type || 'GENERAL_AGENT';
    
    if (!actorType) return 'STALL';

    // Deterministic mock allocation
    return `${actorType}_${step.id.slice(-4)}`;
  }
}

/**
 * AC-003: Execution Router
 * Routes steps to agents based on topology.
 */
export class ExecutionRouter {
  static route(step: any, topology: TopologyType, runtimeState: RuntimeState): any {
    switch (topology) {
      case 'MESH':
        return this.routeMesh(step, runtimeState);
      case 'HIERARCHICAL':
        return this.routeHierarchical(step, runtimeState);
      case 'HYBRID':
        return this.routeHybrid(step, runtimeState);
      default:
        return 'STALL';
    }
  }

  private static routeMesh(step: any, state: RuntimeState) {
    console.log(`🌐 [Router] Mesh Routing: Shared state enabled for step ${step.id}`);
    return { mode: 'PARALLEL', sharedState: true };
  }

  private static routeHierarchical(step: any, state: RuntimeState) {
    console.log(`👑 [Router] Hierarchical Routing: Coordinator control for step ${step.id}`);
    return { mode: 'SEQUENTIAL', coordinatorOnly: true };
  }

  private static routeHybrid(step: any, state: RuntimeState) {
    const isCritical = step.metadata?.critical === true;
    console.log(`🔄 [Router] Hybrid Routing: ${isCritical ? 'CRITICAL' : 'NON-CRITICAL'} step ${step.id}`);
    return isCritical ? this.routeHierarchical(step, state) : this.routeMesh(step, state);
  }
}

/**
 * AC-003: Dynamic Switching Controller
 * Deterministic topology switching based on rules.
 */
export class DynamicSwitchingController {
  static evaluateSwitch(
    currentTopology: TopologyType, 
    runtimeState: RuntimeState, 
    governanceConstraints: any
  ): TopologyType | 'STALL' {
    
    // STRICT DETERMINISM: No LLMs, No heuristics.
    // Rule 1: If risk score exceeds 0.8 in global state -> Force HIERARCHICAL
    if (runtimeState.globalState?.riskScore > 0.8) {
      return 'HIERARCHICAL';
    }

    // Rule 2: If governance constraint forces STRICT_MODE -> HIERARCHICAL
    if (governanceConstraints?.mode === 'STRICT_MODE') {
      return 'HIERARCHICAL';
    }

    // Rule 3: If mesh congestion detected -> Force HYBRID
    if (runtimeState.globalState?.congestionLevel > 5) {
      return 'HYBRID';
    }

    // Default to current
    return currentTopology;
  }
}
