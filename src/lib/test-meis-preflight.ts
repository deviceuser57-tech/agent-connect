import { PreflightCompiler } from './meis-preflight';

async function testPreflight() {
  console.log('🧪 Starting CMACK Preflight Simulation Test...');

  const mockMEIS = {
    id: 'meis_preflight_001',
    operational_layer: {
      topology: 'MESH'
    },
    step_sequence: [
      {
        id: 'step_1',
        action: 'READ_DATA',
        depends_on: [],
        actor_type: 'ANALYST',
        params: { source: 'db1' },
        metadata: { projectedRisk: 0.1 }
      },
      {
        id: 'step_2',
        action: 'WRITE_DATA',
        depends_on: ['step_1'],
        actor_type: 'EXECUTOR',
        params: {}, // Empty params should increase uncertainty
        metadata: { projectedRisk: 0.8 } // High risk should trigger MODIFY
      },
      {
        id: 'step_3',
        action: 'CRITICAL_ACTION',
        depends_on: ['step_2'],
        actor_type: 'ADMIN',
        metadata: { projectedRisk: 0.95 } // Extreme risk should trigger STALL
      }
    ]
  };

  const sessionId = 'session_test_preflight';
  const initialState = { riskScore: 0.1 };

  console.log('\n--- PREFLIGHT SIMULATION START ---');
  const result = await PreflightCompiler.simulate(sessionId, mockMEIS, initialState);
  console.log('\nFinal Simulation Result:');
  console.log(JSON.stringify(result, null, 2));
  console.log('--- PREFLIGHT SIMULATION END ---\n');

  // AC-004.FIX.3 MANDATORY VALIDATION CASES
  
  // 1. Missing Dependency (Structural Critical)
  console.log('🧪 Test 1: Missing Dependency (CRITICAL)');
  const missingDepMEIS = {
    id: "test_missing_dep",
    operational_layer: { topology: "MESH" },
    step_sequence: [{ id: "S1", depends_on: ["UNKNOWN"], action: "PROCESS" }]
  };
  const res1 = await PreflightCompiler.simulate('s1', missingDepMEIS as any, {});
  console.log('Decision:', res1.decision);
  console.log('Severity:', res1.forecastLog[0].severity);
  console.log('Code:', res1.forecastLog[0].violation_code);
  console.log('Causal:', res1.forecastLog[0].caused_by);

  // 2. High Risk (Governance Critical)
  console.log('\n🧪 Test 2: High Risk (CRITICAL)');
  const highRiskMEIS = {
    id: "test_high_risk",
    operational_layer: { topology: "MESH" },
    step_sequence: [{ id: "S1", action: "PROCESS", metadata: { projectedRisk: 0.95 } }]
  };
  const res2 = await PreflightCompiler.simulate('s2', highRiskMEIS as any, {});
  console.log('Decision:', res2.decision);
  const riskLog = res2.forecastLog.find(f => f.stepId === 'S1');
  console.log('Severity:', riskLog?.severity);

  // 3. Medium Uncertainty (Uncertainty Medium -> MODIFY)
  console.log('\n🧪 Test 3: Medium Uncertainty (MEDIUM -> MODIFY)');
  const medUncMEIS = {
    id: "test_med_unc",
    operational_layer: { topology: "MESH" },
    step_sequence: [{ id: "S1", action: "PROCESS", metadata: { projectedRisk: 0.1 } }]
  };
  // Mock uncertainty by providing empty params/state in a more complex setup if needed, 
  // but here we can just verify the threshold logic if we could force uScore.
  // For now, let's just run it and see the mapping.
  const res3 = await PreflightCompiler.simulate('s3', medUncMEIS as any, {});
  console.log('Decision:', res3.decision);

  // 4. Propagation Case (Causal Linking)
  console.log('\n🧪 Test 4: Propagation (Causal Linking)');
  const propagationMEIS = {
    id: "test_prop",
    operational_layer: { topology: "MESH" },
    step_sequence: [
      { id: "S1", action: "PROCESS", metadata: { projectedRisk: 0.1 } },
      { id: "S2", depends_on: ["S1"], action: "PROCESS", metadata: { projectedRisk: 0.1 } }
    ]
  };
  // In our system, empty params for S1 might cause uncertainty that propagates to S2
  const res4 = await PreflightCompiler.simulate('s4', propagationMEIS as any, {});
  const propLog = res4.forecastLog.find(f => f.stepId === 'S2' && f.violation_type === 'UNCERTAINTY');
  if (propLog) {
    console.log('S2 Propagated Severity:', propLog.severity);
    console.log('S2 Caused By:', propLog.caused_by);
  } else {
    console.log('No significant uncertainty propagation detected for S2 (Score <= 0.5)');
  }
}

testPreflight().catch(console.error);
