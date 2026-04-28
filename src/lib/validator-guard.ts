import { KernelSecurity } from './kernel-security';
import { ExecutionPhase } from './self-stability-loop';

export enum ValidatorType {
  PRE_VALIDATOR = 'PRE_VALIDATOR',
  POST_VALIDATOR = 'POST_VALIDATOR',
  LOOP_VALIDATOR = 'LOOP_VALIDATOR',
  FINAL_GUARD = 'FINAL_GUARD'
}

export interface ValidationContext {
  meis_id: string;
  step_id: string;
  execution_phase: ExecutionPhase;
  validator_id: ValidatorType;
  trace_ref: string;
  payload: any;
  signature: string;
  seed: string;
  runtime_instance_id: string;
  previous_chain_hash: string;
}

export interface ValidatorAttestation {
  status: 'VALID' | 'INVALID';
  reason?: string;
  proof: string;
  validator_hash: string;
  validator_signature: string;
}

export class ValidatorGuard {
  private static readonly SOURCE_IDENTITY = "ValidatorGuard_v1.0_DETERMINISTIC";
  
  static getIdentityHash(): string {
    let hash = 0;
    for (let i = 0; i < this.SOURCE_IDENTITY.length; i++) {
        hash = ((hash << 5) - hash) + this.SOURCE_IDENTITY.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  static generateAttestation(status: 'VALID' | 'INVALID', reason: string, context: any): ValidatorAttestation {
    const vHash = this.getIdentityHash();
    
    // Ensure Kernel locks our identity
    KernelSecurity.lockValidatorIntegrity(vHash);

    const proof = KernelSecurity.signInternal(
      context.meis_id, context.step_id, context.execution_phase,
      context.validator_id, context.trace_ref, { status, reason },
      context.seed, context.runtime_instance_id
    );
    
    return {
      status,
      reason,
      proof,
      validator_hash: vHash,
      validator_signature: KernelSecurity.signValidatorAttestation(vHash)
    };
  }

  static enforceCompleteness(context: any, meis: any, runtime_state: any): ValidatorAttestation {
    try {
        // 1. Field Presence
        const REQUIRED_FIELDS = [
          "meis_id", "step_id", "execution_phase", 
          "validator_id", "trace_ref", "payload", 
          "signature", "seed", "runtime_instance_id",
          "previous_chain_hash"
        ];

        for (const field of REQUIRED_FIELDS) {
          if (context[field] === undefined || context[field] === null) {
            throw new Error(`🚫 HARD_FAIL: INVALID_CONTEXT_INTEGRITY - Missing required field: ${field}`);
          }
        }

        // 2. Field Type Integrity
        if (typeof context.meis_id !== 'string' || context.meis_id.trim() === '') {
            throw new Error("🚫 HARD_FAIL: INVALID_CONTEXT_INTEGRITY - Invalid meis_id type");
        }
        if (typeof context.step_id !== 'string') {
            throw new Error("🚫 HARD_FAIL: INVALID_CONTEXT_INTEGRITY - Invalid step_id type");
        }
        if (!Object.values(ExecutionPhase).includes(context.execution_phase)) {
            throw new Error("🚫 HARD_FAIL: INVALID_CONTEXT_INTEGRITY - Invalid execution_phase type");
        }
        if (!Object.values(ValidatorType).includes(context.validator_id)) {
            throw new Error("🚫 HARD_FAIL: INVALID_CONTEXT_INTEGRITY - Invalid validator_id type");
        }
        if (typeof context.trace_ref !== 'string' || !context.trace_ref.startsWith('k-trace:')) {
            throw new Error("🚫 HARD_FAIL: INVALID_CONTEXT_INTEGRITY - Invalid trace_ref type");
        }
        if (typeof context.payload !== 'object' || (context.validator_id !== ValidatorType.FINAL_GUARD && Object.keys(context.payload).length === 0)) {
            throw new Error("🚫 HARD_FAIL: INVALID_CONTEXT_INTEGRITY - Invalid payload type/empty");
        }

        // 3. Referential Integrity
        const stepExists = meis.step_sequence?.some((s: any) => s.id === context.step_id || context.step_id === 'SYSTEM');
        if (!stepExists) {
            throw new Error("🚫 HARD_FAIL: INVALID_CONTEXT_INTEGRITY - step_id does not exist in MEIS");
        }

        // 4. Context Consistency
        if (context.execution_phase !== runtime_state.currentPhase) {
            throw new Error("🚫 HARD_FAIL: INVALID_CONTEXT_INTEGRITY - execution_phase mismatch");
        }
        if (context.meis_id !== runtime_state.meisId) {
            throw new Error("🚫 HARD_FAIL: INVALID_CONTEXT_INTEGRITY - meis_id mismatch");
        }
        if (context.seed !== runtime_state.execution_seed) {
            throw new Error("🚫 HARD_FAIL: SEED_TAMPERING_DETECTED");
        }
        if (context.runtime_instance_id !== runtime_state.runtime_instance_id) {
            throw new Error("🚫 HARD_FAIL: INVALID_CONTEXT_INTEGRITY - runtime_instance_id mismatch");
        }

        return this.generateAttestation('VALID', 'COMPLETENESS_ENFORCED', context);
    } catch (e: any) {
        return this.generateAttestation('INVALID', e.message, context);
    }
  }

  static verifyChainContext(context: any, runtime_state: any, meis: any): ValidatorAttestation {
    try {
        // 1. Previous Chain Hash Enforcement
        if (context.previous_chain_hash !== runtime_state.last_chain_hash) {
          throw new Error("🚫 HARD_FAIL: CHAIN_DESYNC_DETECTED");
        }

        // 2. Next Valid Step Enforcement
        if (context.step_id !== 'SYSTEM' && !runtime_state.stepExecutionLog.some((l: any) => l.stepId === context.step_id && l.status === 'COMPLETED')) {
            const step = meis.step_sequence.find((s: any) => s.id === context.step_id);
            if (step) {
                const completed = runtime_state.stepExecutionLog.filter((l: any) => l.status === 'COMPLETED').map((l: any) => l.stepId);
                const deps = step.depends_on || [];
                const depsMet = deps.every((d: string) => completed.includes(d));
                if (!depsMet) {
                    throw new Error("🚫 HARD_FAIL: INVALID_EXECUTION_ORDER");
                }
            }
        }

        // 3. Trace Binding Enforcement
        if (!KernelSecurity.verifyTraceBinding(context.trace_ref, context.seed, context.previous_chain_hash)) {
          throw new Error("🚫 HARD_FAIL: INVALID_TRACE_BINDING");
        }

        return this.generateAttestation('VALID', 'CHAIN_CONTEXT_VERIFIED', context);
    } catch (e: any) {
        return this.generateAttestation('INVALID', e.message, context);
    }
  }
}
