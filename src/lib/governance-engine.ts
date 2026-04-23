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
  ruleOrigin?: string;
}

/**
 * GRAVITY GOVERNANCE ENGINE v1.6 (Self-Constitutional)
 * Architecture Type: NON-INTRUSIVE OVERLAY
 */
export const GovernanceEngine = {
  
  roleActionMap: {
    'START_WORKFLOW': ['EXECUTOR', 'ADMIN'],
    'APPROVE_STEP': ['APPROVER', 'ADMIN'],
    'REJECT_STEP': ['APPROVER', 'ADMIN'],
    'TRIGGER_RECOVERY': ['ADMIN'],
    'FORCE_UNLOCK': ['ADMIN'],
    'RECOVER': ['ADMIN']
  } as Record<string, GovernanceRole[]>,

  // 1. Dynamic Rule Fetcher (v1.6)
  fetchActiveRules: async (sessionId: string) => {
    const { data: rules } = await supabase
      .from('governance_rules')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_active', true)
      .order('priority', { ascending: false });
    return rules || [];
  },

  // 2. Permission Validation (v1.6 Dynamic)
  validateExecutionPermission: async (
    sessionId: string, 
    action: string, 
    userRole: GovernanceRole,
    projectedRisk: number = 0
  ): Promise<GovernanceDecision> => {
    
    // A. Check Shadow Execution
    const shadowDetected = await GovernanceEngine.detectShadowActivity(sessionId);

    // B. Replay Protection
    const signature = await GovernanceEngine.generateSignature(sessionId, action);
    const isSignatureValid = await GovernanceMemory.verifySignature(sessionId, signature);
    if (!isSignatureValid) {
      return { allowed: false, requiresApproval: false, reason: 'REPLAY_ATTEMPT_DETECTED', shadowDetected };
    }

    // C. Fetch Adaptive State
    const { data: govState } = await supabase.from('governance_state').select('*').eq('session_id', sessionId).single();
    const mode: GovernanceMode = govState?.current_mode || 'BALANCED_MODE';
    const thresholdAdj = govState?.approval_threshold_adj || 0;

    // D. DYNAMIC CONSTITUTION VALIDATION (v1.6)
    const activeRules = await GovernanceEngine.fetchActiveRules(sessionId);
    
    // Priority-based Rule Evaluation
    for (const rule of activeRules) {
        if (rule.condition_type === 'ACTION' && rule.condition_value.pattern === action) {
            return {
                allowed: rule.action !== 'BLOCK',
                requiresApproval: rule.action === 'REQUIRE_APPROVAL',
                reason: `CONSTITUTIONAL_RULE_${rule.id}`,
                shadowDetected,
                signature,
                ruleOrigin: rule.id
            };
        }
        if (rule.condition_type === 'RISK' && projectedRisk > rule.condition_value.threshold) {
             return { allowed: false, requiresApproval: true, reason: 'DYNAMIC_RISK_LIMIT', shadowDetected, signature };
        }
    }

    // E. Static Role Fallback
    const allowedRoles = GovernanceEngine.roleActionMap[action];
    const hasRole = allowedRoles?.includes(userRole);
    
    if (!hasRole) {
      await GovernanceEngine.logGovernanceTrace({
        sessionId, action, userRole, isBlocked: true, isApproved: false, 
        reason: `INSUFFICIENT_PERMISSIONS: ${mode}`, shadowDetected, signature, projectedRiskAtTime: projectedRisk
      });
      return { allowed: false, requiresApproval: false, reason: 'GOVERNANCE_BLOCKED', shadowDetected };
    }

    // F. Mode-based Overrides
    let requiresApproval = action === 'FORCE_UNLOCK' || action === 'TRIGGER_RECOVERY' || mode === 'INVESTIGATIVE_MODE';
    if (mode === 'STRICT_MODE' && projectedRisk > 0.2) requiresApproval = true;

    return { allowed: true, requiresApproval, shadowDetected, signature };
  },

  // 3. Signature Generation
  generateSignature: async (sessionId: string, action: string) => {
    const { data: state } = await supabase.from('governance_state').select('current_mode').eq('session_id', sessionId).single();
    const encoder = new TextEncoder();
    const data = encoder.encode(`${sessionId}-${action}-${new Date().toISOString().slice(0, 13)}-${state?.current_mode}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // 4. Trace Logging
  logGovernanceTrace: async (trace: {
    sessionId: string; action: string; userRole: string; isBlocked: boolean;
    isApproved: boolean; reason?: string; shadowDetected: boolean;
    signature?: string; projectedRiskAtTime?: number;
  }) => {
    return await supabase.from('governance_traces').insert({
      session_id: trace.sessionId, action: trace.action, user_role: trace.userRole,
      is_blocked: trace.isBlocked, is_approved: trace.isApproved, reason: trace.reason,
      shadow_detected: trace.shadowDetected, execution_signature: trace.signature,
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
