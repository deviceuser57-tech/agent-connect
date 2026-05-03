import { MEIS, DAGResolver } from './meis-runtime';
import { TopologyResolver } from './topology-engine';
import { UncertaintyEngine, TopologyCosting } from './meis-intelligence';
import { AdaptiveGovernanceLayer } from './meis-adaptive-governance';
import { CEC } from './cognitive-enforcement-core';

export type PreflightDecision = 'PASS' | 'STALL' | 'MODIFY';

export interface UnifiedForecastEntry {
  stepId: string | "SYSTEM";
  forecastedStatus: "ALLOW" | "HALT" | "STALL";
  violation_type?: "STRUCTURAL" | "GOVERNANCE" | "TOPOLOGY" | "UNCERTAINTY";
  violation_code?: string;
  reason?: string;
  severity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  caused_by?: string[];
  trace_ref: string;
  metadata?: Record<string, any>;
}

export interface MEISSimulationResult {
  decision: PreflightDecision;
  forecastLog: UnifiedForecastEntry[];
  violationCount: number;
  topologyFeasibility: {
    topology: string;
    costScore: number;
    feasible: boolean;
  };
  governanceConstraints: {
    rule_id: string;
    status: 'CLEARED' | 'WARNING' | 'BLOCK';
  }[];
}

/**
 * AC-009: Hardened Preflight Compiler
 * Performs stress testing and feasibility validation before execution.
 */
export class PreflightCompiler {
  private static createLogEntry(
    sessionId: string,
    meisId: string,
    stepId: string | 'SYSTEM',
    status: "ALLOW" | "HALT" | "STALL",
    type?: UnifiedForecastEntry['violation_type'],
    reason?: string,
    score?: number,
    caused_by?: string[],
    metadata?: any
  ): UnifiedForecastEntry {
    const severity = type ? this.mapSeverity(type, score || 0) : 'LOW';
    return {
      stepId,
      forecastedStatus: status,
      violation_type: type,
      violation_code: type && reason ? this.mapViolationCode(type, reason) : undefined,
      reason,
      severity,
      caused_by: caused_by || (type === 'STRUCTURAL' || type === 'TOPOLOGY' ? ['SYSTEM'] : undefined),
      trace_ref: `${sessionId}::${meisId}::${stepId}`,
      metadata
    };
  }

  private static mapSeverity(type: string, score: number): UnifiedForecastEntry['severity'] {
    if (type === 'STRUCTURAL') return 'CRITICAL';
    if (type === 'GOVERNANCE') {
      if (score > 0.85) return 'CRITICAL';
      if (score > 0.6) return 'HIGH';
      return 'LOW';
    }
    if (type === 'TOPOLOGY') return 'HIGH';
    if (type === 'UNCERTAINTY') {
      if (score > 0.9) return 'CRITICAL';
      if (score > 0.75) return 'HIGH';
      if (score > 0.5) return 'MEDIUM';
      return 'LOW';
    }
    return 'LOW';
  }

  private static mapViolationCode(type: string, reason: string): string | undefined {
    if (type === 'STRUCTURAL') return 'V_STR_001';
    if (type === 'GOVERNANCE') {
      if (reason === 'RISK_THRESHOLD_EXCEEDED') return 'V_GOV_001';
      if (reason === 'HIGH_RISK_WARNING') return 'V_GOV_002';
    }
    if (type === 'TOPOLOGY') return 'V_TOP_001';
    if (type === 'UNCERTAINTY') return 'V_UNC_001';
    return undefined;
  }

