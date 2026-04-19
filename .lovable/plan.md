

## Plan: Self-Reforming Cognitive Architecture (Cognitive DNA + 12 Layers)

Replace the current Workflow Builder generation pipeline with a **DNA-governed, 12-layer cognitive engine** (L0–L11). The existing visual canvas + execution runtime stay intact — they consume the **final spec** the cognitive engine produces.

### Strategic Question Recommendations

**Q1 — L7 model independence:** **Yes.** L4 orchestration uses `google/gemini-3-flash-preview` (fast, broad); L7 Adversarial Governance uses `openai/gpt-5-mini` (different family → genuinely independent critique, no shared bias). Stored as DNA field `governance.adversarial_provider`.

**Q2 — Hot-Path skipping:** **Yes, DNA-controlled.** L1 emits a `complexity_score`. If `< dna.hot_path_threshold` (default 0.35) and risk is low, skip L5.5 (Counterfactual), L9 (Failure Simulation), and cap L4 cycles at 1. High-risk inputs (safety, irreversibility, financial) **always** run the full stack regardless of complexity. Toggle: `dna.hot_path.enabled`.

**Q3 — DNA scope:** **Hybrid.** One **Workspace DNA** (baseline identity) + optional **Workflow DNA Overlays** for critical workflows. Overlays inherit core principles (immutable) but can tighten constraints, raise weights, or restrict reasoning modes. L11 evolution is scoped — overlay mutations stay local; workspace-DNA mutations require governance approval.

### Architecture

```text
User input
   ↓
[L0] Decompose → detect ambiguity/contradictions
   ↓
[L1] Mode Inference (scoring) → {workflow, cognitive, hybrid} + complexity + risk
   ↓ (if confidence < threshold)
[L2] Negotiation Loop → Decision Contract signed
   ↓
[L3] Episodic Memory recall (vector) → past decisions injected
   ↓
[L4] Cyclic Orchestration (max 3): Think → Simulate → Evaluate → Adjust
        ├─ [L5] Fidelity Scoring (confidence/stability/divergence)
        ├─ [L5.5] Counterfactual (best/worst case) [skipped on hot-path]
        └─ [L6] Self-Correction (logic/assumption/instability)
   ↓
[L7] Adversarial Governance (independent LLM, tries to break it)
   ↓
[L8] Constraint Engine (rules, bias, justification)
   ↓
[L9] Failure Simulation (stress, collapse paths) [skipped on hot-path]
   ↓ (on repeated failure)
[L10] Self-Reform → mutate reasoning paths, rebuild
   ↓ (on cross-scenario breakdown)
[L11] DNA Evolution Protocol → propose micro-mutation → shadow test → approve
   ↓
Final Spec → existing canvas + executor + Memory write-back
```

### Database (one migration)

- `cognitive_dna` — workspace_id, version, identity (jsonb, immutable core), philosophy, value_system, reasoning_constraints, learning_boundaries, evolution_permissions, governance, hot_path, parent_version, created_at.
- `dna_overlays` — workflow_id, base_dna_version, overrides (jsonb), active.
- `decision_memory_graph` — context, reasoning_path, simulation_branches, outcome_feedback, fidelity_scores (jsonb), embedding (vector), dna_version, workspace_id.
- `dna_mutations` — proposed_mutation, trigger_reason, shadow_test_results, status (pending/approved/rejected), governance_verdict.
- `cognition_traces` — full per-layer trace per run (for the Cognition tab + audit).

### Edge Functions (new)

- `cognitive-l1-infer` — scoring engine, structured tool-call output.
- `cognitive-l4-orchestrate` — runs the iterative Think/Simulate/Evaluate/Adjust cycles, injects DNA + memory, calls L5/L5.5/L6 inline.
- `cognitive-l7-governance` — **different model** from L4 (gpt-5-mini); independent validator.
- `cognitive-l9-simulate` — failure/stress simulation.
- `cognitive-l11-evolve` — DNA mutation proposer + shadow tester + versioning.

The existing `workflow-builder` becomes the **final-stage spec emitter** invoked by L4 once the contract + reasoning are stable.

### Frontend (`src/lib/cognitive/` + components)

- `dna.ts` — load/merge workspace DNA + overlay; immutable-core guards.
- `orchestrator.ts` — client-side coordinator that walks L0→L11, decides hot-path, persists traces.
- `fidelityScoring.ts`, `constraints.ts`, `counterfactual.ts` — pure helpers.
- `ArchitectureNegotiation.tsx` — L2 UI: proposal card, score bars, Accept/Refine/Reject.
- `CycleVisualizer.tsx` — L4 live trace: per-cycle fidelity + delta.
- `CognitionTab.tsx` — added to Workflow Builder details: shows DNA snapshot, full L0–L11 trace, governance verdict, simulation results, memory references used.
- `DNAManager.tsx` — Settings page: view current DNA, version history, pending mutations, approve/reject.
- `MemoryGraphPanel.tsx` — browse past decisions and outcomes.

### Export System

New `exportCognitivePackage()` produces a JSON Config Package containing: full DNA (versioned), execution spec, memory references used, cognition trace, governance verdict, simulation results. Downloadable + re-importable.

### Modifications

- `src/pages/WorkflowBuilder.tsx` — replace mode dropdown with negotiation flow; replace single-shot generation with `orchestrator.run()`; add Cognition tab.
- `supabase/functions/workflow-builder/index.ts` — strip the "ask 1/2/3" prompt; becomes pure final-spec emitter receiving structured Decision Contract + reasoning trace.
- Existing `autoComplete.ts` and `run-workflow` runtime untouched — they consume the final spec.

### Implementation Phases

1. **Phase 1 (this approval):** DNA schema + tables + DNA Manager UI + Memory graph + L0/L1/L2/L3.
2. **Phase 2:** L4 orchestration + L5/L5.5/L6 + Cognition tab + CycleVisualizer.
3. **Phase 3:** L7 Adversarial (independent model) + L8 Constraints + L9 Simulation + Hot-Path routing.
4. **Phase 4:** L10 Self-Reform + L11 DNA Evolution + shadow testing + Export package.

### Backwards Compatibility

Existing workflows keep working unchanged. The cognitive engine is opt-in per-generation initially (toggle in builder), then default once Phase 4 ships.

