import { supabase } from '@/integrations/supabase/client';
import { GovernanceMemory } from './governance-memory';
import { GovernanceTuner, GovernanceMode } from './governance-tuner';

export type GovernanceRole = 'BUILDER' | 'APPROVER' | 'EXECUTOR' | 'ADMIN';

export interface GovernanceDecision {
  allowed: boolean;
  requiresApproval: boolean;
  reason?: string;
  shadowDetected?: boolean;
  signature?: string;
}

/**
 * GRAVITY GOVERNANCE ENGINE v1.2
 * Architecture Type: NON-INTRUSIVE OVERLAY
 */
export const GovernanceEngine = {
  
  // 1. Role-Action Mapping
  roleActionMap: {
    'START_WORKFLOW': ['EXECUTOR', 'ADMIN'],
    'APPROVE_STEP': ['APPROVER', 'ADMIN'],
    'REJECT_STEP': ['APPROVER', 'ADMIN'],
    'TRIGGER_RECOVERY': ['ADMIN'],
    'FORCE_UNLOCK': ['ADMIN'],
    'RECOVER': ['ADMIN']
  } as Record<string, GovernanceRole[]>,

  // 2. Permission Validation (v1.2 Adaptive)
  validateExecutionPermission: async (
    sessionId: string, 
    action: string, 
    userRole: GovernanceRole,
    projectedRisk: number = 0
  ): Promise<GovernanceDecision> => {
    
    // A. Check Shadow Execution (Behavior-based)
    const shadowDetected = await GovernanceEngine.detectShadowActivity(sessionId);

    // B. Replay Protection (Signature Check)
    const signature = await GovernanceEngine.generateSignature(sessionId, action);
    const isSignatureValid = await GovernanceMemory.verifySignature(sessionId, signature);
    
    if (!isSignatureValid) {
      return { allowed: false, requiresApproval: false, reason: 'REPLAY_ATTEMPT_DETECTED', shadowDetected };
    }

    // C. Fetch Adaptive State
    const { data: govState } = await supabase.from('governance_state').select('*').eq('session_id', sessionId).single();
    const mode: GovernanceMode = govState?.current_mode || 'BALANCED_MODE';
    const thresholdAdj = govState?.approval_threshold_adj || 0;

    // D. Mode Overrides
    if (mode === 'STRICT_MODE' && projectedRisk > (0.4 - thresholdAdj)) {
        return { allowed: false, requiresApproval: true, reason: 'STRICT_MODE_RISK_LIMIT', shadowDetected };
    }

    const allowedRoles = GovernanceEngine.roleActionMap[action];
    const hasRole = allowedRoles?.includes(userRole);
    
    if (!hasRole) {
      await GovernanceEngine.logGovernanceTrace({
        sessionId, action, userRole, isBlocked: true, isApproved: false, 
        reason: `INSUFFICIENT_PERMISSIONS: ${mode}`, shadowDetected, signature, projectedRiskAtTime: projectedRisk
      });
      return { allowed: false, requiresApproval: false, reason: 'GOVERNANCE_BLOCKED', shadowDetected };
    }

    // E. Adaptive Approval Requirement
    // If PERMISSIVE_MODE, maybe skip approval for build tasks. 
    // If INVESTIGATIVE_MODE, everything requires approval.
    let requiresApproval = action === 'FORCE_UNLOCK' || action === 'TRIGGER_RECOVERY' || mode === 'INVESTIGATIVE_MODE';
    
    if (mode === 'STRICT_MODE' && projectedRisk > 0.2) requiresApproval = true;

    return { 
      allowed: true, 
      requiresApproval, 
      shadowDetected,
      signature
    };
  },

  // 3. Signature Generation (v1.2)
  generateSignature: async (sessionId: string, action: string) => {
    const { data: state } = await supabase.from('governance_state').select('current_mode').eq('session_id', sessionId).single();
    const encoder = new TextEncoder();
    const data = encoder.encode(`${sessionId}-${action}-${new Date().toISOString().slice(0, 13)}-${state?.current_mode}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // 4. Trace Logging (v1.2 Extended)
  logGovernanceTrace: async (trace: {
    sessionId: string;
    action: string;
    userRole: string;
    isBlocked: boolean;
    isApproved: boolean;
    reason?: string;
    shadowDetected: boolean;
    signature?: string;
    projectedRiskAtTime?: number;
  }) => {
    return await supabase.from('governance_traces').insert({
      session_id: trace.sessionId,
      action: trace.action,
      user_role: trace.userRole,
      is_blocked: trace.isBlocked,
      is_approved: trace.isApproved,
      reason: trace.reason,
      shadow_detected: trace.shadowDetected,
      execution_signature: trace.signature,
      projected_risk_at_time: trace.projectedRiskAtTime
    }).select().single();
  },

  detectShadowActivity: async (sessionId: string): Promise<boolean> => {
    const { count: stateCount } = await supabase.from('memory_graph_nodes').select('*', { count: 'exact', head: true }).eq('session_id', sessionId);
    const { count: traceCount } = await supabase.from('governance_traces').select('*', { count: 'exact', head: true }).eq('session_id', sessionId).eq('is_blocked', false);
    return (stateCount || 0) > (traceCount || 0);
  },

  queueAction: async (sessionId: string, action: string, role: GovernanceRole, payload: any) => {
    await supabase.from('governance_queue').insert({
      session_id: sessionId, proposed_action: action, proposer_role: role, payload, status: 'PENDING'
    });
  }
};
