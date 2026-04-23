import { supabase } from '@/integrations/supabase/client';

export interface GovernanceRule {
  session_id: string;
  condition_type: string;
  condition_value: any;
  action: 'ALLOW' | 'BLOCK' | 'REQUIRE_APPROVAL';
  priority: number;
  confidence_score: number;
  origin_trace_id?: string;
}

/**
 * POLICY GENERATION ENGINE (GRAVITY v1.6)
 * Responsibilities: Generating new governance rules from historical conflict and success patterns.
 */
export const PolicyGenerator = {
  
  generateFromPattern: async (sessionId: string, pattern: {
    type: string;
    action: string;
    confidence: number;
    traceId: string;
  }) => {
    const newRule: GovernanceRule = {
      session_id: sessionId,
      condition_type: pattern.type,
      condition_value: { pattern: pattern.type },
      action: pattern.action as any,
      priority: 20, // Generated rules start with higher priority than defaults
      confidence_score: pattern.confidence,
      origin_trace_id: pattern.traceId
    };

    const { data } = await supabase.from('governance_rules').insert(newRule).select().single();
    
    console.log(`[CONSTITUTION] New Rule Spawned: ${pattern.type} -> ${pattern.action}`);
    return data;
  }
};
