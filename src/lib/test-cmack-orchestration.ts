import { ExecutionOrchestrator } from './meis-runtime';

async function testRuntime() {
  console.log('🧪 Starting CMACK Orchestration Test...');

  const mockMEIS = {
    id: 'meis_test_001',
    operational_layer: {
      topology: 'MESH'
    },
    step_sequence: [
      {
        id: 'step_1',
        action: 'READ_DATA',
        depends_on: [],
        actor_type: 'ANALYST',
        metadata: { projectedRisk: 0.1 }
      },
      {
        id: 'step_2',
        action: 'WRITE_DATA',
        depends_on: ['step_1'],
        actor_type: 'EXECUTOR',
        metadata: { projectedRisk: 0.2 }
      },
      {
        id: 'step_3',
        action: 'TRIGGER_RECOVERY',
        depends_on: ['step_2'],
        actor_type: 'ADMIN',
        metadata: { projectedRisk: 0.9, critical: true } // High risk should trigger switch to HIERARCHICAL
      }
    ]
  };

  const sessionId = 'session_test_abc';
  const orchestrator = new ExecutionOrchestrator(sessionId, mockMEIS);

  console.log('\n--- EXECUTION START ---');
  await orchestrator.run();
  console.log('--- EXECUTION END ---\n');
}

testRuntime().catch(console.error);
