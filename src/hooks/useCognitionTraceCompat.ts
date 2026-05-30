// Phase A2 — Sovereign read-only cognition trace hook.
// Reads `cognition_traces_compat` (security_invoker view over execution_traces).
// HARD GUARD: this file MUST NOT contain insert/update/upsert/delete.
import { useEffect, useState } from 'react';
import { supabaseCompat as supabase } from '@/integrations/supabase/cmack-compat';
import type { CognitionTrace } from '@/lib/cognitive/types';

interface CompatRow {
  id: string;
  session_id: string;
  created_at: string;
  l0: unknown; l1: unknown; l2: unknown; l3: unknown;
  l4: unknown; l5: unknown; l6: unknown; l7: unknown;
  raw_trace: Record<string, unknown> | null;
}

function rowToTrace(row: CompatRow): CognitionTrace {
  return {
    L0: row.l0 as CognitionTrace['L0'],
    L1: row.l1 as CognitionTrace['L1'],
    L2: row.l2 as CognitionTrace['L2'],
    L3: row.l3 as CognitionTrace['L3'],
    L4: row.l4 as CognitionTrace['L4'],
    L5: row.l5,
    L6: row.l6,
    L7: row.l7,
  };
}

export function useCognitionTraceCompat(sessionId: string | null | undefined) {
  const [trace, setTrace] = useState<CognitionTrace | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setTrace(null);
      return;
    }
    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data } = await supabase
        .from('cognition_traces_compat')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) {
        setTrace(data ? rowToTrace(data as unknown as CompatRow) : null);
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [sessionId]);

  return { trace, loading };
}
