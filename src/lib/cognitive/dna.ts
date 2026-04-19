import { supabase } from '@/integrations/supabase/client';
import { CognitiveDNA, DEFAULT_DNA } from './types';

/** Load active DNA for a workspace, creating a default if none exists. */
export async function loadOrCreateDNA(workspaceId: string): Promise<CognitiveDNA> {
  const { data: existing } = await supabase
    .from('cognitive_dna' as never)
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing as unknown as CognitiveDNA;

  const { data: created, error } = await supabase
    .from('cognitive_dna' as never)
    .insert({ workspace_id: workspaceId, ...DEFAULT_DNA } as never)
    .select()
    .single();

  if (error || !created) throw new Error(error?.message || 'Failed to create DNA');
  return created as unknown as CognitiveDNA;
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
