import { MEISSimulationResult } from './meis-preflight';
import { RuntimeState } from './meis-runtime';
import { TopologyType } from './topology-engine';

export type DeviationType = 'NONE' | 'TIMING' | 'GOVERNANCE' | 'TOPOLOGY' | 'LOGIC';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type DriftClassification = 'STABLE' | 'CONTROLLED_DRIFT' | 'UNSTABLE';

export interface CognitiveFeedbackReport {
  execution_id: string;
  deviation_map: {
    step_id: string;
    forecasted_state: string;
    actual_state: string;
    deviation_type: DeviationType;
    severity: Severity;
  }[];
  governance_delta_recommendations: {
    rule_id: string;
    suggested_adjustment: string;
    reason: string;
    impact_scope: 'LOCAL' | 'GLOBAL';
  }[];
  topology_correction_signals: {
    topology: TopologyType;
    trigger_condition: string;
    confidence: string; // "DETERMINISTIC_RULE_BASED_ONLY"
  }[];
  system_stability_index: number;
  drift_classification: DriftClassification;
}

/**
 * AC-005: Trace Classifier
 * Maps runtime outcomes to deterministic deviation categories.
 */
export class TraceClassifier {
  static classify(forecast: any, actual: any): { type: DeviationType; severity: Severity } {
    if (!forecast || !actual) return { type: 'LOGIC', severity: 'HIGH' };
    
    if (actual.status === 'FAILED') {
      return { type: 'LOGIC', severity: 'CRITICAL' };
    }

    if (forecast.forecastedStatus !== 'ALLOW' && actual.status === 'COMPLETED') {
        // This is a shadow execution or a guard failure
        return { type: 'GOVERNANCE', severity: 'HIGH' };
    }

    // Timing check (simulated)
    const startTime = new Date(actual.startTime).getTime();
    const endTime = new Date(actual.endTime || actual.startTime).getTime();
    if (endTime - startTime > 5000) {
      return { type: 'TIMING', severity: 'MEDIUM' };
    }

    return { type: 'NONE', severity: 'LOW' };
  }
}

/**
 * AC-005: Delta Analyzer
 * Computes deterministic delta between forecast and actual trace.
 */
export class DeltaAnalyzer {
  static analyze(forecastLog: any[], actualLog: any[]): number {
    let matchCount = 0;
    for (const forecast of forecastLog) {
      const actual = actualLog.find(a => a.stepId === forecast.stepId);
      if (actual && actual.status === 'COMPLETED') {
        matchCount++;
      }
    }
    return matchCount / Math.max(forecastLog.length, 1);
  }
}

/**
 * AC-005: Governance Calibrator
 * Generates governance delta recommendations based on deviations.
 */
export class GovernanceCalibrator {
  static calibrate(deviations: any[]): any[] {
    const recommendations: any[] = [];
    const govDeviations = deviations.filter(d => d.deviation_type === 'GOVERNANCE');
    
    if (govDeviations.length > 0) {
      recommendations.push({
        rule_id: 'AUTO_CALIBRATE_001',
        suggested_adjustment: 'INCREASE_STRICTNESS',
        reason: `${govDeviations.length} governance deviations detected in execution.`,
        impact_scope: 'GLOBAL'
      });
    }

    return recommendations;
  }
}

/**
 * AC-005: Topology Signaler
 * Recommends topology corrections.
 */
export class TopologySignaler {
  static signal(deviations: any[], currentTopology: TopologyType): any[] {
    const signals: any[] = [];
    const timingDeviations = deviations.filter(d => d.deviation_type === 'TIMING');

    if (timingDeviations.length > 2 && currentTopology === 'HIERARCHICAL') {
      signals.push({
        topology: 'HYBRID',
        trigger_condition: 'HIERARCHICAL_LATENCY_THRESHOLD_EXCEEDED',
        confidence: 'DETERMINISTIC_RULE_BASED_ONLY'
      });
    }

    return signals;
  }
}

/**
 * AC-005: Cognitive Feedback Loop Engine
 * Post-execution analytics engine.
 */
export class CognitiveFeedbackEngine {
  static async generateReport(
    executionId: string,
    simulationResult: MEISSimulationResult,
    runtimeState: RuntimeState
  ): Promise<CognitiveFeedbackReport> {
    
    const deviationMap: any[] = [];
    const forecastLog = simulationResult.forecastLog;
    const actualLog = runtimeState.stepExecutionLog;

    for (const forecast of forecastLog) {
      const actual = actualLog.find(a => a.stepId === forecast.stepId);
      const classification = TraceClassifier.classify(forecast, actual);
      
      deviationMap.push({
        step_id: forecast.stepId,
        forecasted_state: forecast.forecastedStatus,
        actual_state: actual?.status || 'NOT_EXECUTED',
        deviation_type: classification.type,
        severity: classification.severity
      });
    }

    const stabilityIndex = DeltaAnalyzer.analyze(forecastLog, actualLog);
    const driftClass: DriftClassification = stabilityIndex > 0.9 ? 'STABLE' : stabilityIndex > 0.6 ? 'CONTROLLED_DRIFT' : 'UNSTABLE';

    return {
      execution_id: executionId,
      deviation_map: deviationMap,
      governance_delta_recommendations: GovernanceCalibrator.calibrate(deviationMap),
      topology_correction_signals: TopologySignaler.signal(deviationMap, 'MESH'), // Defaulting mesh for example
      system_stability_index: stabilityIndex,
      drift_classification: driftClass
    };
  }
}
