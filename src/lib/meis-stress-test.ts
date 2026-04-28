import { ExecutionOrchestrator, RuntimeStateManager, MEIS } from './meis-runtime';
import { PreflightCompiler } from './meis-preflight';

// Importing scenarios directly
import stress_cycle_001 from './stress-scenarios/stress_cycle_001.json';
import stress_risk_002 from './stress-scenarios/stress_risk_002.json';
import stress_dependency_003 from './stress-scenarios/stress_dependency_003.json';
import stress_topology_004 from './stress-scenarios/stress_topology_004.json';
import stress_signature_005 from './stress-scenarios/stress_signature_005.json';

const scenarios: MEIS[] = [
  stress_cycle_001 as any,
  stress_risk_002 as any,
  stress_dependency_003 as any,
  stress_topology_004 as any,
  stress_signature_005 as any
];

/**
 * 🔥 AC-STRESS-001 — CMACK Stress Test Pack
 * Validates deterministic stability, governance enforcement, and constitutional integrity.
 */
export async function runStressTests() {
  console.log('🚀 [StressTest] Starting AC-STRESS-001 Stress Test Pack...');
  
  for (const scenario of scenarios) {
    console.log(`\n🔥 Running Scenario: ${scenario.id}`);

    // 1. Preflight Simulation
    const preflight = await PreflightCompiler.simulate(
      `stress_session_${Date.now()}`,
      scenario,
      {}
    );

    console.log(`Preflight Result: ${preflight.decision}`);

    if (preflight.decision !== 'PASS') {
      console.log('⛔ Execution Blocked by Preflight');
      continue;
    }

    // 2. Runtime Execution (if Preflight passed)
    const rsm = new RuntimeStateManager(`stress_session_${Date.now()}`, scenario.id);
    const orchestrator = new ExecutionOrchestrator(scenario, rsm);

    const result = await orchestrator.run();

    console.log(`Execution Result: ${result}`);
    
    const finalState = rsm.getState();
    console.log('Final System Status:', finalState.systemStatus);
    console.log('Step Logs:', finalState.stepExecutionLog.length);
  }
  
  console.log('\n✅ [StressTest] AC-STRESS-001 Pack Execution Finished.');
}
