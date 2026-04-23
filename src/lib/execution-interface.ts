import { runExecutionStep } from './orchestrator';
import { GovernanceMemory } from './governance-memory';
import { GovernanceTuner } from './governance-tuner';
import { GovernanceReflection } from './governance-reflection';
import { GovernanceCausality } from './governance-causality-graph';
import { PolicyEvolver } from './policy-evolver';
import { CEC } from './cognitive-enforcement-core';

/**
 * ExecutionInterface (EIL v1.7 - UCSGK Shield)
 * Architecture Type: UNIFIED COGNITIVE ENFORCEMENT
 */
export const ExecutionInterface = {
  executeAction: async (sessionId: string, action: string, context: any) => {
    const startTime = Date.now();
    
    // 1. Unified Gateway (CEC v1.7)
    // This merges DNA, Governance, Security, and Arbitration.
    const cecResult = await CEC.validateExecution(sessionId, action, context);

    // 2. Handling Decision
    if (!cecResult.allowed) {
      return { 
        success: false, 
        error: "CEC_GATE_BLOCKED", 
        reason: cecResult.auditStream.governanceDecision,
        violation: cecResult.auditStream.securityDecision
      };
    }

    if (cecResult.requiresApproval) {
      // Final decision is valid but requires human approval per constitution
      return { success: false, error: "PENDING_APPROVAL", reason: "Action requires constitutional approval." };
    }

    // 3. Mapping Causal Pressure
    await GovernanceCausality.mapCausality(sessionId, {
       dnaInfluence: cecResult.auditStream.intent === 'READ_INTENT' ? 0.2 : 0.8,
       govPressure: cecResult.auditStream.riskScore,
       arbitrationResult: cecResult.auditStream.finalDecision
    });

    const payload = {
       ...context, latency: Date.now() - startTime,
       severity_factor: context.severity_factor || 0.1,
    };

    // 4. Kernel Execution (Deterministic Core)
    const actionToEventMap: Record<string, string> = {
      'START_WORKFLOW': 'START',
      'APPROVE_STEP': 'APPROVE',
      'RETRY_STEP': 'RETRY',
      'FORCE_UNLOCK': 'UNLOCK',
      'TRIGGER_RECOVERY': 'RECOVER'
    };
    const event = actionToEventMap[action] || 'EXECUTE';
    
    const result = await runExecutionStep(sessionId, payload.currentState, event, payload);

    // 5. Evolutionary Feedback Loop
    const outcomeScore = result.success ? 0.1 : 0.9;
    
    const { executions_since_last_tune } = await GovernanceTuner.incrementExecution(sessionId);
    
    if (executions_since_last_tune && executions_since_last_tune >= PolicyEvolver.EVOLUTION_CYCLE) {
        PolicyEvolver.evolve(sessionId).catch(console.error);
    }

    // Correlation & Reflection
    if (cecResult.arbitration?.conflictLogId) {
      await GovernanceReflection.reflect(sessionId, cecResult.arbitration.conflictLogId, outcomeScore);
    }

    return result;
  }
};
