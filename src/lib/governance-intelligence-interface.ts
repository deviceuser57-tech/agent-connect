import { RuntimeState } from './meis-runtime';
import { TopologyType } from './topology-engine';
import { MEISSimulationResult } from './meis-preflight';
import { CognitiveFeedbackReport } from './meis-feedback';
import { GovernanceEvolutionResult } from './governance-evolution';

export interface SystemHealthSnapshot {
  execution_layer_status: string;
  governance_stability: string;
  drift_index: string;
}

export interface GovernanceIntelligenceInterface {
  execution_map: any;
  governance_timeline: any[];
  preflight_vs_reality_alignment: any[];
  topology_flow_graph: any[];
  feedback_deviation_view: any[];
  constitution_version_tree: any[];
  system_health_snapshot: SystemHealthSnapshot;
}

/**
 * AC-007: Governance Intelligence Interface Layer
 * Strictly read-only visualization and observability layer.
 */
export class GovernanceIntelligenceInterfaceLayer {
  
  /**
   * Aggregates data from all layers and maps to the structured contract.
   */
  static generateView(
    runtimeState: RuntimeState,
    simulationResult: MEISSimulationResult,
    feedbackReport: CognitiveFeedbackReport,
    evolutionResult: GovernanceEvolutionResult
  ): GovernanceIntelligenceInterface {
    
    console.log(`👁️ [Intelligence] Generating full observability view...`);

    return {
      execution_map: this.mapExecution(runtimeState),
      governance_timeline: this.mapTimeline(evolutionResult),
      preflight_vs_reality_alignment: this.mapAlignment(simulationResult, runtimeState),
      topology_flow_graph: this.mapTopology(runtimeState),
      feedback_deviation_view: this.mapDeviations(feedbackReport),
      constitution_version_tree: this.mapVersionTree(evolutionResult),
      system_health_snapshot: this.calculateHealth(runtimeState, feedbackReport)
    };
  }

  private static mapExecution(runtimeState: RuntimeState): any {
    return {
      status: runtimeState.systemStatus,
      steps: runtimeState.stepExecutionLog.map(log => ({
        id: log.stepId,
        status: log.status,
        latency: log.endTime ? (new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) : 'PENDING'
      }))
    };
  }

  private static mapTimeline(evolution: GovernanceEvolutionResult): any[] {
    return evolution.version_chain.map(v => ({
      version: v,
      timestamp: new Date().toISOString(), // Mock timestamp
      type: 'CONSTITUTIONAL_EVOLUTION'
    }));
  }

  private static mapAlignment(sim: MEISSimulationResult, runtime: RuntimeState): any[] {
    return sim.forecastLog.map(f => {
      const actual = runtime.stepExecutionLog.find(a => a.stepId === f.stepId);
      return {
        step_id: f.stepId,
        predicted: f.forecastedStatus,
        actual: actual?.status || 'NOT_REACHED',
        aligned: (f.forecastedStatus === 'ALLOW' && actual?.status === 'COMPLETED') || (f.forecastedStatus !== 'ALLOW' && actual?.status !== 'COMPLETED')
      };
    });
  }

  private static mapTopology(runtime: RuntimeState): any[] {
    // Derived from global state and topology engine history
    return [
      {
        topology: 'MESH', // Assuming mesh as start
        status: 'ACTIVE',
        nodes: runtime.stepExecutionLog.length
      }
    ];
  }

  private static mapDeviations(report: CognitiveFeedbackReport): any[] {
    return report.deviation_map;
  }

  private static mapVersionTree(evolution: GovernanceEvolutionResult): any[] {
    return evolution.version_chain.map((v, i) => ({
      id: v,
      parent: i > 0 ? evolution.version_chain[i - 1] : null,
      changes: evolution.rule_diffs.filter(d => d.changes)
    }));
  }

  private static calculateHealth(runtime: RuntimeState, report: CognitiveFeedbackReport): SystemHealthSnapshot {
    return {
      execution_layer_status: runtime.systemStatus,
      governance_stability: report.drift_classification === 'STABLE' ? 'HIGH' : 'DEGRADED',
      drift_index: report.system_stability_index.toFixed(2)
    };
  }
}
