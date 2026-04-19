// Phase 2 orchestrator — L0 (decompose), L1 (infer), L3 (vector recall),
// L4 (cyclic orchestration via edge fn), L5 (fidelity), L6 (self-correction).
import { supabase } from '@/integrations/supabase/client';
import {
  CognitiveDNA,
  ModeInference,
  DecomposedInput,
  MemoryRecord,
  OrchestrationCycle,
} from './types';
import { scoreCycle, shouldSelfCorrect, FidelityScore } from './fidelityScoring';

/** L0: lightweight client-side decomposition. */
export function decompose(input: string): DecomposedInput {
  const trimmed = input.trim();
  const ambiguities: string[] = [];
  const contradictions: string[] = [];
  if (trimmed.length < 20) ambiguities.push('Input is very short — intent may be unclear');
  if (/\bor\b/i.test(trimmed) && /\?/.test(trimmed)) ambiguities.push('Contains alternatives — may need clarification');
  if (/\bnot\b.*\band\b/i.test(trimmed)) contradictions.push('Possible negation contradiction');
  const entities = Array.from(new Set(
    (trimmed.match(/\b[A-Z][a-zA-Z]{2,}\b/g) ?? [])
      .filter((w) => !['The', 'And', 'For', 'This', 'That'].includes(w)),
  )).slice(0, 10);
  return { intent: trimmed.slice(0, 280), entities, ambiguities, contradictions };
}

/** L1 */
export async function inferMode(userInput: string, dna: CognitiveDNA): Promise<ModeInference> {
  const { data, error } = await supabase.functions.invoke('cognitive-l1-infer', {
    body: { user_input: userInput, dna: { hot_path: dna.hot_path } },
  });
  if (error) throw new Error(error.message);
  if (!data?.inference) throw new Error('L1 returned no inference');
  return data.inference as ModeInference;
}

/** Generate embedding via edge function. Returns null on failure. */
async function embedText(text: string): Promise<number[] | null> {
  try {
    const { data, error } = await supabase.functions.invoke('cognitive-embed', { body: { text } });
    if (error) return null;
    return (data?.embedding as number[] | null) ?? null;
  } catch {
    return null;
  }
}

/**
 * L3: episodic memory recall — pgvector cosine similarity (with keyword fallback).
 */
export async function recallMemory(
  workspaceId: string,
  contextSummary: string,
  limit = 5,
): Promise<MemoryRecord[]> {
  const embedding = await embedText(contextSummary);

  if (embedding && embedding.length > 0) {
    const { data, error } = await supabase.rpc('match_decision_memory' as never, {
      query_embedding: embedding,
      match_workspace: workspaceId,
      match_count: limit,
      min_similarity: 0.5,
    } as never);
    if (!error && Array.isArray(data) && data.length > 0) {
      return (data as unknown as MemoryRecord[]);
    }
  }

  // Fallback: keyword overlap (Phase 1 logic)
  const { data, error } = await supabase
    .from('decision_memory_graph' as never)
    .select('id, context_summary, fidelity_scores, outcome_feedback, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !data) return [];
  const tokens = new Set(contextSummary.toLowerCase().split(/\W+/).filter((t) => t.length > 3));
  const scored = (data as unknown as MemoryRecord[]).map((rec) => {
    const recTokens = new Set((rec.context_summary ?? '').toLowerCase().split(/\W+/));
    let overlap = 0;
    tokens.forEach((t) => { if (recTokens.has(t)) overlap++; });
    return { rec, score: overlap };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.rec);
}

/** L4 — invoke one orchestration cycle on the edge */
async function runCycle(params: {
  user_intent: string;
  decision_contract: unknown;
  memory_recall: MemoryRecord[];
  prior_cycles: OrchestrationCycle[];
  dna: CognitiveDNA;
}): Promise<OrchestrationCycle> {
  const { data, error } = await supabase.functions.invoke('cognitive-l4-orchestrate', {
    body: params,
  });
  if (error) throw new Error(error.message);
  if (!data?.cycle) throw new Error('L4 returned no cycle');
  return data.cycle as OrchestrationCycle;
}

/**
 * L4 + L5 + L6 — runs Think→Simulate→Evaluate→Adjust loop.
 * Bounded by maxCycles (default 3, hot-path 1). Early-exits when fidelity passes.
 */
export async function runOrchestration(params: {
  userIntent: string;
  contract: unknown;
  memory: MemoryRecord[];
  dna: CognitiveDNA;
  hotPath: boolean;
  onCycle?: (cycle: OrchestrationCycle, idx: number) => void;
}): Promise<{ cycles: OrchestrationCycle[]; converged: boolean; final: OrchestrationCycle }> {
  const maxCycles = params.hotPath ? 1 : 3;
  const cycles: OrchestrationCycle[] = [];
  let converged = false;

  for (let i = 0; i < maxCycles; i++) {
    const cycle = await runCycle({
      user_intent: params.userIntent,
      decision_contract: params.contract,
      memory_recall: params.memory,
      prior_cycles: cycles,
      dna: params.dna,
    });

    // L5: fidelity scoring
    const fidelity: FidelityScore = scoreCycle(cycle, cycles[cycles.length - 1] ?? null);
    cycle.fidelity = fidelity;
    cycles.push(cycle);
    params.onCycle?.(cycle, i);

    // L6: self-correction decision
    if (!shouldSelfCorrect(fidelity, i, maxCycles)) {
      converged = fidelity.passed;
      break;
    }
  }

  return {
    cycles,
    converged,
    final: cycles[cycles.length - 1],
  };
}

/** Trace persistence */
export async function startTrace(params: {
  workspaceId: string;
  workflowId?: string;
  dnaId: string;
  userInput: string;
}): Promise<string | null> {
  const { data, error } = await supabase
    .from('cognition_traces' as never)
    .insert({
      workspace_id: params.workspaceId,
      workflow_id: params.workflowId ?? null,
      dna_id: params.dnaId,
      user_input: params.userInput,
      layers: {},
      status: 'in_progress',
    } as never)
    .select('id')
    .single();
  if (error) {
    console.error('startTrace error', error);
    return null;
  }
  return (data as { id: string } | null)?.id ?? null;
}

export async function updateTrace(traceId: string, layers: Record<string, unknown>, hotPath?: boolean) {
  await supabase
    .from('cognition_traces' as never)
    .update({ layers, hot_path_taken: hotPath ?? false } as never)
    .eq('id', traceId);
}

export async function completeTrace(traceId: string, finalSpec: unknown, durationMs: number) {
  await supabase
    .from('cognition_traces' as never)
    .update({
      final_spec: finalSpec,
      total_duration_ms: durationMs,
      status: 'completed',
      completed_at: new Date().toISOString(),
    } as never)
    .eq('id', traceId);
}

/** Persist a finalized decision into the memory graph (with embedding). */
export async function writeMemory(params: {
  workspaceId: string;
  dnaVersion: number;
  contextSummary: string;
  reasoningPath: unknown;
  simulationBranches: unknown;
  fidelityScores: Record<string, number>;
}): Promise<void> {
  const embedding = await embedText(params.contextSummary);
  await supabase.from('decision_memory_graph' as never).insert({
    workspace_id: params.workspaceId,
    dna_version: params.dnaVersion,
    context: { summary: params.contextSummary },
    context_summary: params.contextSummary,
    reasoning_path: params.reasoningPath,
    simulation_branches: params.simulationBranches,
    fidelity_scores: params.fidelityScores,
    embedding: embedding ?? null,
  } as never);
}
