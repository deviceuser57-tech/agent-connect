// CycleVisualizer — live trace of L4 Think→Simulate→Evaluate→Adjust cycles
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Zap, Activity, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { OrchestrationCycle } from '@/lib/cognitive/types';

interface Props {
  cycles: OrchestrationCycle[];
  active: boolean;
  converged?: boolean;
}

export function CycleVisualizer({ cycles, active, converged }: Props) {
  if (cycles.length === 0 && !active) return null;

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-primary" />
          L4 Cyclic Orchestration
          {active && <Badge variant="secondary" className="gap-1 ml-2"><RefreshCw className="h-3 w-3 animate-spin" />running</Badge>}
          {!active && converged && <Badge className="gap-1 ml-2"><CheckCircle2 className="h-3 w-3" />converged</Badge>}
          {!active && cycles.length > 0 && !converged && (
            <Badge variant="destructive" className="gap-1 ml-2"><AlertTriangle className="h-3 w-3" />max cycles</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {cycles.map((c, i) => (
          <div key={i} className="rounded-md border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Brain className="h-3.5 w-3.5" /> Cycle {i + 1}
              </div>
              {c.fidelity && (
                <Badge variant={c.fidelity.passed ? 'default' : 'outline'} className="gap-1 text-[10px]">
                  <Zap className="h-3 w-3" /> {(c.fidelity.overall * 100).toFixed(0)}%
                </Badge>
              )}
            </div>

            <p className="text-xs leading-relaxed"><span className="font-semibold">Think:</span> {c.think}</p>

            {c.simulate?.length > 0 && (
              <div className="text-xs space-y-1">
                <span className="font-semibold">Simulate:</span>
                {c.simulate.slice(0, 3).map((s, j) => (
                  <div key={j} className="pl-2 border-l-2 border-primary/30">
                    <span className="text-muted-foreground">[{(s.likelihood * 100).toFixed(0)}%] </span>
                    <span className="italic">{s.branch}</span> → {s.outcome}
                  </div>
                ))}
              </div>
            )}

            {c.evaluate?.weaknesses?.length > 0 && (
              <div className="text-xs">
                <span className="font-semibold">Weaknesses:</span>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {c.evaluate.weaknesses.slice(0, 3).map((w, j) => <li key={j}>{w}</li>)}
                </ul>
              </div>
            )}

            <p className="text-xs"><span className="font-semibold">Adjust:</span> {c.adjust || '—'}</p>

            {c.fidelity && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                {(['confidence', 'stability', 'divergence'] as const).map((k) => (
                  <div key={k} className="space-y-0.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="capitalize">{k}</span>
                      <span className="font-mono">{((c.fidelity![k]) * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={c.fidelity![k] * 100} className="h-1" />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
