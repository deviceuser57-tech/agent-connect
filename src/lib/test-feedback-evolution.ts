import { CognitiveFeedbackEngine } from './meis-feedback';
import { GovernanceEvolutionEngine } from './governance-evolution';

async function testFeedbackAndEvolution() {
  console.log('🧪 Starting CMACK Feedback & Evolution Test...');

  const mockSimulationResult = {
    forecastLog: [
      { stepId: 'step_1', forecastedStatus: 'ALLOW' },
      { stepId: 'step_2', forecastedStatus: 'ALLOW' }
    ]
  } as any;

  const mockRuntimeState = {
    stepExecutionLog: [
      { stepId: 'step_1', status: 'COMPLETED', startTime: '2026-04-24T12:00:00Z', endTime: '2026-04-24T12:00:01Z' },
      { stepId: 'step_2', status: 'COMPLETED', startTime: '2026-04-24T12:00:05Z', endTime: '2026-04-24T12:00:15Z' } // High latency
    ]
  } as any;

  const sessionId = 'session_feedback_test';
  const executionId = 'exec_001';

  console.log('\n--- FEEDBACK ANALYSIS START ---');
  const report = await CognitiveFeedbackEngine.generateReport(executionId, mockSimulationResult, mockRuntimeState);
  console.log('\nCognitive Feedback Report:');
  console.log(JSON.stringify(report, null, 2));

  console.log('\n--- GOVERNANCE EVOLUTION START ---');
  const evolution = await GovernanceEvolutionEngine.processEvolution(sessionId, report, 'v1.0');
  console.log('\nGovernance Evolution Result:');
  console.log(JSON.stringify(evolution, null, 2));
  console.log('--- TEST END ---\n');
}

testFeedbackAndEvolution().catch(console.error);
