import {
  MOCK_TELEMETRY,
  MOCK_TELEMETRY_HISTORY,
  MOCK_QUEUE,
  MOCK_DECISIONS,
  MOCK_PASS_HISTORY,
  MOCK_SCENARIOS,
  MOCK_VALIDATION_RUNS,
  MOCK_DEPLOYMENT_STATE,
  MOCK_ROUTER_SETTINGS
} from './mockData';

// Frontend-Only Simulation API Client (Pure In-Memory Fallback)
export const api = {
  // Telemetry API
  getTelemetry: async () => MOCK_TELEMETRY,
  getTelemetryHistory: async () => MOCK_TELEMETRY_HISTORY,

  // Transmission Queue API
  getQueue: async () => MOCK_QUEUE,

  // Decision Logs API
  getDecisions: async () => MOCK_DECISIONS,

  // Operator Override Command API
  sendOverride: async (mode) => ({
    success: true,
    mode,
    message: `Operator manual override issued: ${mode}`
  }),

  // Pass History API
  getPasses: async () => MOCK_PASS_HISTORY,

  // Safety Validation Console API
  getScenarios: async () => MOCK_SCENARIOS,

  createScenario: async (scenario) => ({
    success: true,
    scenario: { ...scenario, id: `SCEN-${Date.now()}` }
  }),

  runScenario: async (id) => ({
    scenarioId: id,
    status: 'PASSED',
    scorePercentage: 100,
    rulesChecked: [
      { name: 'TT&C max wait time <= 120s', status: 'PASS', details: 'Max wait time observed: 105s' },
      { name: 'Critical battery threshold >= 20%', status: 'PASS', details: 'Min battery level: 32.4%' },
      { name: 'Priority Router Score Order Enforced', status: 'PASS', details: 'All items dispatched strictly by priority formula' }
    ],
    runAt: new Date().toISOString()
  }),

  getValidationRuns: async () => MOCK_VALIDATION_RUNS,

  // Deployment State Machine API Stubs
  getDeploymentState: async () => MOCK_DEPLOYMENT_STATE,
  transitionDeployment: async (nextStateIndex) => ({ success: true, nextStateIndex }),
  triggerContingency: async (reason) => ({ success: true, reason }),
  resolveContingency: async (action) => ({ success: true, action, message: `Contingency resolved via action: ${action}` }),

  // Settings API
  getSettings: async () => MOCK_ROUTER_SETTINGS,
  updateSettings: async (settings) => ({ success: true, settings })
};
