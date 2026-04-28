import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are L1, the Mode Inference layer of a Self-Reforming Cognitive Architecture.
...
- Decision under uncertainty → cognitive`;

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
