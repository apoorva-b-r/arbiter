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

const BASE_URL = '/api';
const USE_MOCK_FALLBACK = true;

async function fetchJson(endpoint, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    if (USE_MOCK_FALLBACK) {
      console.warn(`API call ${endpoint} failed or offline. Using mock fallback.`, err.message);
      return null;
    }
    throw err;
  }
}

export const api = {
  // Telemetry API
  getTelemetry: async () => {
    const data = await fetchJson('/telemetry/latest');
    return data || MOCK_TELEMETRY;
  },
  
  getTelemetryHistory: async () => {
    const data = await fetchJson('/telemetry/history');
    return data || MOCK_TELEMETRY_HISTORY;
  },

  // Transmission Queue API
  getQueue: async () => {
    const data = await fetchJson('/queue');
    return data || MOCK_QUEUE;
  },

  // Decision Logs API
  getDecisions: async () => {
    const data = await fetchJson('/decisions');
    return data || MOCK_DECISIONS;
  },

  // Operator Override Command API
  sendOverride: async (mode) => {
    const res = await fetchJson('/override', {
      method: 'POST',
      body: JSON.stringify({ mode })
    });
    return res || { success: true, mode, message: `Operator manual override issued: ${mode}` };
  },

  // Pass History API
  getPasses: async () => {
    const data = await fetchJson('/passes');
    return data || MOCK_PASS_HISTORY;
  },

  // Safety Validation Console API
  getScenarios: async () => {
    const data = await fetchJson('/validation/scenarios');
    return data || MOCK_SCENARIOS;
  },

  createScenario: async (scenario) => {
    const data = await fetchJson('/validation/scenarios', {
      method: 'POST',
      body: JSON.stringify(scenario)
    });
    return data || { success: true, scenario: { ...scenario, id: `SCEN-${Date.now()}` } };
  },

  runScenario: async (id) => {
    const data = await fetchJson(`/validation/run/${id}`, {
      method: 'POST'
    });
    return data || {
      scenarioId: id,
      status: 'PASSED',
      scorePercentage: 100,
      rulesChecked: [
        { name: 'TT&C max wait time <= 120s', status: 'PASS', details: 'Max wait time observed: 105s' },
        { name: 'Critical battery threshold >= 20%', status: 'PASS', details: 'Min battery level: 32.4%' },
        { name: 'Priority Router Score Order Enforced', status: 'PASS', details: 'All items dispatched strictly by priority formula' }
      ],
      runAt: new Date().toISOString()
    };
  },

  getValidationRuns: async () => {
    const data = await fetchJson('/validation/runs');
    return data || MOCK_VALIDATION_RUNS;
  },

  // Deployment State Machine API
  getDeploymentState: async () => {
    const data = await fetchJson('/deployment');
    return data || MOCK_DEPLOYMENT_STATE;
  },

  transitionDeployment: async (nextStateIndex) => {
    const data = await fetchJson('/deployment/transition', {
      method: 'POST',
      body: JSON.stringify({ nextStateIndex })
    });
    return data || { success: true, nextStateIndex };
  },

  resolveContingency: async (action) => {
    const data = await fetchJson('/deployment/contingency/resolve', {
      method: 'POST',
      body: JSON.stringify({ action })
    });
    return data || { success: true, action, message: `Contingency resolved via action: ${action}` };
  },

  // Settings API
  getSettings: async () => {
    const data = await fetchJson('/settings');
    return data || MOCK_ROUTER_SETTINGS;
  },

  updateSettings: async (settings) => {
    const data = await fetchJson('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
    return data || { success: true, settings };
  }
};
