// DNA Manager — view, version, and review pending mutations
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { loadOrCreateDNA } from '@/lib/cognitive/dna';
import { CognitiveDNA } from '@/lib/cognitive/types';
import { Dna, ShieldCheck, GitBranch } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Mutation {
  id: string;
  proposed_mutation: Record<string, unknown>;
  trigger_reason: string | null;
  status: string;
  created_at: string;
  scope: string;
}

export function DNAManager() {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [dna, setDna] = useState<CognitiveDNA | null>(null);
  const [mutations, setMutations] = useState<Mutation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentWorkspace) return;
    (async () => {
      setLoading(true);
      try {
        const d = await loadOrCreateDNA(currentWorkspace.id);
        setDna(d);
        const { data: muts } = await supabase
          .from('dna_mutations' as never)
          .select('id, proposed_mutation, trigger_reason, status, created_at, scope')
          .eq('workspace_id', currentWorkspace.id)
          .order('created_at', { ascending: false });
        setMutations((muts as unknown as Mutation[]) ?? []);
      } catch (e) {
        toast({ title: 'DNA load failed', description: e instanceof Error ? e.message : 'Unknown', variant: 'destructive' });
      }
      setLoading(false);
    })();
  }, [currentWorkspace, toast]);

  const decideMutation = async (id: string, status: 'approved' | 'rejected') => {
    await supabase.from('dna_mutations' as never).update({ status, decided_at: new Date().toISOString() } as never).eq('id', id);
    setMutations((m) => m.map((x) => (x.id === id ? { ...x, status } : x)));
    toast({ title: `Mutation ${status}` });
  };

  if (loading) return <p className="text-sm text-muted-foreground p-4">Loading DNA…</p>;
  if (!dna) return <p className="text-sm text-muted-foreground p-4">No workspace selected.</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dna className="h-5 w-5 text-primary" />
          Cognitive DNA
          <Badge variant="outline" className="ml-2">v{dna.version}</Badge>
          {dna.is_active && <Badge variant="default" className="gap-1"><ShieldCheck className="h-3 w-3" />Active</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="identity">
          <TabsList>
            <TabsTrigger value="identity">Identity</TabsTrigger>
            <TabsTrigger value="philosophy">Philosophy</TabsTrigger>
            <TabsTrigger value="governance">Governance</TabsTrigger>
            <TabsTrigger value="mutations">
              Mutations
              {mutations.filter((m) => m.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 px-1 text-xs">
                  {mutations.filter((m) => m.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="identity">
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">{JSON.stringify(dna.identity, null, 2)}</pre>
            <p className="text-xs text-muted-foreground mt-2">🔒 Identity is immutable — it cannot be evolved.</p>
          </TabsContent>

          <TabsContent value="philosophy" className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold mb-1">Philosophy</h4>
              <pre className="text-xs bg-muted p-3 rounded">{JSON.stringify(dna.philosophy, null, 2)}</pre>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-1">Value System</h4>
              <pre className="text-xs bg-muted p-3 rounded">{JSON.stringify(dna.value_system, null, 2)}</pre>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-1">Reasoning Constraints</h4>
              <pre className="text-xs bg-muted p-3 rounded">{JSON.stringify(dna.reasoning_constraints, null, 2)}</pre>
            </div>
          </TabsContent>

          <TabsContent value="governance" className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold mb-1">Governance</h4>
              <pre className="text-xs bg-muted p-3 rounded">{JSON.stringify(dna.governance, null, 2)}</pre>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-1">Hot-Path</h4>
              <pre className="text-xs bg-muted p-3 rounded">{JSON.stringify(dna.hot_path, null, 2)}</pre>
            </div>
          </TabsContent>

          <TabsContent value="mutations">
            <ScrollArea className="h-[300px]">
              {mutations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No mutations proposed yet. L11 (DNA Evolution) will queue proposals here.</p>
              ) : (
                <div className="space-y-2 pr-4">
                  {mutations.map((m) => (
                    <div key={m.id} className="border rounded-md p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4" />
                          <Badge variant="outline">{m.scope}</Badge>
                          <Badge variant={m.status === 'approved' ? 'default' : m.status === 'rejected' ? 'destructive' : 'secondary'}>
                            {m.status}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</span>
                      </div>
                      {m.trigger_reason && <p className="text-xs italic">{m.trigger_reason}</p>}
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">{JSON.stringify(m.proposed_mutation, null, 2)}</pre>
                      {m.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => decideMutation(m.id, 'approved')}>Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => decideMutation(m.id, 'rejected')}>Reject</Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
