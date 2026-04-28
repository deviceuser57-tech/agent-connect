import { ExecutionOrchestrator, RuntimeStateManager } from './meis-runtime';
import { ActionRegistry } from './step-actions';
import { CEC } from './cognitive-enforcement-core';

/**
 * 🧪 Test Scenario: Stability Collapse
 * Purpose: Verify that AC-009.5 correctly stalls the system when drift exceeds limits.
 */
async function testStabilityCollapse() {
  console.log('🧪 Starting Stability Collapse Test (AC-009.5)...');

  // 1. Mock CEC to avoid Supabase dependencies in local tests
  CEC.validateExecution = async (sessionId: string, action: string, context: any) => {
    console.log(`[MockCEC] Allowing ${action}`);
    return { allowed: true, requiresApproval: false, auditStream: {}, arbitration: {} } as any;
  };

  // 2. Force some failures by overriding actions
  ActionRegistry['FAIL_ACTION'] = async () => {
    throw new Error("Simulated Execution Failure");
  };

  const unstableMEIS = {
    id: 'stability_collapse_001',
    operational_layer: { topology: 'HIERARCHICAL' as any },
    constitution_signature: 'sha256:sys_locked:test',
    step_sequence: [
      { id: 'S1', action: 'FAIL_ACTION', depends_on: [] },
      { id: 'S2', action: 'FAIL_ACTION', depends_on: ['S1'] },
      { id: 'S3', action: 'FAIL_ACTION', depends_on: ['S2'] },
      { id: 'S4', action: 'FAIL_ACTION', depends_on: ['S3'] }
    ]
  };

  const rsm = new RuntimeStateManager('stability_session', unstableMEIS.id);
  const orchestrator = new ExecutionOrchestrator(unstableMEIS as any, rsm);

  console.log('\n--- STARTING UNSTABLE EXECUTION ---');
  const result = await orchestrator.run();
  
  console.log('\nFinal System Result:', result);
  
  const state = rsm.getState();
  console.log('Final Status:', state.systemStatus);
  console.log('Failed Steps:', state.stepExecutionLog.filter(s => s.status === 'FAILED').length);

  if (result === 'STALL' || state.systemStatus === 'STALL') {
    console.log('✅ AC-009.5 VALIDATED: System STALLED due to instability.');
  } else {
    console.error(`❌ AC-009.5 FAILED: Expected STALL, got ${result}/${state.systemStatus}`);
  }
}

testStabilityCollapse().catch(console.error);
