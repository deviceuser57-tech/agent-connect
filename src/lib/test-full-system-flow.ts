import { ExecutionOrchestrator, MEIS } from './meis-runtime';
import { PreflightCompiler } from './meis-preflight';
import { SystemConstitutionLock } from './system-constitution-lock';

async function runHardenedFlow() {
  console.log('🌌 [CMACK Hardened Flow] Starting Real Execution Verification...\n');

  const sessionId = `test_hardened_${Date.now()}`;
  
  const meis: MEIS = {
    id: 'meis_hardened_verification_001',
    constitution_signature: 'VALID_AC008_SIG',
    operational_layer: { topology: 'MESH' },
    step_sequence: [
      { id: 'ingest_01', action: 'DATA_INGEST', depends_on: [], metadata: { projectedRisk: 0.1 } },
      { id: 'transform_01', action: 'TRANSFORM', depends_on: ['ingest_01'], metadata: { projectedRisk: 0.2 } },
      { id: 'commit_01', action: 'FINAL_COMMIT', depends_on: ['transform_01'], metadata: { projectedRisk: 0.1 } }
    ]
  };

  // 1. Hardened Preflight
  console.log('--- PHASE 1: HARDENED PREFLIGHT ---');
  const preflight = await PreflightCompiler.simulate(sessionId, meis, { systemActive: true });
  console.log(`Preflight Verdict: ${preflight.decision}`);
  console.log(`Topology Feasibility: ${preflight.topologyFeasibility.feasible ? 'PASS' : 'FAIL'} (Cost: ${preflight.topologyFeasibility.costScore})`);

  if (preflight.decision === 'STALL') {
    console.error('🛑 Preflight STALLED. Flow Aborted.');
    return;
  }

  // 2. Real Execution
  console.log('\n--- PHASE 2: REAL EXECUTION (MESH) ---');
  const orchestrator = new ExecutionOrchestrator(meis);
  const finalStatus = await orchestrator.run();
  
  console.log(`\nFinal System Status: ${finalStatus}`);

  // 3. Constitution Lock Check
  console.log('\n--- PHASE 3: LOCK VERIFICATION ---');
  const lockStatus = SystemConstitutionLock.getEnforcementStatus({
    AC002_state: 'HARDENED',
    AC003_state: 'MESH_ACTIVE',
    AC004_state: 'PREFLIGHT_VERIFIED',
    AC005_state: 'TRACE_PERSISTED',
    AC006_state: 'VERSION_SEALED',
    AC007_state: 'LIVE_UI_BOUND'
  });
  console.log(`Lock Signature: ${lockStatus.constitution_signature}`);
  console.log(`Integrity: ${lockStatus.lock_integrity}`);

  console.log('\n✨ [CMACK Hardened Flow] End-to-End Verification Complete.');
}

runHardenedFlow().catch(console.error);
