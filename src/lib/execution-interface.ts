import { runExecutionStep } from './orchestrator';
import { GovernanceEngine, GovernanceRole } from './governance-engine';
import { GovernanceMemory } from './governance-memory';
import { GovernanceTuner } from './governance-tuner';
import { DynamicDNAEngine } from './dna-engine';
import { ConflictDetector } from './conflict-detector';
import { GovernanceArbitrator } from './governance-arbitrator';

/**
 * ExecutionInterface (EIL v1.4 - Arbitrated Shield)
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

    // 2. Fetch External Control (Governance)
    const govDecision = await GovernanceEngine.validateExecutionPermission(sessionId, action, userRole, projectedRisk);
    
    // 3. Conflict Detection
    const conflict = ConflictDetector.detect(dnaTraits, govDecision, projectedRisk);

    // 4. Dual-Intelligence Arbitration
    const arbitration = await GovernanceArbitrator.arbitrate(sessionId, conflict);
    const finalDecision = arbitration.decision;

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

    // 5. Log Authorized Entry with Signature
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

    // 6. Kernel Execution (Deterministic Core)
    const result = await runExecutionStep(sessionId, payload.currentState, event, payload);

    // 7. [META-LEARNING LOOP]
    const outcomeScore = result.success ? 0.1 : 0.9;
    
    if (govTrace) {
      await GovernanceMemory.correlateOutcome(govTrace.id, outcomeScore);
      await GovernanceTuner.incrementExecution(sessionId);
    }

    if (arbitration.conflictLogId) {
      await GovernanceArbitrator.updateAuthority(sessionId, arbitration.conflictLogId, outcomeScore);
    }

    return result;
  }
};
