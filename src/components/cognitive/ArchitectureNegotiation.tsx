// L2 — Negotiation UI: system proposes architecture, user accepts/refines/rejects
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Brain, Check, RefreshCw, X, Zap } from 'lucide-react';
import type { ModeInference, DecisionContract } from '@/lib/cognitive/types';

interface Props {
  inference: ModeInference;
  userInput: string;
  onAccept: (contract: DecisionContract) => void;
  onRefine: (refinement: string) => void;
  onReject: () => void;
}

const MODE_LABEL: Record<string, string> = {
  workflow: 'Multi-Agent Workflow',
  cognitive: 'Decision Intelligence Engine',
  hybrid: 'Hybrid (Decision Core + Agents)',
};

export function ArchitectureNegotiation({ inference, userInput, onAccept, onRefine, onReject }: Props) {
  const [refining, setRefining] = useState(false);
  const [refinement, setRefinement] = useState('');

  const accept = () => {
    onAccept({
      mode: inference.recommended_mode,
      user_intent: userInput,
      refinements: [],
      signed_at: new Date().toISOString(),
      inference,
    });
  };

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          System proposes: {MODE_LABEL[inference.recommended_mode]}
          {inference.hot_path_eligible && (
            <Badge variant="secondary" className="gap-1 ml-auto">
              <Zap className="h-3 w-3" /> Hot-path
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground italic">{inference.reasoning}</p>

        <div className="space-y-2">
          {(['workflow', 'cognitive', 'hybrid'] as const).map((m) => (
            <div key={m} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className={m === inference.recommended_mode ? 'font-semibold text-primary' : ''}>
                  {MODE_LABEL[m]}
                </span>
                <span>{(inference.scores[m] * 100).toFixed(0)}%</span>
              </div>
              <Progress value={inference.scores[m] * 100} className="h-1.5" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.entries(inference.factors).map(([k, v]) => (
            <div key={k} className="flex justify-between bg-muted/50 px-2 py-1 rounded">
              <span className="capitalize">{k.replace('_', ' ')}</span>
              <span className="font-mono">{(v * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground">
          Confidence: <span className="font-mono">{(inference.confidence * 100).toFixed(0)}%</span>
        </div>

        {!refining ? (
          <div className="flex gap-2 pt-2">
            <Button onClick={accept} className="flex-1 gap-1">
              <Check className="h-4 w-4" /> Accept
            </Button>
            <Button variant="outline" onClick={() => setRefining(true)} className="gap-1">
              <RefreshCw className="h-4 w-4" /> Refine
            </Button>
            <Button variant="ghost" onClick={onReject} className="gap-1">
              <X className="h-4 w-4" /> Reject
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Textarea
              placeholder="Tell the system what to reconsider (e.g. 'this should be cognitive, the agents are misleading')..."
              value={refinement}
              onChange={(e) => setRefinement(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => { onRefine(refinement); setRefining(false); setRefinement(''); }}
                disabled={!refinement.trim()}
                className="flex-1"
              >
                Recalibrate
              </Button>
              <Button variant="ghost" onClick={() => setRefining(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
