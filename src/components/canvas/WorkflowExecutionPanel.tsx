import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { getSupabaseUrl } from '@/lib/env';
import { useToast } from '@/hooks/use-toast';
import {
  Play,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Brain,
  Shield,
  RefreshCw,
  Clock,
  Layers,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface ExecutionLog {
  timestamp: string;
  type: string;
  message: string;
  agent?: string;
  phase?: string;
  data?: Record<string, unknown>;
}

interface AgentOutput {
  output: string;
  confidence: number;
  success: boolean;
}

interface ExecutionResult {
  success: boolean;
  runId: string;
  status: string;
  executionLogs: ExecutionLog[];
  outputData: Record<string, AgentOutput>;
  memoryState: Record<string, unknown>;
  agentStatuses: Record<number, string>;
  totalRetries: number;
}

interface WorkflowExecutionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId?: string;
  workspaceId?: string;
}

const logTypeIcons: Record<string, React.ReactNode> = {
  start: <Play className="h-3 w-3 text-blue-500" />,
  complete: <CheckCircle2 className="h-3 w-3 text-green-500" />,
  error: <XCircle className="h-3 w-3 text-red-500" />,
  warning: <AlertTriangle className="h-3 w-3 text-amber-500" />,
  rework: <RefreshCw className="h-3 w-3 text-orange-500" />,
  safety: <Shield className="h-3 w-3 text-purple-500" />,
  memory: <Brain className="h-3 w-3 text-cyan-500" />,
  info: <Layers className="h-3 w-3 text-muted-foreground" />,
  skipped: <Clock className="h-3 w-3 text-muted-foreground" />,
  escalation: <AlertTriangle className="h-3 w-3 text-red-500" />,
  dag: <Layers className="h-3 w-3 text-blue-400" />,
};

const statusColors: Record<string, string> = {
  completed: 'bg-green-500/10 text-green-500 border-green-500/30',
  failed: 'bg-red-500/10 text-red-500 border-red-500/30',
  running: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  skipped: 'bg-muted text-muted-foreground border-border',
  blocked: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  skipped_dependency: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
};

