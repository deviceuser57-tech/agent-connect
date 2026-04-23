import { runExecutionStep } from './orchestrator';
import { GovernanceEngine, GovernanceRole } from './governance-engine';
import { GovernanceMemory } from './governance-memory';
import { GovernanceTuner } from './governance-tuner';
import { DynamicDNAEngine } from './dna-engine';
import { ConflictDetector } from './conflict-detector';
import { GovernanceArbitrator } from './governance-arbitrator';
import { GovernanceReflection } from './governance-reflection';
import { GovernanceCausality } from './governance-causality-graph';
import { PolicyEvolver } from './policy-evolver';

/**
 * ExecutionInterface (EIL v1.6 - Self-Constitutional Shield)
 */
export const ExecutionInterface = {
  executeAction: async (sessionId: string, action: string, context: any) => {
    const startTime = Date.now();
    const userRole: GovernanceRole = context.userRole || 'EXECUTOR'; 
    const projectedRisk = context.projectedRisk || 0;

    const actionToEventMap: Record<string, string> = {
      'START_WORKFLOW': 'START',
      'APPROVE_STEP': 'APPROVE',
      'RETRY_STEP': 'RETRY',
      'FORCE_UNLOCK': 'UNLOCK',
      'TRIGGER_RECOVERY': 'RECOVER'
    };

    const event = actionToEventMap[action];
    if (!event) throw new Error(`EIL Violation: Unknown action binding for ${action}`);

    // 1. Fetch Internal Intent (DNA)
    const dnaTraits = await DynamicDNAEngine.fetchActiveDNA(sessionId);

    // 2. Fetch External Control (Governance with Dynamic Rules)
    const govDecision = await GovernanceEngine.validateExecutionPermission(sessionId, action, userRole, projectedRisk);
    
    // 3. Conflict Detection
    const conflict = ConflictDetector.detect(dnaTraits, govDecision, projectedRisk);

    // 4. Dual-Intelligence Arbitration
    const arbitration = await GovernanceArbitrator.arbitrate(sessionId, conflict);
    const finalDecision = arbitration.decision;

    // 5. [META-COGNITIVE CAUSALITY MAPPING]
    await GovernanceCausality.mapCausality(sessionId, {
       dnaInfluence: dnaTraits.exploration_bias || 0.5,
       govPressure: govDecision.requiresApproval ? 0.8 : 0.2,
       arbitrationResult: arbitration.reason
    });

    if (!finalDecision.allowed || finalDecision.isBlocked) {
      return { 
        success: false, 
        error: "ARBITRATION_BLOCK", 
        reason: arbitration.reason,
        conflictLogId: arbitration.conflictLogId 
      };
    }

    if (finalDecision.requiresApproval) {
      await GovernanceEngine.queueAction(sessionId, action, userRole, context);
      return { success: false, error: "PENDING_APPROVAL", reason: "Action queued via arbitration." };
    }

    // 6. Log Authorized Entry
    const { data: govTrace } = await GovernanceEngine.logGovernanceTrace({
      sessionId, action, userRole, isBlocked: false, isApproved: true, 
      shadowDetected: finalDecision.shadowDetected || false,
      signature: finalDecision.signature,
      projectedRiskAtTime: projectedRisk
    });

    const payload = {
       ...context, latency: Date.now() - startTime, retryCount: context.retryCount || 0,
       severity_factor: context.severity_factor || 0.1, chaosType: context.chaosType || 'NONE',
       rollback: !!context.rollback
    };

    // 7. Kernel Execution (Deterministic Core)
    const result = await runExecutionStep(sessionId, payload.currentState, event, payload);

    // 8. [EVOLUTIONARY FEEDBACK LOOP]
    const outcomeScore = result.success ? 0.1 : 0.9;
    
    if (govTrace) {
      await GovernanceMemory.correlateOutcome(govTrace.id, outcomeScore);
      const { executions_since_last_tune } = await GovernanceTuner.incrementExecution(sessionId);
      
      // Every 20 executions, evolve the constitution
      if (executions_since_last_tune >= PolicyEvolver.EVOLUTION_CYCLE) {
          console.log('[CONSTITUTION] Triggering policy evolution cycle...');
          PolicyEvolver.evolve(sessionId).catch(console.error);
      }
    }

    if (arbitration.conflictLogId) {
      await GovernanceArbitrator.updateAuthority(sessionId, arbitration.conflictLogId, outcomeScore);
      await GovernanceReflection.reflect(sessionId, arbitration.conflictLogId, outcomeScore);
    }

    return result;
  }
};
