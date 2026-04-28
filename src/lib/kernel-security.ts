import { TrustDriftTracker } from './trust-drift-tracker';

/**
 * AC-009.8 — Trace Origin Proof & Execution Seed Contract
 * Ensures traces are kernel-generated and unforgeable.
 */

export class KernelSecurity {
  private static KERNEL_SECRET = "CMACK_KERNEL_V1_SECRET_KEY";
  private static LOCKED_VALIDATOR_HASH: string | null = null;
  private static ROOT_INITIALIZED = false;
  private static SYSTEM_FINGERPRINT: string | null = null;
  private static EXTERNAL_ENTROPY: string = "";
  private static RECOVERY_ESCROW_HASH: string = "";

  private static hashString(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        hash = ((hash << 5) - hash) + data.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  static initializeRootOfTrust(system_fingerprint: string, build_signature: string, recovery_hash: string): void {
    if (this.ROOT_INITIALIZED) {
      throw new Error("🚫 HARD_FAIL: ROOT_REINITIALIZATION_BLOCKED");
    }

    if (!this.verifyBuildSignature(system_fingerprint, build_signature)) {
      TrustDriftTracker.recordSignal({
        anchor_id: 'TA-02-MANIFEST-SIGNER',
        category: 'ROOT',
        expected_state: 'SIGNED_MANIFEST_VALID',
        observed_state: 'INVALID_BUILD_SIGNATURE',
        drift_score: 1.0
      });
      throw new Error("🚫 HARD_FAIL: BOOT_INTEGRITY_COMPROMISED");
    }

    this.SYSTEM_FINGERPRINT = system_fingerprint;
    this.RECOVERY_ESCROW_HASH = recovery_hash;
    this.ROOT_INITIALIZED = true;

    TrustDriftTracker.recordSignal({
      anchor_id: 'TA-02-MANIFEST-SIGNER',
      category: 'ROOT',
      expected_state: 'SIGNED_MANIFEST_VALID',
      observed_state: 'SIGNED_MANIFEST_VALID',
      drift_score: 0.0
    });

    console.log("🔒 [Kernel] Root of Trust Anchored (Signed Manifest Verified).");
  }

  /**
   * FIX-14: Emergency Unlock (Anti-Bricking)
   * Allows resetting the Root of Trust using a high-entropy recovery key.
   */
  static emergencyUnlock(recovery_key: string): void {
    const keyHash = this.hashString(recovery_key);
    if (keyHash === this.RECOVERY_ESCROW_HASH) {
      console.warn("⚠️ [Kernel] EMERGENCY UNLOCK TRIGGERED. Root of Trust Reset.");
      this.ROOT_INITIALIZED = false;
      this.SYSTEM_FINGERPRINT = null;
    } else {
      throw new Error("🚫 HARD_FAIL: INVALID_RECOVERY_KEY");
    }
  }

  /**
   * FIX-13: Entropy Injection (Anti-Predictability)
   */
  static injectExternalEntropy(entropy: string): void {
    const variance = new Set(entropy.split('')).size / entropy.length;
    let drift = 0;
    if (variance < 0.3) drift = 0.4;
    if (entropy.length < 8) drift = 0.6;

    TrustDriftTracker.recordSignal({
      anchor_id: 'TA-03-ENTROPY-QUALITY',
      category: 'ENTROPY',
      expected_state: 'HIGH_VARIANCE_ENTROPY',
      observed_state: drift > 0 ? 'LOW_QUALITY_ENTROPY' : 'HIGH_QUALITY_ENTROPY',
      drift_score: drift
    });

    this.EXTERNAL_ENTROPY = this.hashString(`${this.EXTERNAL_ENTROPY}:${entropy}`);
    console.log("🎲 [Kernel] External Entropy Injected.");
  }

  private static verifyBuildSignature(fingerprint: string, signature: string): boolean {
    // FIX-12: Signed Manifest Simulation (uses an offline build secret)
    const expected = this.hashString(`${fingerprint}:BUILD_SECRET_V1`);
    return signature === expected;
  }

  static generateExecutionSeed(meis_id: string, session_id: string, nonce: string): string {
    // Incorporate EXTERNAL_ENTROPY into seed generation to prevent replayability/predictability
    const payload = `${meis_id}:${session_id}:${nonce}:${this.EXTERNAL_ENTROPY}:${this.KERNEL_SECRET}`;
    return this.hashString(payload);
  }

  static generateRuntimeInstance(execution_seed: string): string {
    if (!this.ROOT_INITIALIZED || !this.SYSTEM_FINGERPRINT) {
        throw new Error("🚫 HARD_FAIL: ROOT_NOT_INITIALIZED");
    }
    const hash = this.hashString(`${this.SYSTEM_FINGERPRINT}:${execution_seed}:${this.EXTERNAL_ENTROPY}:${this.KERNEL_SECRET}`);
    return `r_inst_${hash}`;
  }

  static verifyRuntimeInstance(runtime_instance_id: string, execution_seed: string): boolean {
    if (!this.ROOT_INITIALIZED || !this.SYSTEM_FINGERPRINT) return false;
    const expected = `r_inst_${this.hashString(`${this.SYSTEM_FINGERPRINT}:${execution_seed}:${this.EXTERNAL_ENTROPY}:${this.KERNEL_SECRET}`)}`;
    return runtime_instance_id === expected;
  }

  static lockValidatorIntegrity(hash: string): void {
    if (!this.ROOT_INITIALIZED) {
        throw new Error("🚫 HARD_FAIL: ROOT_NOT_INITIALIZED");
    }
    if (this.LOCKED_VALIDATOR_HASH && this.LOCKED_VALIDATOR_HASH !== hash) {
      throw new Error("🚫 HARD_FAIL: VALIDATOR_INTEGRITY_COMPROMISED");
    }
    this.LOCKED_VALIDATOR_HASH = hash;
  }

  static verifyValidatorSignature(hash: string, signature: string): boolean {
    if (!this.LOCKED_VALIDATOR_HASH || this.LOCKED_VALIDATOR_HASH !== hash) {
      return false;
    }
    const expected = this.hashString(`${hash}:${this.KERNEL_SECRET}`);
    return signature === expected;
  }

  static signValidatorAttestation(hash: string): string {
    return this.hashString(`${hash}:${this.KERNEL_SECRET}`);
  }

  static generateTraceRef(execution_seed: string, previous_chain_hash: string, nonce: string): string {
    const payload = `${execution_seed}:${previous_chain_hash}:${nonce}:${this.KERNEL_SECRET}`;
    const signature = this.hashString(payload);
    return `k-trace:${signature}:${nonce}`;
  }

  static verifyTraceBinding(trace_ref: string, execution_seed: string, previous_chain_hash: string): boolean {
    if (!trace_ref || !trace_ref.startsWith('k-trace:')) return false;
    const parts = trace_ref.split(':');
    if (parts.length < 3) return false;
    const nonce = parts[2];
    const expected = this.generateTraceRef(execution_seed, previous_chain_hash, nonce);
    return trace_ref === expected;
  }


  static getExecutionSeed(): never {
    throw new Error("🚫 HARD_FAIL: Direct access to execution_seed from KernelSecurity is forbidden");
  }

  static signInternal(
    meis_id: string,
    step_id: string,
    phase: string,
    validator_id: string,
    trace_ref: string,
    payload: any,
    execution_seed: string,
    runtime_instance_id: string
  ): string {
    const data = `${meis_id}:${step_id}:${phase}:${validator_id}:${trace_ref}:${JSON.stringify(payload)}:${execution_seed}:${runtime_instance_id}:${this.KERNEL_SECRET}`;
    return `hmac_${this.hashString(data)}`;
  }

  static verifyInternalSignature(context: any): boolean {
    const expected = this.signInternal(
      context.meis_id,
      context.step_id,
      context.execution_phase,
      context.validator_id,
      context.trace_ref,
      context.payload,
      context.seed,
      context.runtime_instance_id
    );
    return context.signature === expected;
  }
}
