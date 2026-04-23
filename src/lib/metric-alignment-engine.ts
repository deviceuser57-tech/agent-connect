/**
 * METRIC ALIGNMENT LAYER (MAL v1.0)
 * Purpose: Interpreting divergence between high-level scenarios and low-level execution events.
 * Principle: Explanation, not correction.
 */
export const MAL = {
  
  align: (scenarios: any[], executions: any[]) => {
    const scenarioCount = scenarios.length;
    const executionCount = executions.length;

    // 1. Layers Representation
    const scenario_layer = {
      defined_scenarios: scenarioCount,
      scenario_map: scenarios.map(s => s.name || s.action)
    };

    const execution_layer = {
      event_count: executionCount,
      passed: executions.filter(e => e.allowed).length,
      blocked: executions.filter(e => !e.allowed).length,
      partial_arbitration: executions.filter(e => e.requiresApproval).length
    };

    // 2. Aligned View (Interpretation)
    const aligned_view = {
      effective_tests: scenarioCount,
      execution_density: executionCount / (scenarioCount || 1), // Ratio of events per scenario
      block_rate: `${( (execution_layer.blocked / executionCount) * 100 ).toFixed(1)}%`,
      pass_rate: `${( (execution_layer.passed / executionCount) * 100 ).toFixed(1)}%`,
      divergence_detected: executionCount !== scenarioCount,
      divergence_reason: executionCount > scenarioCount 
        ? "Sub-event logging or burst iteration detected" 
        : executionCount < scenarioCount ? "Early exit or test failure" : "None"
    };

    return {
      scenario_layer,
      execution_layer,
      aligned_view
    };
  }
};
