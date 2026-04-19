// CognitionTab — full L0–L11 trace viewer for the Workflow Builder details panel
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Zap, Database, GitBranch, Shield } from 'lucide-react';
import { CycleVisualizer } from './CycleVisualizer';
import type { CognitionTrace } from '@/lib/cognitive/types';

interface Props {
  trace: CognitionTrace | null;
  hotPath?: boolean;
}

export function CognitionTab({ trace, hotPath }: Props) {
  if (!trace) {
    return (
      <div className="text-center text-sm text-muted-foreground py-12">
        <Brain className="h-10 w-10 mx-auto mb-3 opacity-40" />
        Run a request through the Cognitive Engine to see the full L0–L11 trace.
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[600px] pr-3">
      <div className="space-y-4">
        {hotPath && (
          <Badge variant="secondary" className="gap-1"><Zap className="h-3 w-3" /> Hot-path executed (reduced layers)</Badge>
        )}

        {/* L0 */}
        {trace.L0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">L0 — Decomposition</CardTitle></CardHeader>
            <CardContent className="text-xs space-y-1">
              <p><span className="font-semibold">Intent:</span> {trace.L0.intent}</p>
              {trace.L0.entities?.length > 0 && (
                <p><span className="font-semibold">Entities:</span> {trace.L0.entities.join(', ')}</p>
              )}
              {trace.L0.ambiguities?.length > 0 && (
                <p className="text-muted-foreground"><span className="font-semibold">Ambiguities:</span> {trace.L0.ambiguities.join('; ')}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* L1 */}
        {trace.L1 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">L1 — Mode Inference <Badge variant="outline">{trace.L1.recommended_mode}</Badge></CardTitle></CardHeader>
            <CardContent className="text-xs space-y-1">
              <p className="italic text-muted-foreground">{trace.L1.reasoning}</p>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {(['workflow', 'cognitive', 'hybrid'] as const).map((m) => (
                  <div key={m} className="bg-muted/50 px-2 py-1 rounded">
                    <div className="text-[10px] uppercase">{m}</div>
                    <div className="font-mono">{(trace.L1!.scores[m] * 100).toFixed(0)}%</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* L2 */}
        {trace.L2 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">L2 — Decision Contract</CardTitle></CardHeader>
            <CardContent className="text-xs space-y-1">
              <p>Mode: <Badge variant="outline">{trace.L2.mode}</Badge> signed at {new Date(trace.L2.signed_at).toLocaleTimeString()}</p>
              {trace.L2.refinements?.length > 0 && (
                <p><span className="font-semibold">Refinements:</span> {trace.L2.refinements.join(' | ')}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* L3 */}
        {trace.L3 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Database className="h-3 w-3" /> L3 — Memory Recall</CardTitle></CardHeader>
            <CardContent className="text-xs space-y-1">
              <p className="text-muted-foreground">{trace.L3.reason} — {trace.L3.recalled.length} memories injected</p>
              {trace.L3.recalled.slice(0, 3).map((m) => (
                <div key={m.id} className="border-l-2 border-primary/30 pl-2 py-0.5">
                  <p className="line-clamp-2">{m.context_summary || '(no summary)'}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* L4 + L5 + L6 */}
        {trace.L4 && (
          <CycleVisualizer cycles={trace.L4.cycles} active={false} converged={trace.L4.converged} />
        )}

        {/* L7 — placeholder for Phase 3 */}
        {trace.L7 ? (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-3 w-3" /> L7 — Adversarial Governance</CardTitle></CardHeader>
            <CardContent className="text-xs"><pre className="whitespace-pre-wrap">{JSON.stringify(trace.L7, null, 2)}</pre></CardContent>
          </Card>
        ) : (
          <div className="text-xs text-muted-foreground italic flex items-center gap-2">
            <GitBranch className="h-3 w-3" /> L7–L11 will populate in Phase 3 & 4.
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
