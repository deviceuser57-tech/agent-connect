// Phase A3 — Sovereign read-only DNA loader.
// Reads the flat `public.cognitive_dna` KV table and folds active traits
// into the nested `CognitiveDNA` shape consumed by the UI / orchestrator.
// HARD GUARD: client must never insert/update/delete cognitive_dna —
// mutations are owned by the sovereign edge kernel via service_role.
import { supabaseCompat as supabase } from '@/integrations/supabase/cmack-compat';
import { CognitiveDNA, DEFAULT_DNA } from './types';

interface FlatTraitRow {
  trait_key: string;
  trait_value: unknown;
  version: number;
  is_active: boolean;
}

/**
 * Fold flat KV trait rows into the nested CognitiveDNA contract.
 * Unknown / missing traits fall back to DEFAULT_DNA so the UI keeps
 * rendering during cold-start before the sovereign kernel seeds.
 */
export function adaptFlatTraitsToCognitiveDNA(
  rows: FlatTraitRow[],
  workspaceId: string,
): CognitiveDNA {
  const map = new Map<string, unknown>();
  for (const r of rows) map.set(r.trait_key, r.trait_value);

  const pickObj = (key: keyof typeof DEFAULT_DNA) => {
    const v = map.get(key as string);
    return (v && typeof v === 'object' ? (v as Record<string, unknown>) : (DEFAULT_DNA[key] as Record<string, unknown>));
  };

  return {
    id: 'sovereign',
    workspace_id: workspaceId,
    version: 1,
    parent_version: null,
    identity: pickObj('identity'),
    philosophy: pickObj('philosophy'),
    value_system: pickObj('value_system'),
    reasoning_constraints: pickObj('reasoning_constraints'),
    learning_boundaries: DEFAULT_DNA.learning_boundaries,
    evolution_permissions: DEFAULT_DNA.evolution_permissions,
    governance: pickObj('governance') as CognitiveDNA['governance'],
    hot_path: pickObj('hot_path') as CognitiveDNA['hot_path'],
    is_active: true,
    created_at: new Date().toISOString(),
  };
}

/**
 * Read-only sovereign DNA loader. Never writes.
 * If no traits are present yet, returns a DEFAULT_DNA projection so
 * the UI remains operational pre-seed.
 */
export async function loadOrCreateDNA(workspaceId: string): Promise<CognitiveDNA> {
  const { data } = await supabase
    .from('cognitive_dna')
    .select('*')
    .eq('is_active', true);

  const rows = (data ?? []) as unknown as FlatTraitRow[];
  return adaptFlatTraitsToCognitiveDNA(rows, workspaceId);
}

/** Apply an overlay's overrides on top of a base DNA. Identity is immutable. */
export function mergeOverlay(base: CognitiveDNA, overrides: Record<string, unknown>): CognitiveDNA {
  const safe = { ...overrides };
  delete (safe as Record<string, unknown>).identity; // immutable
  return {
    ...base,
    philosophy: { ...base.philosophy, ...((safe.philosophy as object) ?? {}) },
    value_system: { ...base.value_system, ...((safe.value_system as object) ?? {}) },
    reasoning_constraints: { ...base.reasoning_constraints, ...((safe.reasoning_constraints as object) ?? {}) },
    governance: { ...base.governance, ...((safe.governance as object) ?? {}) },
    hot_path: { ...base.hot_path, ...((safe.hot_path as object) ?? {}) },
  };
}
