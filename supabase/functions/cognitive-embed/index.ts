// Generates 768-dim embeddings via Lovable AI Gateway (Gemini text-embedding-004)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), { status: 401, headers: cors });
    }

    const { text } = await req.json();
    if (!text || typeof text !== "string") throw new Error("text required");
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/text-embedding-004",
        input: text.slice(0, 8000),
      }),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "Credits exhausted" }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("embed gateway error", resp.status, t);
      // Soft fallback: return zeros so caller can still operate
      return new Response(JSON.stringify({ embedding: null, error: "embedding unavailable" }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const embedding = data.data?.[0]?.embedding ?? null;
    return new Response(JSON.stringify({ embedding }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("embed error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown", embedding: null }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
