// L5 — Fidelity Scoring System
// Combines model self-assessment with structural heuristics.
import type { OrchestrationCycle } from './types';

export interface FidelityScore {
  confidence: number;   // how sure the cycle is
  divergence: number;   // how much output differs from prior cycle (0=identical, 1=opposite)
  stability: number;    // how consistent across cycles
  overall: number;      // weighted aggregate
  passed: boolean;      // overall >= threshold
}

const PASS_THRESHOLD = 0.7;

/** Compute textual divergence between two strings (1 - jaccard on tokens). */
function textualDivergence(a: string, b: string): number {
  const ta = new Set(a.toLowerCase().split(/\W+/).filter((t) => t.length > 2));
  const tb = new Set(b.toLowerCase().split(/\W+/).filter((t) => t.length > 2));
  if (ta.size === 0 && tb.size === 0) return 0;
  let inter = 0;
  ta.forEach((t) => { if (tb.has(t)) inter++; });
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : 1 - inter / union;
}

export function scoreCycle(current: OrchestrationCycle, prior: OrchestrationCycle | null): FidelityScore {
  const sa = current.self_assessment ?? { confidence: 0.5, divergence: 0.5, stability: 0.5 };

  // Structural confidence: penalize empty fields
  const structuralConf =
    (current.think?.length > 40 ? 0.25 : 0.1) +
    (current.simulate?.length >= 2 ? 0.25 : 0.1) +
    (current.proposed_spec?.components?.length > 0 ? 0.25 : 0.1) +
    (current.evaluate?.weaknesses ? 0.25 : 0.1);

  const confidence = clamp01((sa.confidence + structuralConf) / 2);

  // Divergence: prefer textual delta to model's self-report
  const divergence = prior
    ? clamp01(
        (textualDivergence(
          current.proposed_spec?.summary ?? '',
          prior.proposed_spec?.summary ?? '',
        ) +
          sa.divergence) / 2,
      )
    : 0.5;

  // Stability: low divergence + high confidence + addressed weaknesses
  const addressedWeaknesses = prior?.evaluate?.weaknesses?.length
    ? current.adjust && current.adjust.length > 20
      ? 1
      : 0.3
    : 1;
  const stability = clamp01((1 - divergence) * 0.5 + confidence * 0.3 + addressedWeaknesses * 0.2);

  const overall = confidence * 0.5 + stability * 0.4 + (1 - divergence) * 0.1;

  return {
    confidence: round(confidence),
    divergence: round(divergence),
    stability: round(stability),
    overall: round(overall),
    passed: overall >= PASS_THRESHOLD,
  };
}

/** L6 — Self-correction trigger: returns true if another cycle should run. */
export function shouldSelfCorrect(score: FidelityScore, cycleIdx: number, maxCycles: number): boolean {
  if (cycleIdx + 1 >= maxCycles) return false;
  if (score.passed) return false;
  return true;
}

function clamp01(n: number): number { return Math.max(0, Math.min(1, n)); }
function round(n: number): number { return Math.round(n * 100) / 100; }
