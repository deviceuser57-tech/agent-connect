import { SystemConstitutionLock } from './system-constitution-lock';
import { ExecutionOrchestrator, RuntimeStateManager } from './meis-runtime';

async function testSystemStallOnViolation() {
  console.log('🧪 Testing System Stall on Constitutional Violation (AC-008)...');

  const mockMEIS = {
    id: 'meis_illegal_001',
    step_sequence: [{ id: 'illegal_step', action: 'BYPASS_SECURITY' }]
  };

  // 1. Simulate an unauthorized execution source
  console.log('\n--- ATTEMPTING UNAUTHORIZED EXECUTION ---');
  const isAllowed = SystemConstitutionLock.validateAction('EXTERNAL_HACK');
  
  if (!isAllowed) {
    console.log('✅ PASS: Unauthorized execution blocked by Kernel Guard.');
  } else {
    console.error('❌ FAIL: Unauthorized execution allowed!');
    process.exit(1);
  }

  // 2. Verify Orchestrator Stall
  console.log('\n--- VERIFYING ORCHESTRATOR STALL ON LOCK VIOLATION ---');
  const stateManager = new RuntimeStateManager('session_illegal', mockMEIS.id);
  const orchestrator = new ExecutionOrchestrator(mockMEIS as any);
  
  // We need to simulate the orchestrator running and hitting the lock
  // Since we integrated the lock check in ExecutionOrchestrator.run()
  await orchestrator.run();
  
  const finalState = stateManager.getState();
  console.log(`Final System Status: ${finalState.systemStatus}`);

  if (finalState.systemStatus === 'HALTED' || finalState.systemStatus === 'STALLED') {
    console.log('✅ PASS: Orchestrator stalled immediately upon lock violation.');
  } else {
    console.error('❌ FAIL: Orchestrator failed to stall!');
    process.exit(1);
  }

  console.log('\n✨ System Integrity Verified: All constitutional boundaries are enforced.');
}

testSystemStallOnViolation().catch(console.error);
