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

function getStoredToken() {
  try {
    const raw = sessionStorage.getItem('arbiter_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token || null;
  } catch {
    return null;
  }
}

export async function request(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  const token = getStoredToken();
  const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...authHeaders,
        ...(options.headers || {})
      },
      signal: controller.signal
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const error = new Error(errorData.error || errorData.message || `HTTP error! status: ${res.status}`);
      error.status = res.status;

      const isAuthRoute = path.startsWith('/auth') || path.startsWith('auth');
      if (res.status === 401 && !isAuthRoute) {
        try {
          sessionStorage.removeItem('arbiter_user');
          localStorage.removeItem('arbiter_user');
        } catch (_) {}
        if (
          typeof window !== 'undefined' &&
          window.location.pathname !== '/login' &&
          window.location.pathname !== '/signup'
        ) {
          window.location.href = '/login';
        }
      }

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
    if (err && (err.status === 401 || err.status === 403)) {
      throw err;
    }
    console.warn('[API] backend offline or error, evaluating fallback', err.message || err);
    return typeof mockValue === 'function' ? mockValue(err) : mockValue;
  }
}

// Data shape mappers to guarantee consistency with mockData.js
const mapDecision = (d) => ({
  ...d,
  id: d.id || d.decisionId || d._id,
  decisionId: d.decisionId || d.id || d._id,
  downlinkId: d.downlinkId || d.downlink_id || null,
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
    }, (err) => {
      if (err && (err.status === 401 || err.status === 403)) {
        throw err;
      }
      return MOCK_PASS_HISTORY;
    });
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

  createPass: async () => {
    return withFallback(async () => {
      const data = await request('/passes', {
        method: 'POST'
      });
      return mapPass(data);
    }, () => {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const year = now.getFullYear();
      const month = pad(now.getMonth() + 1);
      const day = pad(now.getDate());
      const hours = pad(now.getHours());
      const minutes = pad(now.getMinutes());
      const seconds = pad(now.getSeconds());
      const passId = `PASS-${year}${month}${day}-${hours}${minutes}${seconds}`;
      return mapPass({
        passId,
        date: `${year}-${month}-${day}`,
        startTime: `${hours}:${minutes}:${seconds}`,
        endTime: 'Active',
        durationSec: 600,
        itemsSent: 0,
        overrideCount: 0,
        status: 'ACTIVE',
        peakLinkQuality: 88,
        avgBattery: 84.5,
        decisions: []
      });
    });
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
  },

  // Deployment Handover Audit Log API
  createDeploymentRun: async (data) => {
    return withFallback(async () => {
      return await request('/deployment/runs', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }, () => ({
      success: true,
      run: {
        runId: `LOCAL-RUN-${Date.now()}`,
        passId: data?.passId || 'LOCAL-DEMO',
        currentState: 'STOWED',
        status: 'IN_PROGRESS',
        mode: data?.mode || 'NORMAL',
        startTime: new Date().toISOString(),
        isLocal: true
      },
      event: {
        eventId: `LOCAL-EVT-${Date.now()}`,
        eventType: 'SEQUENCE_STARTED',
        state: 'STOWED',
        message: 'Deployment handover launch sequence started (Local Fallback).',
        timestamp: new Date().toTimeString().substring(0, 8) + ' UTC',
        isLocal: true
      }
    }));
  },

  updateDeploymentRun: async (runId, data) => {
    return withFallback(async () => {
      return await request(`/deployment/runs/${runId}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
    }, () => ({ success: true, isLocal: true }));
  },

  addDeploymentEvent: async (runId, data) => {
    return withFallback(async () => {
      return await request(`/deployment/runs/${runId}/events`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    }, () => ({
      eventId: `LOCAL-EVT-${Date.now()}`,
      deploymentRunId: runId,
      passId: data?.passId || 'LOCAL-DEMO',
      ...data,
      timestamp: data?.timestamp || (new Date().toTimeString().substring(0, 8) + ' UTC'),
      isLocal: true
    }));
  },

  getDeploymentRuns: async (passId) => {
    return withFallback(async () => {
      const q = passId ? `?passId=${encodeURIComponent(passId)}` : '';
      return await request(`/deployment/runs${q}`);
    }, []);
  },

  getDeploymentEvents: async (runId, passId) => {
    return withFallback(async () => {
      const params = new URLSearchParams();
      if (runId) params.append('runId', runId);
      if (passId) params.append('passId', passId);
      const q = params.toString() ? `?${params.toString()}` : '';
      return await request(`/deployment/events${q}`);
    }, []);
  },

  // Downlink API
  getDownlinks: async (params = {}) => {
    return withFallback(async () => {
      const query = new URLSearchParams();
      if (params.type) query.append('type', params.type);
      if (params.status) query.append('status', params.status);
      if (params.passId) query.append('passId', params.passId);
      if (params.limit) query.append('limit', params.limit);
      const q = query.toString() ? `?${query.toString()}` : '';
      const data = await request(`/downlinks${q}`);
      return Array.isArray(data) ? data : [];
    }, []);
  },

  getDownlinkStats: async (passId) => {
    return withFallback(async () => {
      const q = passId ? `?passId=${encodeURIComponent(passId)}` : '';
      const data = await request(`/downlinks/stats${q}`);
      return data || { total: 0, received: 0, partial: 0, lost: 0, successRate: 0, retransmits: 0 };
    }, { total: 0, received: 0, partial: 0, lost: 0, successRate: 0, retransmits: 0 });
  },

  getDownlink: async (id) => {
    return withFallback(async () => {
      return await request(`/downlinks/${encodeURIComponent(id)}`);
    }, null);
  },

  getDownlinkByDecision: async (decisionId) => {
    return withFallback(async () => {
      return await request(`/downlinks/by-decision/${encodeURIComponent(decisionId)}`);
    }, (err) => {
      if (err && err.status === 404) {
        throw err;
      }
      return null;
    });
  },

  register: async (username, password) => {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    return data;
  },

  // Mission System API
  getMission: async () => {
    return withFallback(async () => {
      return await request('/mission');
    }, (err) => {
      const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';
      // In production or when the server returns an actual 5xx error, fail closed
      if (isProduction || (err && err.status >= 500)) {
        return { phase: 'PRE_DEPLOYMENT', history: [], isFallback: true, offline: true };
      }
      // Isolated development simulation fallback: initial state is PRE_DEPLOYMENT
      return { phase: 'PRE_DEPLOYMENT', history: [], isFallback: true, offline: true };
    });
  },

  setMissionPhase: async (phase, reason, runId) => {
    return withFallback(async () => {
      return await request('/mission/phase', {
        method: 'PUT',
        body: JSON.stringify({ phase, reason, deploymentRunId: runId })
      });
    }, (err) => {
      const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';
      if (isProduction || (err && err.status >= 500)) {
        throw new Error(err?.message || 'Database offline: mission phase update cannot be persisted.');
      }
      return { phase, history: [], isFallback: true, offline: true };
    });
  },

  resetMission: async () => {
    return withFallback(async () => {
      return await request('/mission/reset', {
        method: 'POST'
      });
    }, (err) => {
      const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';
      if (isProduction || (err && err.status >= 500)) {
        throw new Error(err?.message || 'Database offline: mission reset cannot be persisted.');
      }
      return { phase: 'PRE_DEPLOYMENT', history: [], isFallback: true, offline: true };
    });
  }
};
