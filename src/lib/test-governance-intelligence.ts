import { GovernanceIntelligenceInterfaceLayer } from './governance-intelligence-interface';

async function testIntelligenceInterface() {
  console.log('🧪 Starting CMACK Intelligence Interface Test...');

  const mockRuntimeState = {
    systemStatus: 'COMPLETED',
    stepExecutionLog: [
      { stepId: 'step_1', status: 'COMPLETED', startTime: '2026-04-24T12:00:00Z', endTime: '2026-04-24T12:00:01Z' }
    ]
  } as any;

  const mockSimulationResult = {
    forecastLog: [{ stepId: 'step_1', forecastedStatus: 'ALLOW' }]
  } as any;

  const mockFeedbackReport = {
    execution_id: 'exec_001',
    deviation_map: [{ step_id: 'step_1', deviation_type: 'NONE', severity: 'LOW' }],
    system_stability_index: 1.0,
    drift_classification: 'STABLE'
  } as any;

  const mockEvolutionResult = {
    version_chain: ['v1.0', 'v1.1'],
    rule_diffs: [{ rule_id: 'rule_1', action: 'MODIFY', changes: { value: 10 } }]
  } as any;

  console.log('\n--- GENERATING GOVERNANCE INTELLIGENCE VIEW ---');
  const view = GovernanceIntelligenceInterfaceLayer.generateView(
    mockRuntimeState,
    mockSimulationResult,
    mockFeedbackReport,
    mockEvolutionResult
  );

  console.log('\nGovernance Intelligence Interface Output:');
  console.log(JSON.stringify(view, null, 2));
  console.log('\n--- TEST END ---\n');
}

testIntelligenceInterface().catch(console.error);
