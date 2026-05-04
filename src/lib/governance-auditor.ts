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
        TrustDriftTracker.recordSignal(TrustDriftTracker.createSignedSignal({
          anchor_id: 'TA-01-KERNEL-LOGIC',
          category: 'VALIDATION',
          drift_type: 'UNOBSERVABLE', // 🔴 TDTL HARD CLOSURE: Disagreement = UNOBSERVABLE
          severity: 'CRITICAL',       // 🔴 Forces QUARANTINED state
          expected_state: 'VALIDATOR_IDENTITY_VERIFIED',
          observed_state: 'UNTRUSTED_VALIDATOR_IDENTITY',
          node_id: 'VALIDATOR::EXTERNAL',
          dependency_chain: [],
          causal_reference: `validator_check_${stepId}`
        }));
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

  /**
   * AC-009.9 TTAL: Independent Meta-Drift Detection & Attestation Verification
   */
  static verifyDriftAttestation(
    attestedState: import('./trust-drift-tracker').AttestedDriftState,
    signals: import('./trust-drift-tracker').AttestedDriftSignal[],
    meis?: any
  ): boolean {
    console.log(`🔍 [Auditor] Verifying TTAL Drift Attestation...`);

    // 1. Verify Kernel Signature
    const statePayload = `${attestedState.state}:${attestedState.derived_from_signals_hash}:${attestedState.validator_hash}:${attestedState.causal_scope}:${attestedState.affected_nodes.join(',')}`;
    const expectedHash = KernelSecurity.hashDriftData(statePayload);
    const expectedSig = KernelSecurity.signDriftData(expectedHash);
    
    if (attestedState.kernel_signature !== expectedSig) {
      console.error(`🛑 [Auditor] META-DRIFT: Invalid Drift State Signature!`);
      throw new Error('EpistemicFailure: META_DRIFT_DETECTED');
    }

    // 2. Verify Signals Integrity
    const recomputedSignalsHash = KernelSecurity.hashDriftData(JSON.stringify(signals.map(s => s.signal_hash)));
    if (recomputedSignalsHash !== attestedState.derived_from_signals_hash) {
      console.error(`🛑 [Auditor] META-DRIFT: Signals Hash Mismatch!`);
      throw new Error('EpistemicFailure: META_DRIFT_DETECTED');
    }

    // 3. Independent Recomputation (Logic Verification) & Hash Chain Verification
    const { TrustDriftTracker } = require('./trust-drift-tracker');
    let recomputedChain = "TTAL_GENESIS";
    let currentSignals: import('./trust-drift-tracker').AttestedDriftSignal[] = [];
    
    for (const signal of signals) {
      currentSignals.push(signal);
      const tempState = TrustDriftTracker.computeStateFromSignals(currentSignals);
      const stateHash = KernelSecurity.hashDriftData(tempState);
      recomputedChain = KernelSecurity.hashDriftData(`${recomputedChain}:${signal.signal_hash}:${stateHash}`);
    }

    if (recomputedChain !== attestedState.chain_hash) {
      console.error(`🛑 [Auditor] META-DRIFT: Chain Invalid! Recomputed: ${recomputedChain}, Reported: ${attestedState.chain_hash}`);
      throw new Error('EpistemicFailure: META_DRIFT_DETECTED');
    }

    const recomputedState = TrustDriftTracker.computeStateFromSignals(signals);
    if (recomputedState !== attestedState.state) {
      console.error(`🛑 [Auditor] META-DRIFT: Logic Deviation Detected! Recomputed: ${recomputedState}, Reported: ${attestedState.state}`);
      throw new Error('EpistemicFailure: META_DRIFT_DETECTED');
    }

    // 4. Causal Drift Trace Binding Verification
    if (meis && meis.step_sequence) {
      const allNodeIds = new Set(meis.step_sequence.map((s: any) => s.id));
      for (const signal of signals) {
        if (!signal.node_id || !signal.dependency_chain || !signal.causal_reference) {
          throw new Error('EpistemicFailure: INVALID_CAUSAL_DRIFT - Missing causal binding fields');
        }
        if (!signal.node_id.includes('::') && !allNodeIds.has(signal.node_id)) {
          throw new Error('EpistemicFailure: INVALID_CAUSAL_DRIFT - node_id not in execution graph');
        }
        for (const dep of signal.dependency_chain) {
          if (!dep.includes('::') && !allNodeIds.has(dep)) {
            throw new Error('EpistemicFailure: INVALID_CAUSAL_DRIFT - dependency_chain invalid');
          }
        }
      }
    }

    console.log(`✅ [Auditor] TTAL Attestation Verified. Valid state: ${attestedState.state}`);
    return true;
  }
}

