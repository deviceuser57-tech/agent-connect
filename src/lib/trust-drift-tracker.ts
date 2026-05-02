import { TrustManifest } from './trust-manifest';
import { KernelSecurity } from './kernel-security';

/**
 * AC-009.9 — Trust Drift Tracking Layer (TDTL) HARD CLOSURE + TTAL
 * Deterministic Trust Governance Engine with Attestation Layer
 */

export enum TrustState {
  STABLE = 'STABLE',
  DEGRADED = 'DEGRADED',
  CRITICAL = 'CRITICAL',
  QUARANTINED = 'QUARANTINED',
  UNTRUSTED = 'UNTRUSTED'
}

export type DriftType = 'MEASURABLE' | 'STRUCTURAL' | 'UNOBSERVABLE';
export type DriftSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type DriftCategory = 'ROOT' | 'ENTROPY' | 'ENVIRONMENT' | 'VALIDATION';

export interface AttestedDriftSignal {
  anchor_id: string;
  category: DriftCategory;
  drift_type: DriftType;
  severity: DriftSeverity;
  expected_state: string;
  observed_state: string;
  source_id: string;
  timestamp: string;
  signal_hash: string;
  signature: string;
}

export enum FailureType {
  HARD_FAILURE = 'HardFailure',
  SOFT_FAILURE = 'SoftFailure',
  EPISTEMIC_FAILURE = 'EpistemicFailure'
}

export interface AttestedDriftState {
  state: TrustState;
  failure_semantics: FailureType | null;
  derived_from_signals_hash: string;
  validator_hash: string;
  kernel_signature: string;
  chain_hash: string;
}

export class TrustDriftTracker {
  private static SIGNALS: AttestedDriftSignal[] = [];
  private static CURRENT_STATE: TrustState = TrustState.STABLE;
  private static CHAIN_HASH: string = "TTAL_GENESIS";
  private static VALIDATOR_HASH = "TDTL_ENGINE_V1";

  /**
   * Helper to construct and sign a signal from raw data.
   */
  static createSignedSignal(
    raw: Omit<AttestedDriftSignal, 'signal_hash' | 'signature' | 'timestamp'>
  ): AttestedDriftSignal {
    const timestamp = new Date().toISOString();
    const payload = JSON.stringify({ ...raw, timestamp });
    const signal_hash = KernelSecurity.hashDriftData(payload);
    const signature = KernelSecurity.signDriftData(signal_hash);
    
    return {
      ...raw,
      timestamp,
      signal_hash,
      signature
    };
  }

  /**
   * Evaluates incoming signal against hard epistemological limits.
   */
  static enforceEpistemologicalLimits(signal: Pick<AttestedDriftSignal, 'drift_type' | 'severity' | 'category'>) {
    const limits = TrustManifest.monitoring_limits;
    if (!limits) throw new Error("🚫 HARD_FAIL: TrustManifest monitoring_limits not found.");

    let resolvedType = signal.drift_type;
    let resolvedSeverity = signal.severity;

    if (signal.category === 'ENVIRONMENT' && limits['hardware'] === 'UNOBSERVABLE') resolvedType = 'UNOBSERVABLE';
    else if (signal.category === 'ENTROPY' && limits['entropy_source'] === 'PARTIAL') {
      if (signal.drift_type === 'STRUCTURAL') resolvedType = 'UNOBSERVABLE';
    } else if (signal.category === 'VALIDATION' && limits['external_validators'] === 'ASSUMED_TRUST') {
       if (signal.drift_type !== 'MEASURABLE') resolvedType = 'UNOBSERVABLE';
    }

    return { drift_type: resolvedType, severity: resolvedSeverity };
  }

  /**
   * Evaluates rules deterministically. Can be run independently by Auditor.
   */
  static computeStateFromSignals(signals: AttestedDriftSignal[]): TrustState {
    if (signals.length === 0) return TrustState.STABLE;
    if (signals.some(s => s.severity === 'CRITICAL')) return TrustState.UNTRUSTED;
    if (signals.some(s => s.drift_type === 'UNOBSERVABLE')) return TrustState.QUARANTINED;
    return TrustState.STABLE; // Only using strict rules now, score fallback removed per TTAL purity
  }

  static getFailureSemanticsForState(state: TrustState): FailureType | null {
    if (state === TrustState.UNTRUSTED) return FailureType.HARD_FAILURE;
    if (state === TrustState.QUARANTINED) return FailureType.EPISTEMIC_FAILURE;
    if (state === TrustState.CRITICAL) return FailureType.SOFT_FAILURE;
    return null;
  }

  /**
   * Records a signed drift signal.
   * REJECTS unsigned signals.
   */
  static recordSignal(signal: AttestedDriftSignal): void {
    // 1. Verify Signature
    if (!signal.signal_hash || !signal.signature) {
      throw new Error("🚫 HARD_FAIL: REJECTED_UNSIGNED_DRIFT_SIGNAL");
    }
    const expectedSig = KernelSecurity.signDriftData(signal.signal_hash);
    if (signal.signature !== expectedSig) {
      throw new Error("🚫 HARD_FAIL: INVALID_DRIFT_SIGNAL_SIGNATURE");
    }

    // 2. Accept and Evaluate
    this.SIGNALS.push(signal);
    this.CURRENT_STATE = this.computeStateFromSignals(this.SIGNALS);

    // 3. Update Hash Chain (H(prev + signal + state))
    const stateHash = KernelSecurity.hashDriftData(this.CURRENT_STATE);
    this.CHAIN_HASH = KernelSecurity.hashDriftData(`${this.CHAIN_HASH}:${signal.signal_hash}:${stateHash}`);
    
    console.log(`📡 [TTAL] Attested Signal Applied: ${signal.anchor_id} -> Chain: ${this.CHAIN_HASH}`);
  }

  /**
   * Outputs the fully attested drift state.
   */
  static getAttestedState(): AttestedDriftState {
    const derived_from_signals_hash = KernelSecurity.hashDriftData(JSON.stringify(this.SIGNALS.map(s => s.signal_hash)));
    const statePayload = `${this.CURRENT_STATE}:${derived_from_signals_hash}:${this.VALIDATOR_HASH}`;
    const stateHash = KernelSecurity.hashDriftData(statePayload);
    const kernel_signature = KernelSecurity.signDriftData(stateHash);

    return {
      state: this.CURRENT_STATE,
      failure_semantics: this.getFailureSemanticsForState(this.CURRENT_STATE),
      derived_from_signals_hash,
      validator_hash: this.VALIDATOR_HASH,
      kernel_signature,
      chain_hash: this.CHAIN_HASH
    };
  }

  static getSignals(): AttestedDriftSignal[] {
    return [...this.SIGNALS];
  }

  static getDriftReport() {
    return this.getAttestedState();
  }
}

