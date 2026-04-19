// Phase 1 orchestrator — runs L0 (decompose), L1 (infer), L3 (memory recall)
// L2 (negotiation) is interactive — handled by ArchitectureNegotiation UI
// L4–L11 will be added in Phase 2+
import { supabase } from '@/integrations/supabase/client';
import { CognitiveDNA, ModeInference, DecomposedInput, MemoryRecord } from './types';

/** L0: lightweight client-side decomposition — no LLM call. Detects obvious ambiguity. */
export function decompose(input: string): DecomposedInput {
  const trimmed = input.trim();
  const ambiguities: string[] = [];
  const contradictions: string[] = [];

  if (trimmed.length < 20) ambiguities.push('Input is very short — intent may be unclear');
  if (/\bor\b/i.test(trimmed) && /\?/.test(trimmed)) ambiguities.push('Contains alternatives — may need clarification');
  if (/\bnot\b.*\band\b/i.test(trimmed)) contradictions.push('Possible negation contradiction');

  // crude entity extraction
  const entities = Array.from(new Set(
    (trimmed.match(/\b[A-Z][a-zA-Z]{2,}\b/g) ?? [])
      .filter((w) => !['The', 'And', 'For', 'This', 'That'].includes(w)),
  )).slice(0, 10);

  return { intent: trimmed.slice(0, 280), entities, ambiguities, contradictions };
}

/** L1: call edge function for probabilistic mode inference. */
export async function inferMode(userInput: string, dna: CognitiveDNA): Promise<ModeInference> {
  const { data, error } = await supabase.functions.invoke('cognitive-l1-infer', {
    body: { user_input: userInput, dna: { hot_path: dna.hot_path } },
  });
  if (error) throw new Error(error.message);
  if (!data?.inference) throw new Error('L1 returned no inference');
  return data.inference as ModeInference;
}

/** L3: episodic memory recall — text-similarity fallback (no pgvector required). */
export async function recallMemory(workspaceId: string, contextSummary: string, limit = 5): Promise<MemoryRecord[]> {
  const { data, error } = await supabase
    .from('decision_memory_graph' as never)
    .select('id, context_summary, fidelity_scores, outcome_feedback, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) return [];
  // simple keyword overlap scoring
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

/** Persist a cognition trace row. */
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