export const WorkflowExecutionPanel: React.FC<WorkflowExecutionPanelProps> = ({
  isOpen,
  onClose,
  workflowId,
  workspaceId,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [result?.executionLogs?.length]);

  const runWorkflow = async () => {
    if (!workflowId) {
      toast({ title: 'Error', description: 'No workflow ID', variant: 'destructive' });
      return;
    }

    setIsRunning(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Auth Required', description: 'Please sign in', variant: 'destructive' });
        setIsRunning(false);
        return;
      }

      const response = await fetch(
        `${getSupabaseUrl()}/functions/v1/run-workflow`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            workflowId,
            workspaceId,
            triggerType: 'manual',
            inputData: { prompt: inputPrompt || undefined },
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setResult(data);

      toast({
        title: data.success ? 'Workflow Completed' : 'Workflow Failed',
        description: data.success
          ? `${Object.keys(data.outputData || {}).length} agents executed, ${data.totalRetries} retries`
          : 'Check execution logs for details',
        variant: data.success ? 'default' : 'destructive',
      });
    } catch (error) {
      console.error('Execution error:', error);
      toast({
        title: 'Execution Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const toggleAgent = (key: string) => {
    setExpandedAgents(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (!isOpen) return null;

  const completedCount = result ? Object.values(result.agentStatuses || {}).filter(s => s === 'completed').length : 0;
  const totalAgents = result ? Object.keys(result.agentStatuses || {}).length : 0;
  const progress = totalAgents > 0 ? (completedCount / totalAgents) * 100 : 0;

  return (
    <div className="absolute top-0 right-0 bottom-0 w-[480px] z-20 bg-background border-l shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Play className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Workflow Execution Engine</h3>
            <p className="text-[11px] text-muted-foreground">DAG • Memory • Rework • Safety</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Input */}
      <div className="p-3 border-b space-y-2">
        <Textarea
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          placeholder="Optional: Provide input prompt for the workflow..."
          className="min-h-[60px] resize-none text-sm"
          disabled={isRunning}
        />
        <Button onClick={runWorkflow} disabled={isRunning || !workflowId} className="w-full" size="sm">
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executing DAG...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Execute Workflow
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      {result && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Status bar */}
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={statusColors[result.status] || ''}>
                {result.status}
              </Badge>
              <div className="flex gap-1 text-[11px] text-muted-foreground">
                <span>{completedCount}/{totalAgents} agents</span>
                <span>•</span>
                <span>{result.totalRetries} retries</span>
              </div>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          <Tabs defaultValue="logs" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-3 mt-2 grid grid-cols-4">
              <TabsTrigger value="logs" className="text-xs">Logs</TabsTrigger>
              <TabsTrigger value="outputs" className="text-xs">Outputs</TabsTrigger>
              <TabsTrigger value="memory" className="text-xs">Memory</TabsTrigger>
              <TabsTrigger value="status" className="text-xs">Status</TabsTrigger>
            </TabsList>

            {/* Logs Tab */}
            <TabsContent value="logs" className="flex-1 overflow-hidden m-0 px-3 pb-3">
              <ScrollArea className="h-full">
                <div className="space-y-1 pt-2">
                  {result.executionLogs?.map((log, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] py-1 border-b border-border/30 last:border-0">
                      <div className="mt-0.5 flex-shrink-0">
                        {logTypeIcons[log.type] || logTypeIcons.info}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          {log.agent && (
                            <span className="font-medium text-foreground">{log.agent}</span>
                          )}
                          {log.phase && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1">{log.phase}</Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground break-words">{log.message}</p>
                        {log.data && typeof log.data === 'object' && 'output_preview' in log.data && (
                          <p className="text-muted-foreground/70 mt-0.5 italic truncate">
                            {String(log.data.output_preview).substring(0, 100)}...
                          </p>
                        )}
                      </div>
                      <span className="text-[9px] text-muted-foreground/50 flex-shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Outputs Tab */}
            <TabsContent value="outputs" className="flex-1 overflow-hidden m-0 px-3 pb-3">
              <ScrollArea className="h-full">
                <div className="space-y-2 pt-2">
                  {Object.entries(result.outputData || {}).map(([key, output]) => (
                    <Card key={key} className="overflow-hidden">
                      <div
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleAgent(key)}
                      >
                        <div className="flex items-center gap-2">
                          {expandedAgents.has(key) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          <span className="font-medium text-sm">{key}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-[10px]">
                            {(output.confidence * 100).toFixed(0)}% conf
                          </Badge>
                          {output.success ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                          )}
                        </div>
                      </div>
                      {expandedAgents.has(key) && (
                        <CardContent className="pt-0 pb-3">
                          <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded p-2 max-h-[300px] overflow-auto">
                            {output.output}
                          </pre>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Memory Tab */}
            <TabsContent value="memory" className="flex-1 overflow-hidden m-0 px-3 pb-3">
              <ScrollArea className="h-full">
                <div className="space-y-2 pt-2">
                  {Object.entries(result.memoryState || {}).map(([key, value]) => (
                    <Card key={key} className="overflow-hidden">
                      <div
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleAgent(`mem-${key}`)}
                      >
                        <div className="flex items-center gap-2">
                          {expandedAgents.has(`mem-${key}`) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          <Brain className="h-3 w-3 text-cyan-500" />
                          <span className="font-medium text-sm">{key}</span>
                        </div>
                      </div>
                      {expandedAgents.has(`mem-${key}`) && (
                        <CardContent className="pt-0 pb-3">
                          <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded p-2 max-h-[200px] overflow-auto">
                            {typeof value === 'string' ? value.substring(0, 2000) : JSON.stringify(value, null, 2).substring(0, 2000)}
                          </pre>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                  {Object.keys(result.memoryState || {}).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No memory entries</p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Status Tab */}
            <TabsContent value="status" className="flex-1 overflow-hidden m-0 px-3 pb-3">
              <ScrollArea className="h-full">
                <div className="space-y-2 pt-2">
                  {Object.entries(result.agentStatuses || {}).map(([idx, status]) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg border">
                      <span className="text-sm font-medium">Agent {idx}</span>
                      <Badge variant="outline" className={`text-[10px] ${statusColors[status] || ''}`}>
                        {status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Empty state */}
      {!result && !isRunning && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-2">
            <Layers className="h-10 w-10 mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Run the workflow to see execution results</p>
            <p className="text-[11px] text-muted-foreground/60">
              The engine will execute agents in DAG order with memory, rework, and safety evaluation
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
