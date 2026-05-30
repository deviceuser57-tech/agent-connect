# Phase A — Sovereign Migration

A1 already executed (compat view live). Click **Implement plan** to execute A2 → A4 (file edits + remaining migration).

## A1 — ✅ DONE
`cognition_traces_compat` view created with `security_invoker = true`, GRANT SELECT to authenticated + service_role. Inherits admin-only RLS from `execution_traces`.

## A2 — Telemetry read-path redirect (read-only)

**New** `src/hooks/useCognitionTraceCompat.ts` — SELECT-only against the compat view, ordered `created_at desc limit 1` per `sessionId`. No write symbols.

**Edit** `src/components/cognitive/CognitionTab.tsx` — adds optional `sessionId` prop; when `trace` is null and `sessionId` provided, falls back to compat hook. `CycleVisualizer.tsx` untouched (pure presentational).

## A3 — Physical `cognitive_dna` flat table + read-only DNA loader

**Migration:**

```sql
CREATE TABLE public.cognitive_dna (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trait_key   text NOT NULL,
  trait_value jsonb NOT NULL,
  version     integer NOT NULL DEFAULT 1,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trait_key, version)
);
GRANT SELECT ON public.cognitive_dna TO authenticated;
GRANT ALL    ON public.cognitive_dna TO service_role;
ALTER TABLE public.cognitive_dna ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read active dna" ON public.cognitive_dna
  FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Service role manages dna" ON public.cognitive_dna
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

Seed defaults via insert tool: `risk_tolerance=0.4`, `max_loops=10`, plus nested DEFAULT_DNA traits (`identity`, `philosophy`, `value_system`, `reasoning_constraints`, `governance`, `hot_path`).

**Edit** `src/lib/cognitive/dna.ts` — replace `loadOrCreateDNA` insert path with read-only loader; add `adaptFlatTraitsToCognitiveDNA()` adapter folding flat KV into nested `CognitiveDNA` (falls back to `DEFAULT_DNA`). Interface + `mergeOverlay` signature unchanged.

`StatePanel.tsx` already reduces flat rows — no logic change needed for DNA reads.

## A4 — Realtime + TTAL drift indicator

**Edit** `src/components/cognitive/StatePanel.tsx` only — add derived TTAL drift indicator reading `lastTrace?.trace_data?.attestation?.drift`, render under Behavioral Control panel with amber threshold `> 0.2`. Realtime channels untouched (already correct).

## Validation matrix (after each task)

| Task | Check |
|------|-------|
| A1 | ✅ view exists, security_invoker = true, RLS inherited |
| A2 | `/governance-dashboard` renders; CognitionTab fallback works when `trace` is null |
| A3 | `StatePanel` paints `risk_tolerance`/`max_loops` from new table; no client `insert` into `cognitive_dna` |
| A4 | TTAL drift renders when `trace_data.attestation.drift` present; realtime INSERT propagates ≤1s |

## Out of scope (Phase B)

- Removing client-side `orchestrator.ts` L0–L6 logic
- Deprecating `ObservabilityEngine.logTrace` writes
- Dropping legacy tables

## Files touched

- `supabase/migrations/<new>_phase_a3_cognitive_dna_flat.sql`
- `src/hooks/useCognitionTraceCompat.ts` (new)
- `src/components/cognitive/CognitionTab.tsx`
- `src/components/cognitive/StatePanel.tsx`
- `src/lib/cognitive/dna.ts`
