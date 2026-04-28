import { PreflightCompiler } from './meis-preflight';

async function testAdaptiveGovernance() {
  console.log('🧪 Starting CMACK Adaptive Governance Test...');

  const mockMEIS = {
    id: 'meis_adaptive_001',
    operational_layer: {
      topology: 'MESH'
    },
    step_sequence: [
      {
        id: 'step_1',
        action: 'READ_DATA',
        depends_on: [],
        params: {}, // Missing params -> high uncertainty
        metadata: { projectedRisk: 0.2 }
      },
      {
        id: 'step_2',
        action: 'PROCESS_DATA',
        depends_on: ['step_1'],
        metadata: { projectedRisk: 0.1 }
      },
      {
        id: 'step_3',
        action: 'SENSITIVE_WRITE',
        depends_on: ['step_2'],
        metadata: { projectedRisk: 0.4 } // Uncertainty from step_1 should propagate here
      }
    ]
  };

  const sessionId = 'session_test_adaptive';
  const initialState = { driftScore: 0.5 }; // Moderate drift -> increased CSI

  console.log('\n--- ADAPTIVE PREFLIGHT SIMULATION START ---');
  const result = await PreflightCompiler.simulate(sessionId, mockMEIS, initialState);
  console.log('\nFinal Adaptive Simulation Result:');
  console.log(JSON.stringify(result, null, 2));
  console.log('--- ADAPTIVE PREFLIGHT SIMULATION END ---\n');
}

testAdaptiveGovernance().catch(console.error);
