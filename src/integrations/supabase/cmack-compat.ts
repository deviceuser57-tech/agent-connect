/**
 * CMACK / GRAVITY Compatibility Adapter
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 10 (Migration v17) database does not declare the legacy CMACK tables
 * (memory_graph_nodes, cognitive_dna, system_state, governance_traces,
 *  governance_state, conflict_logs, execution_traces, architecture_change_log,
 *  collective_negotiations, policy_evolution_logs, constitutional_snapshots, …)
 * in the generated `Database` type.
 *
 * Per CMACK contract: do NOT delete kernel / governance / DNA logic when the
 * schema is missing — instead expose a safe, untyped adapter so deterministic
 * core engines keep compiling and run defensively at runtime.
 *
 * - `supabaseCompat`  — same instance, cast to `any` so legacy table strings
 *                       are accepted by the type system.
 * - `legacyTable(t)`  — sugar: `legacyTable('cognitive_dna').select(...)`.
 *
 * Runtime behavior is unchanged. If a legacy table truly doesn't exist in the
 * DB, Supabase returns an error object — callers already handle `data == null`.
 */
import { supabase } from './client';

// Untyped escape hatch — preserves the live client, bypasses generated types
// only at the call site where legacy CMACK tables are referenced.
export const supabaseCompat = supabase as unknown as {
  from: (table: string) => any;
  channel: (name: string) => any;
  removeChannel: (sub: any) => any;
  rpc: (fn: string, args?: any) => any;
  auth: typeof supabase.auth;
  storage: typeof supabase.storage;
  functions: typeof supabase.functions;
};

export const legacyTable = (table: string) => supabaseCompat.from(table);
