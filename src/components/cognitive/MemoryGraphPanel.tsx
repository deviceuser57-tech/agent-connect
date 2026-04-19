import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Database, Sparkles } from 'lucide-react';

interface MemoryRow {
  id: string;
  context_summary: string | null;
  fidelity_scores: Record<string, number>;
  outcome_feedback: Record<string, unknown>;
  created_at: string;
}

export function MemoryGraphPanel() {
  const { currentWorkspace } = useWorkspace();
  const [rows, setRows] = useState<MemoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentWorkspace) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('decision_memory_graph' as never)
        .select('id, context_summary, fidelity_scores, outcome_feedback, created_at')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setRows((data as unknown as MemoryRow[]) ?? []);
      setLoading(false);
    })();
  }, [currentWorkspace]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Decision Memory Graph
          <Badge variant="secondary" className="ml-auto">{rows.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No decisions recorded yet. Each cognitive run will write its reasoning trace and outcome here.
          </p>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2 pr-4">
              {rows.map((r) => (
                <div key={r.id} className="border rounded-md p-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm">{r.context_summary ?? '(no summary)'}</p>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {new Date(r.created_at).toLocaleDateString()}
                    </Badge>
                  </div>
                  {Object.keys(r.fidelity_scores ?? {}).length > 0 && (
                    <div className="flex gap-2 flex-wrap text-xs text-muted-foreground">
                      <Sparkles className="h-3 w-3" />
                      {Object.entries(r.fidelity_scores).map(([k, v]) => (
                        <span key={k}>{k}: <span className="font-mono">{Number(v).toFixed(2)}</span></span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
