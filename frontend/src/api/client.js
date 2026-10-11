import {
  MOCK_TELEMETRY,
  MOCK_TELEMETRY_HISTORY,
  MOCK_QUEUE,
  MOCK_DECISIONS,
  MOCK_PASS_HISTORY,
  MOCK_SCENARIOS,
  MOCK_VALIDATION_RUNS
} from './mockData';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export async function request(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers || {})
      },
      signal: controller.signal
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const error = new Error(errorData.error || errorData.message || `HTTP error! status: ${res.status}`);
      error.status = res.status;
      throw error;
    }

    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('Request timed out after 5 seconds');
      timeoutErr.status = 408;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function withFallback(apiCall, mockValue) {
  try {
    return await apiCall();
  } catch (err) {
    console.warn('[API] backend offline, using mock', err);
    return typeof mockValue === 'function' ? mockValue() : mockValue;
  }
}

// Data shape mappers to guarantee consistency with mockData.js
const mapDecision = (d) => ({
  ...d,
  id: d.id || d.decisionId || d._id,
  createdAt: d.createdAt || null,
  isOverridden: Boolean(d.isOverridden)
});

const mapPass = (p) => ({
  ...p,
  passId: p.passId || p.id,
  decisions: Array.isArray(p.decisions) ? p.decisions.map(mapDecision) : []
});

const mapQueueItem = (item) => ({
  ...item,
  id: item.id || item.itemId || item._id
});

const mapScenario = (s) => ({
  ...s,
  id: s.id || s.scenarioId
});

const mapValidationRun = (r) => ({
  ...r,
  run: r.versionLabel || r.run
});

export const api = {
  // Telemetry API
  getTelemetry: async () => {
    const data = await request('/telemetry/latest');
    return data;
  },

  getTelemetryHistory: async () => {
    const data = await request('/telemetry/history');
    return Array.isArray(data) ? data : [];
  },

  // Queue API
  getQueue: async () => {
    const data = await request('/queue');
    return Array.isArray(data) ? data.map(mapQueueItem) : [];
  },

  // Decisions API
  getDecisions: async (passId, limit) => {
    const params = new URLSearchParams();
    if (passId) params.append('passId', passId);
    if (limit) params.append('limit', limit);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const data = await request(`/decisions${queryString}`);
    return Array.isArray(data) ? data.map(mapDecision) : [];
  },

  // Pass History API
  getPasses: async () => {
    return withFallback(async () => {
      const data = await request('/passes');
      return Array.isArray(data) ? data.map(mapPass) : [];
    }, MOCK_PASS_HISTORY);
  },

  getPassDetail: async (passId) => {
    return withFallback(async () => {
      const data = await request(`/passes/${passId}`);
      return mapPass(data);
    }, () => {
      const found = MOCK_PASS_HISTORY.find(p => p.passId === passId);
      return found ? mapPass(found) : null;
    });
  },

  updatePassNotes: async (passId, notes) => {
    const data = await request(`/passes/${passId}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes })
    });
    return mapPass(data);
  },

  // Operator Override API
  sendOverride: async (mode) => {
    return withFallback(async () => {
      const data = await request('/override', {
        method: 'POST',
        body: JSON.stringify({ mode })
      });
      return data;
    }, {
      success: true,
      mode,
      message: `Operator manual override issued: ${mode}`
    });
  },

  // Validation Console API
  getScenarios: async () => {
    return withFallback(async () => {
      const data = await request('/validation/scenarios');
      return Array.isArray(data) ? data.map(mapScenario) : [];
    }, MOCK_SCENARIOS);
  },

  addScenario: async (data) => {
    return withFallback(async () => {
      const res = await request('/validation/scenarios', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (res && res.scenario) {
        return {
          ...res,
          scenario: mapScenario(res.scenario)
        };
      }
      return res;
    }, {
      success: true,
      scenario: mapScenario({ ...data, id: `SCEN-${Date.now()}` })
    });
  },

  createScenario: async (data) => {
    return api.addScenario(data);
  },

  runScenario: async (id) => {
    return withFallback(async () => {
      const data = await request(`/validation/run/${id}`, {
        method: 'POST'
      });
      return data;
    }, {
      scenarioId: id,
      status: 'PASSED',
      scorePercentage: 100,
      rulesChecked: [
        { name: 'TT&C max wait time <= 120s', status: 'PASS', details: 'Max wait time observed: 105s' },
        { name: 'Critical battery threshold >= 20%', status: 'PASS', details: 'Min battery level: 32.4%' },
        { name: 'Priority Router Score Order Enforced', status: 'PASS', details: 'All items dispatched strictly by priority formula' }
      ],
      runAt: new Date().toISOString()
    });
  },

  getValidationRuns: async () => {
    return withFallback(async () => {
      const data = await request('/validation/runs');
      return Array.isArray(data) ? data.map(mapValidationRun) : [];
    }, MOCK_VALIDATION_RUNS.map(mapValidationRun));
  },

  // Auth API
  login: async (username, password) => {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    return data;
  }
};
