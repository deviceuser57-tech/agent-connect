import { SystemState } from '../constitution/icos.constitution';
import { MemoryGraphEngine } from './memory-graph';
import { simulateOutcome } from './esvl';
import { evaluateTransition } from './gec';
import { commitState } from './rbl';
import { DynamicDNAEngine } from './dna-engine';
import { SelfCorrectionEngine } from './self-correction';
import { MutationEngine } from './mutation-engine';
import { ObservabilityEngine } from './observability';
import { CollectiveNegotiator } from './collective-negotiator';
import { GlobalCognitiveBus } from './cognitive-bus';
import { supabaseCompat as supabase } from '@/integrations/supabase/cmack-compat';

/**
 * Orchestrator (CMACK v2.3 - Self-Learning Kernel)
 * Flow: RECALL -> INFER -> SIMULATE -> VALIDATE -> COMMIT -> LEARN -> CORRECT -> MUTATE
 */
export const runExecutionStep = async (
  sessionId: string,
  currentState: SystemState,
  event: string,
  payload: any
): Promise<{ success: boolean; nextState?: SystemState; error?: string }> => {
  
  // 1. RECALL -> Fetch Causal Graph
  const subgraph = await MemoryGraphEngine.getWeightedSubgraph(sessionId, 50);

  // 2. DNA Retrieval
  const dDna = await DynamicDNAEngine.fetchActiveDNA(sessionId);

  // 3. SIMULATE (REAL)
  const { projectedRisk } = await simulateOutcome(sessionId, currentState, payload);

  // 4. GEC VALIDATION
  const validation = evaluateTransition({ 
    currentState, event, data: { ...payload, dDna }, subgraph, projectedRisk
  });

  if (!validation.isValid) {
      await commitState(sessionId, 'PHASE_LOCKED', { error: validation.reason, projectedRisk });
      return { success: false, error: validation.reason };
  }

  const { decision } = validation;

  // 5. COLLECTIVE CONSENSUS (PHASE 10 CORE)
  // If moving to a critical state, require collective consensus
  const criticalStates: SystemState[] = ['PHASE_RUNNING', 'PHASE_APPROVED', 'PHASE_LOCKED'];
  if (criticalStates.includes(decision.primary)) {
    const proposal = await CollectiveNegotiator.proposeStateChange(sessionId, 'KERNEL_MASTER', decision.primary);
    if (proposal) {
      GlobalCognitiveBus.getInstance().broadcast('PROPOSAL_CREATED', {
        negotiationId: proposal.id,
        fromState: currentState,
        event,
        payload
      });
      
      // For MVP, we proceed but log that it's pending. 
      // In a fully synchronous mode, we would await 'CONSENSUS_REACHED' here.
      console.log(`[ORCHESTRATOR] Consensus Proposal Created: ${proposal.id}`);
    }
  }

  // 6. COMMIT (RBL)
  const committedData = await commitState(sessionId, decision.primary, { ...payload, projectedRisk });
  
  // 6. POST-COMMIT VALIDATION & GROUND TRUTH (v1.0)
  const { data: dbNode } = await supabase
    .from('memory_graph_nodes')
    .select('state')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const statePersisted = dbNode?.state === decision.primary;
  const hasErrors = (committedData as any)?.error || false;
  const failureStates: SystemState[] = ['PHASE_LOCKED', 'IDLE', 'PHASE_REJECTED'];

  // Outcome Gradient System
  let outcomeScore = 0.1; // Baseline SUCCESS (0.0 - 0.2)
  if (!statePersisted || hasErrors || failureStates.includes(decision.primary)) {
    outcomeScore = 0.9; // FAILURE (0.7 - 1.0)
  } else if ((payload.retryCount && payload.retryCount > 0) || payload.isPartial || (payload.latency && payload.latency > 1000) || payload.rollback) {
    outcomeScore = 0.5; // DEGRADED (0.3 - 0.6)
  }

  let actualOutcomeWeight = Math.min(outcomeScore + ((payload.severity_factor || 0.1) * 0.4), 1.0);
  let bias = actualOutcomeWeight - projectedRisk; // gradient difference
  let deviation = Math.abs(bias);

  // Failure Memory Enrichment: store failure details
  const failureType = outcomeScore >= 0.7 ? (hasErrors ? 'EXECUTION_ERROR' : 'STATE_REJECTION') : 'NONE';
  const timeToFailure = outcomeScore >= 0.7 ? (payload.latency || 0) : 0;
  const recoveryCost = (payload.retryCount || 0) * 0.2;

  // Store realization trace
  const { error: traceError } = await supabase.from('execution_traces').insert({
    session_id: sessionId,
    predicted_risk: projectedRisk,
    actual_weight: actualOutcomeWeight,
    bias,
    deviation,
    created_at: new Date().toISOString(),
    chaos_type: payload.chaosType || 'NONE',
    failure_type: failureType,
    time_to_failure: timeToFailure,
    recovery_cost: recoveryCost
  });

  // Verify trace integrity
  if (traceError && actualOutcomeWeight !== 1.0) {
    // Force penalty if trace integrity fails
    actualOutcomeWeight = 1.0;
    bias = actualOutcomeWeight - projectedRisk;
    deviation = Math.abs(bias);
  }

  // 7. BEHAVIOR CONTROL LAYER (PHASE 9)
  const { data: recentTraces } = await supabase
    .from('execution_traces')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(10);

  let stabilityScore = 1.0;
  let behaviorFlag = 'STABLE';
  let mutationBlocked = false;

  if (recentTraces && recentTraces.length > 0) {
    // A. Stability Score calculation
    const avgDeviation = recentTraces.reduce((acc, t) => acc + (t.deviation || 0), 0) / recentTraces.length;
    stabilityScore = Math.max(0, 1 - avgDeviation);

    // B. Behavior Classification
    const riskTolerance = (dDna as any).risk_tolerance || 0.4;
    const rejections = recentTraces.filter(t => t.actual_weight >= 0.7).length;
    const failures = recentTraces.filter(t => t.failure_type !== 'NONE').length;
    const rejectionRate = rejections / recentTraces.length;
    const failureRate = failures / recentTraces.length;

    if (riskTolerance < 0.2 && rejectionRate > 0.7) behaviorFlag = 'OVER_CONSERVATIVE';
    else if (riskTolerance > 0.6 && failureRate > 0.6) behaviorFlag = 'OVER_RISKY';

    // C. Mutation Rate Limiter (Block if > 2 in last 10)
    const { count: mutationCount } = await supabase
      .from('architecture_change_log')
      .select('*', { count: 'exact', head: true })
      .eq('change_type', 'DNA_MUTATION')
      .gte('created_at', recentTraces[recentTraces.length - 1].created_at);

    if ((mutationCount || 0) >= 2) mutationBlocked = true;

    // Trigger DNA Adaptation if enough history
    if (recentTraces.length >= 10) {
      await DynamicDNAEngine.updateBias(recentTraces);
    }
  }

  // Update latest trace with behavioral analytics
  const { data: lastTraceRecord } = await supabase
    .from('execution_traces')
    .select('id')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (lastTraceRecord) {
    await supabase.from('execution_traces').update({
      stability_score: stabilityScore,
      behavior_flag: behaviorFlag,
      mutation_blocked: mutationBlocked
    }).eq('id', lastTraceRecord.id);
  }

  // 8. SELF-CORRECTION (Mutation Control)
  const correction = await SelfCorrectionEngine.analyzeSystemicFailures(sessionId);
  
  if (correction.recommend_mutation) {
    if (mutationBlocked) {
      // Enforcement: BLOCK mutation if rate limit exceeded
      console.warn('PHASE 9: Mutation Blocked (Rate Limit Exceeded)');
    } else {
      const traitKey = correction.target_trait as string;
      
      const { data: freshDna } = await supabase
        .from('cognitive_dna')
        .select('trait_value')
        .eq('trait_key', traitKey)
        .single();

      const currentTraitValue = freshDna ? Number(freshDna.trait_value) : ((dDna as any)[traitKey] || 0.5);
      const proposedChange = correction.adjustment || 0;
      const proposedValue = currentTraitValue + proposedChange;

      const safetyCheck = evaluateTransition({ 
        currentState, 
        event, 
        data: { ...payload, dDna: { ...dDna, [traitKey]: proposedValue } }, 
        subgraph, 
        projectedRisk 
      });

      const drift = Math.abs(proposedChange / (currentTraitValue || 1));
      if (safetyCheck.isValid && drift <= 0.10) {
        await MutationEngine.applyMutation(
          correction.reason || 'Self-Correction Verified',
          traitKey,
          proposedValue
        );
      }
    }
  }

  // Log Observability
  await ObservabilityEngine.logTrace({
      sessionId,
      stateBefore: currentState,
      inferredMode: 'EXECUTION',
      chaosType: payload.chaosType || 'NONE',
      chaosLevel: payload.chaosLevel || 0,
      stabilityBudget: payload.stabilityBudget || 1.0,
      gecDecision: decision,
      selectedPath: decision.primary,
      finalState: decision.primary
  });

  return { success: true, nextState: decision.primary };
};
