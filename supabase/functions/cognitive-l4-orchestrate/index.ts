import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are L4, the Cyclic Orchestration Engine of a Self-Reforming Cognitive Architecture.
...
If prior_cycles exist, you MUST address their evaluate.weaknesses in your think/adjust.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing or invalid authorization header" }), { status: 401, headers: cors });
    }

    // Create Supabase client and verify JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Auth failed:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors });
    }

    // 2. CMACK Cognitive Consistency Gate (AC-009.6)
    const { validateCmackGate } = await import("../_shared/cmack-gate.ts");
    const gate = await validateCmackGate(req, supabase);
    if (!gate.allowed) {
      return new Response(JSON.stringify({ error: gate.error }), { status: gate.status, headers: cors });
    }

    const { user_intent, decision_contract, memory_recall, prior_cycles, dna } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const userPayload = JSON.stringify({
      user_intent,
      decision_contract,
      memory_recall: (memory_recall ?? []).slice(0, 3),
      prior_cycles: prior_cycles ?? [],
      dna_summary: {
        philosophy: dna?.philosophy,
        value_system: dna?.value_system,
        reasoning_constraints: dna?.reasoning_constraints,
      },
    });

    const body = {
      model: dna?.governance?.primary_provider || "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userPayload },
      ],
      tools: [{
        type: "function",
        function: {
          name: "emit_cycle",
          description: "Emit one structured orchestration cycle",
          parameters: {
            type: "object",
            properties: {
              think: { type: "string" },
              simulate: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    branch: { type: "string" },
                    likelihood: { type: "number" },
                    outcome: { type: "string" },
                  },
                  required: ["branch", "likelihood", "outcome"],
                  additionalProperties: false,
                },
              },
              evaluate: {
                type: "object",
                properties: {
                  weaknesses: { type: "array", items: { type: "string" } },
                  assumptions: { type: "array", items: { type: "string" } },
                },
                required: ["weaknesses", "assumptions"],
                additionalProperties: false,
              },
              adjust: { type: "string" },
              proposed_spec: {
                type: "object",
                properties: {
                  summary: { type: "string" },
                  components: { type: "array", items: { type: "string" } },
                  data_flow: { type: "string" },
                },
                required: ["summary", "components", "data_flow"],
                additionalProperties: false,
              },
              self_assessment: {
                type: "object",
                properties: {
                  confidence: { type: "number" },
                  divergence: { type: "number" },
                  stability: { type: "number" },
                },
                required: ["confidence", "divergence", "stability"],
                additionalProperties: false,
              },
            },
            required: ["think", "simulate", "evaluate", "adjust", "proposed_spec", "self_assessment"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "emit_cycle" } },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
    if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("L4 gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No tool call returned");
    const cycle = JSON.parse(args);

    return new Response(JSON.stringify({ cycle }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("L4 error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
