import { KernelSecurity } from './kernel-security';
import { ValidatorAttestation } from './validator-guard';
import { TrustManifest } from './trust-manifest';
import { TrustDriftTracker } from './trust-drift-tracker';

export class GovernanceAuditor {
  private static COMMIT_LOG: string[] = [];

  /**
   * Independently audits the execution context and validation proofs.
   * This auditor acts as an out-of-band verifier to break circular trust dependencies.
   */
  static async audit(
    sessionId: string,
    stepId: string,
    attestations: ValidatorAttestation[],
    lastChainHash: string,
    newChainHash: string
  ): Promise<boolean> {
    console.log(`🔍 [GovernanceAuditor] Auditing session ${sessionId}, step ${stepId}...`);

    // 1. Verify Attestation Integrity
    for (const att of attestations) {
      if (!KernelSecurity.verifyValidatorSignature(att.validator_hash, att.validator_signature)) {
        TrustDriftTracker.recordSignal({
          anchor_id: 'TA-01-KERNEL-LOGIC',
          category: 'VALIDATION',
          expected_state: 'VALIDATOR_IDENTITY_VERIFIED',
          observed_state: 'UNTRUSTED_VALIDATOR_IDENTITY',
          drift_score: 0.8
        });
        console.error(`🛑 [Auditor] UNTRUSTED_VALIDATOR detected in attestation for ${stepId}`);
        return false;
      }
    }

    // 2. Verify Chain Transition Logic
    if (newChainHash === lastChainHash) {
      console.error("🛑 [Auditor] INVALID_CHAIN_TRANSITION: Hash collision or stagnation detected.");
      return false;
    }

    // 3. Independent State Tracking
    // The auditor maintains a separate, non-bypassable log of chain transitions
    this.COMMIT_LOG.push(newChainHash);

    console.log(`✅ [Auditor] Audit for ${stepId} SUCCESS. Trust anchored.`);
    return true;
  }

  static getAuditLog(): string[] {
    return [...this.COMMIT_LOG];
  }
}
