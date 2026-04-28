/**
 * AC-009.9 — Trust Drift Tracking Layer (TDTL)
 * Monitoring the degradation of system truth over time.
 */

export enum TrustState {
  STABLE = 'STABLE',
  DEGRADED = 'DEGRADED',
  CRITICAL = 'CRITICAL',
  UNTRUSTED = 'UNTRUSTED'
}

export type DriftCategory = 'ROOT' | 'ENTROPY' | 'ENVIRONMENT' | 'VALIDATION';

export interface DriftSignal {
  anchor_id: string;
  category: DriftCategory;
  expected_state: string;
  observed_state: string;
  drift_score: number; // 0.0 (Perfect Trust) to 1.0 (Total Degradation)
  timestamp: string;
}

export class TrustDriftTracker {
  private static SIGNALS: DriftSignal[] = [];
  private static GLOBAL_SCORE: number = 0;

  /**
   * Records a new drift signal and recalculates the global trust state.
   */
  static recordSignal(signal: Omit<DriftSignal, 'timestamp'>): void {
    const fullSignal: DriftSignal = {
      ...signal,
      timestamp: new Date().toISOString()
    };
    
    this.SIGNALS.push(fullSignal);
    this.recalculateGlobalScore();
    
    console.log(`📡 [TDTL] Signal: ${signal.anchor_id} | Category: ${signal.category} | Drift: ${signal.drift_score.toFixed(3)}`);
    
    if (this.getTrustState() === TrustState.CRITICAL) {
      console.warn("⚠️ [TDTL] SYSTEM TRUST IN CRITICAL STATE. DEGRADATION DETECTED.");
    }
  }

  /**
   * Aggregates signals into a global drift score.
   * Uses weighted max-pooling per category to ensure critical failures are not averaged out.
   */
  private static recalculateGlobalScore(): void {
    if (this.SIGNALS.length === 0) {
      this.GLOBAL_SCORE = 0;
      return;
    }

    const CATEGORY_WEIGHTS: Record<DriftCategory, number> = {
      ROOT: 0.5,        // Root trust failure is catastrophic
      VALIDATION: 0.2,  // Logic failure is significant
      ENTROPY: 0.2,     // Predictability is dangerous
      ENVIRONMENT: 0.1  // Environmental noise is least critical
    };

    const categoryMax: Record<DriftCategory, number> = {
      ROOT: 0,
      VALIDATION: 0,
      ENTROPY: 0,
      ENVIRONMENT: 0
    };

    for (const signal of this.SIGNALS) {
      categoryMax[signal.category] = Math.max(categoryMax[signal.category], signal.drift_score);
    }

    let weightedSum = 0;
    for (const category in CATEGORY_WEIGHTS) {
      weightedSum += categoryMax[category as DriftCategory] * CATEGORY_WEIGHTS[category as DriftCategory];
    }

    this.GLOBAL_SCORE = weightedSum;
  }

  static getTrustState(): TrustState {
    const score = this.GLOBAL_SCORE;
    if (score < 0.2) return TrustState.STABLE;
    if (score < 0.5) return TrustState.DEGRADED;
    if (score < 0.8) return TrustState.CRITICAL;
    return TrustState.UNTRUSTED;
  }

  static getGlobalScore(): number {
    return this.GLOBAL_SCORE;
  }

  static getSignals(): DriftSignal[] {
    return [...this.SIGNALS];
  }

  /**
   * Generates a summary report of trust degradation.
   */
  static getDriftReport() {
    return {
      state: this.getTrustState(),
      global_score: this.GLOBAL_SCORE,
      active_signals: this.SIGNALS.length,
      last_signal: this.SIGNALS[this.SIGNALS.length - 1]
    };
  }
}
