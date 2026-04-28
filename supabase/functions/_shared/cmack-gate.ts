// CMACK Cognitive Consistency Gate (EDGE Layer)

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cmack-source, x-cmack-signature, x-cmack-trace",
};

/**
 * AC-009.6: Edge-to-Kernel Consistency Gate
 * Validates that the request originates from the authorized MEIS pipeline
 * and that the system is in a stable state.
 */
export async function validateCmackGate(req: Request, supabase: any) {
  const source = req.headers.get("x-cmack-source");
  const signature = req.headers.get("x-cmack-signature");
  const traceRef = req.headers.get("x-cmack-trace");

  // 1. Source Validation (Constitutional Lock)
  if (source !== "MEIS_PIPELINE") {
    console.error(`🛑 [EdgeGate] REJECTED: Source '${source}' is not authorized.`);
    return { 
      allowed: false, 
      error: "403: Execution outside MEIS pipeline is forbidden by Constitution.",
      status: 403 
    };
  }

  // 2. Signature Validation
  if (!signature || !signature.startsWith("sha256:sys_locked:")) {
    console.error(`🛑 [EdgeGate] REJECTED: Invalid or missing CMACK signature.`);
    return { 
      allowed: false, 
      error: "401: CMACK Signature Verification Failed.",
      status: 401 
    };
  }

  // 3. Kernel Stability Check (LOOP_CHECK)
  try {
    const { data: govState, error: govError } = await supabase
      .from('governance_state')
      .select('current_mode, governance_bias')
      .maybeSingle();

    if (!govError && govState) {
      if (govState.governance_bias > 0.9) {
        console.error(`🛑 [EdgeGate] STALL: Kernel drift too high (${govState.governance_bias}).`);
        return { 
          allowed: false, 
          error: "409: KERNEL_STALL - Stability loop blocked execution due to excessive drift.",
          status: 409 
        };
      }
    }
  } catch (e) {
    console.warn(`⚠️ [EdgeGate] Stability check bypassed: ${e.message}`);
  }

  return { allowed: true, traceRef };
}
