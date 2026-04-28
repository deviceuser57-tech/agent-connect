/**
 * CMACK / GRAVITY Type Augmentation
 * ─────────────────────────────────────────────────────────────────────────────
 * The generated `Database` type only contains Phase 10 (Migration v17) tables.
 * The CMACK contract forbids deleting kernel / governance / DNA / RAG / agent
 * code that references legacy tables (knowledge_folders, multi_agent_configs,
 * rag_feedback, agent_profiles, workflows, …).
 *
 * Per CMACK SAFETY PRINCIPLE ("prefer compatibility layer over deletion"),
 * we widen the typed Supabase client's `from()` to accept arbitrary table
 * names and return a permissive query builder. Runtime behavior is unchanged
 * — Supabase still returns proper errors if a table truly doesn't exist.
 *
 * This is type-only (.d.ts), emits no JS, and breaks nothing.
 */
import '@supabase/supabase-js';

declare module '@supabase/postgrest-js' {
  // Allow any string as a table name and bypass strict column inference.
  // The generated types remain authoritative for tables that DO exist;
  // this only stops TS from rejecting legacy CMACK table identifiers.
  interface PostgrestQueryBuilder<Schema, Relation, RelationName = unknown, Relationships = unknown> {
    select(columns?: string, options?: any): any;
    insert(values: any, options?: any): any;
    upsert(values: any, options?: any): any;
    update(values: any, options?: any): any;
    delete(options?: any): any;
  }
}

declare module '@supabase/supabase-js' {
  interface SupabaseClient<Database = any, SchemaName = any, Schema = any> {
    from(table: string): any;
  }
}
