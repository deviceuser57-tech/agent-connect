// L1 — Mode Inference Scoring Engine
// Returns probabilistic scores over {workflow, cognitive, hybrid}
// + complexity, risk, abstraction, simulation_need
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are L1, the Mode Inference layer of a Self-Reforming Cognitive Architecture.

Your job: read the user request and emit STRUCTURED PROBABILISTIC SCORES — never prose.

You score the request across:
- mode: {workflow, cognitive, hybrid} — sums to 1.0
- factors: complexity, risk, abstraction, simulation_need (each 0..1)
- recommended_mode: the highest-scored mode
- confidence: how certain you are about the recommendation (0..1)
- reasoning: 1-2 sentence justification
- hot_path_eligible: true if complexity < 0.35 AND risk < 0.4

Heuristics:
- "build me a workflow / pipeline / agents to do X" → workflow
- "predict / forecast / decide / strategize / when to / which / simulate" → cognitive
- "think about X then execute Y" / "evaluate then act" → hybrid
- High abstraction + simulation_need → cognitive
- Multi-step concrete tasks → workflow
- Decision under uncertainty → cognitive`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { user_input, dna } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const body = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `User request:\n"""${user_input}"""\n\nDNA hot_path threshold: ${dna?.hot_path?.threshold ?? 0.35}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "emit_mode_inference",
          description: "Emit structured mode inference scores",
          parameters: {
            type: "object",
            properties: {
              scores: {
                type: "object",
                properties: {
                  workflow: { type: "number" },
                  cognitive: { type: "number" },
                  hybrid: { type: "number" },
                },
                required: ["workflow", "cognitive", "hybrid"],
                additionalProperties: false,
              },
              factors: {
                type: "object",
                properties: {
                  complexity: { type: "number" },
                  risk: { type: "number" },
                  abstraction: { type: "number" },
                  simulation_need: { type: "number" },
                },
                required: ["complexity", "risk", "abstraction", "simulation_need"],
                additionalProperties: false,
              },
              recommended_mode: { type: "string", enum: ["workflow", "cognitive", "hybrid"] },
              confidence: { type: "number" },
              hot_path_eligible: { type: "boolean" },
              reasoning: { type: "string" },
            },
            required: ["scores", "factors", "recommended_mode", "confidence", "hot_path_eligible", "reasoning"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "emit_mode_inference" } },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("L1 gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No tool call returned");
    const inference = JSON.parse(args);

    return new Response(JSON.stringify({ inference }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("L1 error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
