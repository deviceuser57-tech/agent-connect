import { GovernanceEngine, GovernanceRole } from './governance-engine';
import { GovernanceArbitrator } from './governance-arbitrator';
import { ConflictDetector } from './conflict-detector';
import { DynamicDNAEngine } from './dna-engine';
import { GovernanceTuner } from './governance-tuner';
import { supabaseCompat as supabase } from '@/integrations/supabase/cmack-compat';

export type CognitiveIntent = 'READ_INTENT' | 'WRITE_INTENT' | 'OVERRIDE_INTENT' | 'SYSTEM_INTENT' | 'RISK_INTENT';

/**
 * COGNITIVE ENFORCEMENT CORE (CEC v1.7)
 * The unified decision gate for all system operations.
 */
export const CEC = {
  
  // 1. Intent Mapping
  mapIntent: (action: string): CognitiveIntent => {
    const writeActions = ['TRIGGER_RECOVERY', 'APPROVE_STEP', 'REJECT_STEP', 'FORCE_UNLOCK'];
    const systemActions = ['TUNE_GOVERNANCE', 'EVOLVE_POLICY', 'CAPTURE_SNAPSHOT'];
    
    if (action.startsWith('READ') || action.startsWith('VIEW')) return 'READ_INTENT';
    if (action === 'FORCE_OVERRIDE') return 'OVERRIDE_INTENT';
    if (writeActions.includes(action)) return 'WRITE_INTENT';
    if (systemActions.includes(action)) return 'SYSTEM_INTENT';
    return 'RISK_INTENT';
  },

  // 2. Unified Decision Pipeline
  validateExecution: async (sessionId: string, action: string, context: any) => {
    const userRole: GovernanceRole = context.userRole || 'EXECUTOR';
    const projectedRisk = context.projectedRisk || 0.1;
    const intent = CEC.mapIntent(action);

    console.log(`🧠 [CEC] Processing Intent: ${intent} for Action: ${action} [User: ${userRole}]`);

    // A. FETCH STATE & FIREWALL CHECKS
    const { data: govState } = await supabase.from('governance_state').select('*').eq('session_id', sessionId).single();
    
    if (govState?.is_drift_locked && intent === 'WRITE_INTENT') {
       return { allowed: false, reason: 'DRIFT_LOCK_ACTIVE', violation: 'FIREWALL_BLOCK' };
    }

    // B. GOVERNANCE EVALUATION (v1.6)
    const govDecision = await GovernanceEngine.validateExecutionPermission(sessionId, action, userRole, projectedRisk);

    // C. DNA INTENT FETCH
    const dnaTraits = await DynamicDNAEngine.fetchActiveDNA(sessionId);

    // D. CONFLICT & ARBITRATION (v1.4)
    const conflict = ConflictDetector.detect(dnaTraits, govDecision, projectedRisk);
    const arbitration = await GovernanceArbitrator.arbitrate(sessionId, conflict);

    // E. SECURITY ENFORCEMENT (CZTEA v2.0 Logic)
    // Here we simulate the RLS logic to prevent even attempting the DB call if it fails roles.
    const { data: roleEntry } = await supabase.from('user_roles').select('*').eq('user_id', context.userId).eq('role', userRole).single();
    const securityStatus = roleEntry ? 'AUTHORIZED' : 'SECURITY_VIOLATION';

    if (!roleEntry && intent !== 'READ_INTENT') {
      return { allowed: false, reason: 'ROLE_MISMATCH', violation: 'SECURITY_VIOLATION' };
    }

    // F. FINAL UNIFIED AUDIT (UCSGK v1.7)
    const finalAllowed = arbitration.decision.allowed && securityStatus === 'AUTHORIZED';
    
    const auditStream = {
      intent,
      governanceDecision: govDecision.reason,
      securityDecision: securityStatus,
      finalDecision: finalAllowed ? 'ALLOW' : 'BLOCK',
      riskScore: projectedRisk,
      driftScore: govState?.drift_score || 0.0,
      violationFlags: !finalAllowed ? [securityStatus, arbitration.reason] : []
    };

    // LOG UNIFIED TRACE
    await supabase.from('governance_traces').insert({
       session_id: sessionId,
       action,
       user_role: userRole,
       is_blocked: !finalAllowed,
       is_approved: finalAllowed && !govDecision.requiresApproval,
       reason: arbitration.reason,
       cognitive_intent: intent,
       security_status: securityStatus,
       risk_score: projectedRisk,
       drift_score: govState?.drift_score || 0,
       violation_flags: auditStream.violationFlags,
       execution_signature: govDecision.signature
    });

    return { 
      allowed: finalAllowed, 
      requiresApproval: govDecision.requiresApproval && finalAllowed,
      auditStream,
      arbitration
    };
  }
};