  static async simulate(
    sessionId: string, 
    meis: MEIS, 
    initialGlobalState: any
  ): Promise<MEISSimulationResult> {
    
    console.log(`🔍 [Preflight] Starting hard simulation for MEIS: ${meis.id}`);

    const result: MEISSimulationResult = {
      decision: 'PASS',
      forecastLog: [],
      violationCount: 0,
      topologyFeasibility: { topology: '', costScore: 0, feasible: true },
      governanceConstraints: []
    };

    // 1. Dependency Integrity Check (V3_DEPENDENCY_INTEGRITY)
    const stepIds = new Set(meis.step_sequence.map(s => s.id));
    for (const step of meis.step_sequence) {
      const deps = step.depends_on || [];
      for (const dep of deps) {
        if (!stepIds.has(dep)) {
          result.violationCount++;
          result.forecastLog.push(this.createLogEntry(
            sessionId, meis.id, step.id, 'HALT', 'STRUCTURAL', 'MISSING_DEPENDENCY', 1, ['SYSTEM'], { missing_dependency: dep }
          ));
        }
      }
    }

    if (result.violationCount > 0) {
      result.decision = 'STALL';
      return result;
    }

    // 2. Structural Stress Test (DAG)
    if (DAGResolver.resolve(meis) === 'STALL') {
      result.forecastLog.push(this.createLogEntry(
        sessionId, meis.id, 'SYSTEM', 'STALL', 'STRUCTURAL', 'MISSING_DEPENDENCY', 1, ['SYSTEM'], { error: 'DAG_CYCLE_DETECTED' }
      ));
      result.decision = 'STALL';
      return result;
    }

    // 2. Topology Feasibility & Costing
    const topology = TopologyResolver.resolve(meis);
    const cost = TopologyCosting.calculate(topology as any, meis.step_sequence.length, 0.2);
    result.topologyFeasibility = { topology, costScore: cost, feasible: cost < 0.9 };

    if (!result.topologyFeasibility.feasible) {
      result.forecastLog.push(this.createLogEntry(
        sessionId, meis.id, 'SYSTEM', 'STALL', 'TOPOLOGY', 'FEASIBILITY_FAILURE', cost, ['SYSTEM'], { topology, costScore: cost }
      ));
    }

    // 3. Governance Constraint Evaluation (CEC Forecast)
    for (const step of meis.step_sequence) {
      const risk = step.metadata?.projectedRisk || 0.1;
      
      if (risk > 0.85) {
        result.governanceConstraints.push({ rule_id: `RULE_${step.id}`, status: 'BLOCK' });
        result.violationCount++;
      } else if (risk > 0.6) {
        result.governanceConstraints.push({ rule_id: `RULE_${step.id}`, status: 'WARNING' });
      } else {
        result.governanceConstraints.push({ rule_id: `RULE_${step.id}`, status: 'CLEARED' });
      }

      const uScore = UncertaintyEngine.computeScore(step, { globalState: initialGlobalState } as any);
      result.forecastLog.push(this.createLogEntry(
        sessionId, meis.id, step.id, 
        risk > 0.85 ? 'HALT' : (risk > 0.6 ? 'STALL' : 'ALLOW'),
        'GOVERNANCE',
        risk > 0.85 ? 'RISK_THRESHOLD_EXCEEDED' : (risk > 0.6 ? 'HIGH_RISK_WARNING' : 'PASSED'),
        risk,
        undefined,
        { risk, uncertaintyScore: uScore }
      ));
    }

    // 4. Uncertainty Propagation Stress Test
    const baseUncertainty: Record<string, number> = {};
    result.forecastLog.forEach(f => {
      if (f.metadata?.uncertaintyScore) baseUncertainty[f.stepId] = f.metadata.uncertaintyScore;
    });
    const propagated = AdaptiveGovernanceLayer.propagateUncertainty(meis, baseUncertainty);
    
    for (const [stepId, score] of Object.entries(propagated)) {
      if (score > 0.5) {
        const step = meis.step_sequence.find(s => s.id === stepId);
        result.forecastLog.push(this.createLogEntry(
          sessionId, meis.id, stepId, 
          score > 0.9 ? 'HALT' : 'STALL',
          'UNCERTAINTY',
          score > 0.9 ? 'CRITICAL_UNCERTAINTY' : 'PROPAGATED_UNCERTAINTY',
          score,
          step?.depends_on || ['SYSTEM'],
          { uncertaintyScore: score }
        ));
      }
    }

    // R5 Termination Rule Implementation
    const severities = result.forecastLog.map(f => f.severity);
    if (severities.includes('CRITICAL')) {
      result.decision = 'STALL';
    } else if (severities.includes('HIGH')) {
      result.decision = 'MODIFY';
    } else {
      result.decision = 'PASS';
    }

    // Final Schema Validation (Hardened)
    for (const entry of result.forecastLog) {
      if (!entry.trace_ref || !entry.forecastedStatus || !entry.stepId) {
        console.error('🛑 [Preflight] SCHEMA_VIOLATION detected in forecastLog');
        result.decision = 'STALL';
      }
    }

    console.log(`✅ [Preflight] Verdict: ${result.decision}`);
    return result;
  }
}
