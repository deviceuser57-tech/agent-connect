import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Cloud, Database, Shield, Zap } from "lucide-react";

type Status = "idle" | "testing" | "connected" | "error";

interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

export default function CloudOverview() {
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<CheckResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const env = {
    url: import.meta.env.VITE_SUPABASE_URL as string | undefined,
    key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined,
    projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined,
  };

  const isConfigured = Boolean(env.url && env.key);

  const runTest = async () => {
    setStatus("testing");
    setError(null);
    const checks: CheckResult[] = [];

    checks.push({
      name: "Environment variables",
      ok: isConfigured,
      detail: isConfigured
        ? `Project ${env.projectId ?? "(unknown id)"}`
        : "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY",
    });

    try {
      const { error: authErr } = await supabase.auth.getSession();
      checks.push({
        name: "Auth service",
        ok: !authErr,
        detail: authErr ? authErr.message : "Reachable",
      });
    } catch (e) {
      checks.push({
        name: "Auth service",
        ok: false,
        detail: e instanceof Error ? e.message : "Unreachable",
      });
    }

    try {
      const res = await fetch(`${env.url}/rest/v1/`, {
        headers: { apikey: env.key ?? "" },
      });
      checks.push({
        name: "REST API endpoint",
        ok: res.ok || res.status === 404,
        detail: `HTTP ${res.status}`,
      });
    } catch (e) {
      checks.push({
        name: "REST API endpoint",
        ok: false,
        detail: e instanceof Error ? e.message : "Network error",
      });
    }

    setResults(checks);
    const allOk = checks.every((c) => c.ok);
    setStatus(allOk ? "connected" : "error");
    if (!allOk) setError("One or more connection checks failed.");
  };

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Cloud className="h-7 w-7 text-primary" />
            Lovable Cloud
          </h1>
          <p className="text-muted-foreground mt-1">
            Connect your project to Lovable Cloud and verify backend health.
          </p>
        </div>
        <Badge variant={isConfigured ? "default" : "destructive"} className="text-sm">
          {isConfigured ? "Connected" : "Not configured"}
        </Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
          <CardDescription>
            Lovable Cloud provides your database, authentication, storage, and edge functions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldRow label="Project ID" value={env.projectId} />
            <FieldRow label="API URL" value={env.url} mono />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={runTest} disabled={status === "testing"}>
              {status === "testing" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing…
                </>
              ) : (
                "Test connection"
              )}
            </Button>
            {status === "connected" && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> All systems operational
              </span>
            )}
            {status === "error" && (
              <span className="text-sm text-destructive flex items-center gap-1">
                <XCircle className="h-4 w-4" /> {error}
              </span>
            )}
          </div>

          {results.length > 0 && (
            <div className="border rounded-md divide-y mt-2">
              {results.map((r) => (
                <div key={r.name} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    {r.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="text-sm font-medium">{r.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{r.detail}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FeatureCard icon={<Database className="h-5 w-5" />} title="Database" desc="Postgres with RLS" />
        <FeatureCard icon={<Shield className="h-5 w-5" />} title="Auth" desc="Email, Google, more" />
        <FeatureCard icon={<Zap className="h-5 w-5" />} title="Edge Functions" desc="Serverless logic" />
      </div>
    </div>
  );
}

function FieldRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-sm truncate ${mono ? "font-mono" : ""}`}>
        {value || <span className="text-muted-foreground italic">not set</span>}
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-1 text-primary">{icon}<span className="font-semibold text-foreground">{title}</span></div>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </CardContent>
    </Card>
  );
}
