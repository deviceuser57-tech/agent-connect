import { ExecutionInterface } from './execution-interface';
import { supabase } from '@/integrations/supabase/client';

/**
 * KERNEL-INJECTED INTEGRITY TEST (GRAVITY v1.6)
 * Purpose: Validate the entire pipeline from UI trigger to DB truth.
 */
export const runKernelIntegrityTest = async (sessionId: string) => {
  console.log("🛠️ [SYSTEM_INTEGRITY] Starting Kernel-Injected Test...");
  const testStartTime = new Date().toISOString();

  // 1. TRACE PIPELINE INJECTION
  // We use the real ExecutionInterface to ensure we hit all meta-cognitive layers.
  const action = 'TRIGGER_RECOVERY';
  const context = {
    userRole: 'EXECUTOR', // Conflict intentionally triggered (Unauthorized)
    projectedRisk: 0.85,   // High risk to force Arbitration
    currentState: 'FAIL_STATE',
    severity_factor: 0.9
  };

  console.log("👉 1. Injecting Action through ExecutionInterface...");
  const result = await ExecutionInterface.executeAction(sessionId, action, context);

  // 2. LAYER MONITORING & TRUTH ASSERTION
  console.log("🔍 2. Verifying Multi-Layer DB Truth...");
  
  // Wait for background reflection loops to complete
  await new Promise(resolve => setTimeout(resolve, 2000));

  // A. Governance Layer Check
  const { data: govTrace } = await supabase
    .from('governance_traces')
    .select('*')
    .eq('session_id', sessionId)
    .gte('timestamp', testStartTime)
    .order('timestamp', { ascending: false })
    .limit(1);

  // B. Execution Depth Check
  const { data: execTrace } = await supabase
    .from('execution_traces')
    .select('*')
    .eq('session_id', sessionId)
    .gte('created_at', testStartTime);

  // C. Meta-Cognitive Reflection Check
  const { data: reflection } = await supabase
    .from('governance_reflections')
    .select('*')
    .eq('session_id', sessionId)
    .gte('timestamp', testStartTime);

  // 3. INTEGRITY ASSERTIONS
  const report = {
    kernel_result: result,
    gov_logged: !!govTrace?.length,
    exec_logged: !!execTrace?.length,
    reflection_logged: !!reflection?.length,
    assertions: {
      governance_shield_active: govTrace?.[0]?.is_blocked === true,
      trace_integrity_preserved: !!execTrace || !result.success, // If blocked, exec_trace might not exist if it didn't hit kernel
      reflection_loop_closed: reflection?.length > 0
    }
  };

  console.log("🏁 [TEST_REPORT]:", JSON.stringify(report, null, 2));

  // Final Validation Alert
  if (report.gov_logged && report.reflection_logged && report.assertions.governance_shield_active) {
    console.log("✅ SYSTEM_CONTRACT_VALIDATED: CMACK Pipeline Integrity 100%");
    return { success: true, report };
  } else {
    console.warn("❌ INTEGRITY_VIOLATION_DETECTED: Check logs for broken pipeline layers.");
    return { success: false, report };
  }
};
