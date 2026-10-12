import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, request } from '../api/client';
import { useDeploymentState } from '../hooks/useDeploymentState';
import {
  MOCK_TELEMETRY,
  MOCK_TELEMETRY_HISTORY,
  MOCK_QUEUE,
  MOCK_DECISIONS,
  MOCK_PASS_HISTORY,
  MOCK_SCENARIOS,
  MOCK_VALIDATION_RUNS,
  MOCK_ROUTER_SETTINGS
} from '../api/mockData';

// Calculate single queue item score using exact router formula
export const calculatePriorityScore = (item, telemetry, routerSettings) => {
  const baseWeights = routerSettings?.baseWeights || { TTC: 100, SSTV: 60, Codec2: 40, M17: 30 };
  const ttcTimeout = routerSettings?.ttcStarvationTimeoutSec ?? 120;
  const batteryThresholdLow = routerSettings?.batteryThresholdLow ?? 30;

  const baseWeight = baseWeights[item.type] ?? item.baseWeight ?? 30;
  const waitBonus = (item.waitTimeSec || 0) * 1.5;
  const linkBonus = (telemetry?.linkQuality || 80) * 0.8;

  let score = baseWeight + waitBonus + linkBonus;

  // Battery low penalty for heavy payload (SSTV)
  if ((telemetry?.battery || 80) < batteryThresholdLow && item.type === 'SSTV') {
    score -= 150;
  }

  const roundedScore = Math.round(score);

  // Check Starvation Safeguard Constraint: TT&C wait time >= ttcStarvationTimeoutSec
  const isStarved = item.type === 'TTC' && item.waitTimeSec >= ttcTimeout;

  // Starvation forces TT&C to top priority by adding high bonus
  const finalScore = isStarved ? roundedScore + 10000 : roundedScore;

  return {
    ...item,
    baseWeight,
    priorityScore: finalScore,
    isStarved
  };
};

export const computePriorityQueue = (rawQueue, telemetry, routerSettings) => {
  return rawQueue
    .map(item => calculatePriorityScore(item, telemetry, routerSettings))
    .sort((a, b) => b.priorityScore - a.priorityScore);
};

// Date extraction helper for sorting
export const getDecisionDate = (d) => {
  if (d?.createdAt) {
    const parsed = new Date(d.createdAt).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  if (d?.timestamp) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const parsed = new Date(`${todayStr}T${d.timestamp}Z`).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
};

// Sort newest first helper
export const sortNewestFirst = (decisionsList) => {
  const list = Array.isArray(decisionsList) ? decisionsList : [];
  return [...list].sort((a, b) => getDecisionDate(b) - getDecisionDate(a));
};

// De-duplicate by decision ID and sort newest first
export const processDecisions = (decisionsList) => {
  const sorted = sortNewestFirst(decisionsList);
  const seen = new Set();
  return sorted.filter(item => {
    const id = item.id || item.decisionId || item._id;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

function isTokenExpired(token) {
  if (!token || typeof token !== 'string') return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (payload && payload.exp) {
      return Date.now() >= payload.exp * 1000;
    }
    return false;
  } catch {
    return false;
  }
}

const TelemetryContext = createContext(null);

export const TelemetryProvider = ({ children }) => {
  // Auth state - stored in sessionStorage (key: arbiter_user) so closing browser logs out
  const [user, setUser] = useState(() => {
    // Clean up any legacy localStorage session on app start
    try {
      localStorage.removeItem('arbiter_user');
    } catch (_) {}

    try {
      const saved = sessionStorage.getItem('arbiter_user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed && parsed.token && isTokenExpired(parsed.token)) {
        sessionStorage.removeItem('arbiter_user');
        return null;
      }
      return parsed;
    } catch (_) {
      return null;
    }
  });

  // Backend connection status state
  const [backendOnline, setBackendOnline] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Global Mission Data State
  const [telemetry, setTelemetry] = useState(MOCK_TELEMETRY);
  const [telemetryHistory, setTelemetryHistory] = useState(MOCK_TELEMETRY_HISTORY);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('arbiter_router_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return MOCK_ROUTER_SETTINGS;
  });

  const [queue, setQueue] = useState(() => computePriorityQueue(MOCK_QUEUE, MOCK_TELEMETRY, settings));
  const [decisions, setDecisions] = useState(() => processDecisions(MOCK_DECISIONS));
  const [passes, setPasses] = useState(MOCK_PASS_HISTORY);
  const [scenarios, setScenarios] = useState(MOCK_SCENARIOS);
  const [validationRuns, setValidationRuns] = useState(MOCK_VALIDATION_RUNS);
  const [isPolling, setIsPolling] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const queueRef = React.useRef(queue);
  queueRef.current = queue;
  const telemetryRef = React.useRef(telemetry);
  telemetryRef.current = telemetry;
  const historyRef = React.useRef(telemetryHistory);
  historyRef.current = telemetryHistory;
  const settingsRef = React.useRef(settings);
  settingsRef.current = settings;

  // Automatically update queue scoring and sorting whenever settings change
  useEffect(() => {
    setQueue(prevQueue => computePriorityQueue(prevQueue, telemetry, settings));
  }, [settings]);

  // Dedicated Satellite Deployment State Machine Hook
  const deploymentStateHook = useDeploymentState();
  const {
    deployment,
    inspectState,
    clearInspection,
    runLaunchSequenceDemo,
    runTimeoutContingency,
    retryVerification,
    checkSecondaryBeacon,
    escalateContingency,
    manualConfirmSeparation,
    transitionDeploymentState,
    triggerContingency,
    resolveContingencyAction
  } = deploymentStateHook;

  // Real-time telemetry simulation fluctuation for live visual demo fallback
  const simulateLiveTick = () => {
    // 1. Calculate next telemetry state (OUTSIDE updaters)
    const currentTel = telemetryRef.current;
    const linkDelta = Math.floor(Math.random() * 7) - 3;
    const newLink = Math.max(20, Math.min(100, currentTel.linkQuality + linkDelta));
    const batDelta = (currentTel.activeMode === 'SSTV' ? -0.3 : -0.1) + 0.05;
    const newBat = Math.max(15, Math.min(100, Math.round((currentTel.battery + batDelta) * 10) / 10));
    const newSnr = Math.round((newLink / 5) * 10) / 10;

    const nextTelemetry = {
      ...currentTel,
      battery: newBat,
      linkQuality: newLink,
      snr: newSnr
    };

    const now = new Date();
    const nowStr = now.toTimeString().substring(0, 8);

    const updatedHistory = [
      ...historyRef.current.slice(1),
      { time: nowStr, battery: newBat, linkQuality: newLink, snr: newSnr }
    ];

    // 2. Calculate next queue state & decision object (OUTSIDE updaters)
    const currentQueue = queueRef.current;
    const scoredQueue = computePriorityQueue(currentQueue, nextTelemetry, settings);
    let remainingQueue = [...scoredQueue];

    // Remove top dispatched item
    const dispatched = remainingQueue.shift();

    // Increment wait time for remaining items
    remainingQueue = remainingQueue.map(item => ({
      ...item,
      waitTimeSec: item.waitTimeSec + 3
    }));

    // Add new incoming item to keep queue between 3 and 8 items
    if (remainingQueue.length < 3 || (remainingQueue.length < 8 && Math.random() < 0.4)) {
      const templates = [
        { type: 'TTC', label: 'Periodic Housekeeping Beacon', sizeKb: 14, baseWeight: 100 },
        { type: 'SSTV', label: 'High-Res Earth Observation Frame', sizeKb: 480, baseWeight: 60 },
        { type: 'Codec2', label: 'Compressed Digital Voice Stream', sizeKb: 32, baseWeight: 40 },
        { type: 'M17', label: 'Telemetry Packet Batch', sizeKb: 110, baseWeight: 30 }
      ];
      const tmpl = templates[Math.floor(Math.random() * templates.length)];
      const newItemId = `Q-${Math.floor(100 + Math.random() * 900)}`;
      remainingQueue.push({
        id: newItemId,
        itemId: newItemId,
        type: tmpl.type,
        label: tmpl.label,
        sizeKb: tmpl.sizeKb,
        waitTimeSec: 0,
        baseWeight: tmpl.baseWeight,
        priorityScore: tmpl.baseWeight,
        status: 'PENDING',
        isStarved: false
      });
    }

    const finalQueue = computePriorityQueue(remainingQueue, nextTelemetry, settings);

    // Build local decision object
    const dispatchedType = dispatched ? dispatched.type : 'TTC';
    const dispatchedScore = dispatched ? dispatched.priorityScore : 100;
    const decId = `DEC-${now.getTime().toString().slice(-4)}`;
    const localDec = {
      id: decId,
      decisionId: decId,
      timestamp: nowStr,
      createdAt: now.toISOString(),
      selectedType: dispatchedType,
      reasoning: `${dispatchedType} selected: Priority score ${dispatchedScore} dispatched from transmission queue.`,
      isOverridden: false,
      passId: nextTelemetry.currentPassId,
      score: dispatchedScore
    };

    // 3. Dispatch plain state setters with pre-calculated objects
    setTelemetry(nextTelemetry);
    setTelemetryHistory(updatedHistory);
    setQueue(finalQueue);
    setDecisions(prev => processDecisions([localDec, ...prev]).slice(0, 20));
    setLastUpdated(now);
  };

  // Initial load of pass history, scenarios, validation runs, and router settings from backend with fallback
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [fetchedPasses, fetchedScenarios, fetchedRuns, fetchedSettingsData] = await Promise.all([
          api.getPasses(),
          api.getScenarios(),
          api.getValidationRuns(),
          request('/settings').catch((err) => {
            console.warn('[TelemetryContext] Initial settings fetch warning (offline/fallback):', err);
            return null;
          })
        ]);
        if (Array.isArray(fetchedPasses)) setPasses(fetchedPasses);
        if (Array.isArray(fetchedScenarios)) setScenarios(fetchedScenarios);
        if (Array.isArray(fetchedRuns)) setValidationRuns(fetchedRuns);

        if (fetchedSettingsData) {
          const raw = fetchedSettingsData.settings || fetchedSettingsData;
          const rawWeights = raw.baseWeights || raw.weights || {};
          const mappedSettings = {
            ...raw,
            baseWeights: {
              TTC: typeof rawWeights.TTC === 'number' ? rawWeights.TTC : 100,
              SSTV: typeof rawWeights.SSTV === 'number' ? rawWeights.SSTV : 60,
              Codec2: typeof rawWeights.Codec2 === 'number' ? rawWeights.Codec2 : 40,
              M17: typeof rawWeights.M17 === 'number' ? rawWeights.M17 : 30
            },
            ttcStarvationTimeoutSec: typeof raw.ttcStarvationTimeoutSec === 'number'
              ? raw.ttcStarvationTimeoutSec
              : 120,
            batteryThresholdLow: typeof raw.batteryThresholdLow === 'number'
              ? raw.batteryThresholdLow
              : 30
          };
          setSettings(mappedSettings);
          setQueue(prevQueue => computePriorityQueue(prevQueue, telemetryRef.current, mappedSettings));
          try {
            localStorage.setItem('arbiter_router_settings', JSON.stringify(mappedSettings));
          } catch (e) {}
        }
      } catch (err) {
        console.warn('[TelemetryContext] Initial fetch warning:', err);
      } finally {
        setSettingsLoaded(true);
      }
    };
    fetchInitialData();
  }, []);

  // Polling loop (every 3s): try backend live data first, fallback to simulateLiveTick() if backend is offline
  useEffect(() => {
    if (!isPolling) return;

    const pollBackendOrSimulate = async () => {
      try {
        const telData = await api.getTelemetry();
        const activePassId = telData?.currentPassId || telemetryRef.current?.currentPassId;

        const [histData, queueData, decData] = await Promise.all([
          api.getTelemetryHistory(),
          api.getQueue(),
          api.getDecisions(activePassId, 20)
        ]);

        if (telData) {
          setTelemetry(telData);
        }
        if (Array.isArray(histData) && histData.length > 0) {
          setTelemetryHistory(histData);
        }
        if (Array.isArray(queueData)) {
          setQueue(computePriorityQueue(queueData, telData || telemetryRef.current, settingsRef.current));
        }
        if (Array.isArray(decData)) {
          setDecisions(processDecisions(decData));
        }
        setLastUpdated(new Date());
        setBackendOnline(true);
      } catch (err) {
        simulateLiveTick();
        setBackendOnline(false);
      }
    };

    pollBackendOrSimulate();
    const interval = setInterval(pollBackendOrSimulate, 3000);
    return () => clearInterval(interval);
  }, [isPolling, settings]);

  // Auth methods
  const login = async (username, password) => {
    const trimmedUsername = username.trim();

    try {
      const res = await api.login(trimmedUsername, password);
      // Backend returned 200 OK
      const userData = (res && res.user) ? res.user : {
        username: (res && res.username) || trimmedUsername,
        role: (res && res.role) || 'operator',
        token: (res && res.token) || `token-${Date.now()}`
      };

      setUser(userData);
      sessionStorage.setItem('arbiter_user', JSON.stringify(userData));
      return { ok: true };
    } catch (err) {
      // 401: Wrong credentials (username not found or password incorrect)
      if (err && err.status === 401) {
        return { ok: false, error: 'Incorrect Operator ID or passcode' };
      }

      // 503: Database offline
      if (err && err.status === 503) {
        return { ok: false, error: 'Database offline — try again' };
      }

      // 400: Bad request
      if (err && err.status === 400) {
        return { ok: false, error: err.message || 'Operator ID and passcode are required.' };
      }

      // If backend returned other HTTP errors (e.g. 500), return error message without mock fallback
      if (err && err.status && typeof err.status === 'number' && err.status !== 408) {
        return { ok: false, error: err.message || 'Server error. Please try again.' };
      }

      // Backend completely unreachable (network error or timeout): fallback to local credential check
      const validUsername = 'Operator-Alpha';
      const validPassword = 'Arbiter2026!';

      const matches = trimmedUsername === validUsername && password === validPassword;
      if (!matches) {
        return { ok: false, error: 'Incorrect Operator ID or passcode' };
      }

      const userData = {
        username: validUsername,
        role: 'operator',
        token: `token-${Date.now()}`
      };

      setUser(userData);
      sessionStorage.setItem('arbiter_user', JSON.stringify(userData));

      return { ok: true };
    }
  };

  const register = async (username, password) => {
    const trimmedUsername = username.trim();
    const res = await api.register(trimmedUsername, password);

    const userData = (res && res.user) ? res.user : {
      username: (res && res.username) || trimmedUsername,
      role: (res && res.role) || 'operator',
      token: (res && res.token) || `token-${Date.now()}`
    };

    setUser(userData);
    sessionStorage.setItem('arbiter_user', JSON.stringify(userData));
    return { ok: true, user: userData };
  };

  const logout = () => {
    setUser(null);
    try {
      sessionStorage.removeItem('arbiter_user');
      localStorage.removeItem('arbiter_user');
    } catch (_) {}
  };

  const issueOverride = async (mode) => {
    try {
      const res = await api.sendOverride(mode);
      setTelemetry(t => ({ ...t, activeMode: mode }));

      try {
        const [qData, dData] = await Promise.all([
          api.getQueue(),
          api.getDecisions(telemetry.currentPassId, 20)
        ]);
        if (Array.isArray(qData)) {
          setQueue(computePriorityQueue(qData, { ...telemetry, activeMode: mode }, settings));
        }
        if (Array.isArray(dData)) {
          // ONLINE PATH: Do NOT add decision locally. Only set decisions returned from backend fetch!
          setDecisions(processDecisions(dData));
        }
      } catch (refreshErr) {
        const now = new Date();
        const localOverride = (res && res.decision) ? res.decision : {
          id: `DEC-${now.getTime().toString().slice(-4)}`,
          decisionId: `DEC-${now.getTime().toString().slice(-4)}`,
          timestamp: now.toTimeString().substring(0, 8),
          createdAt: now.toISOString(),
          selectedType: mode,
          reasoning: `OPERATOR OVERRIDE: Ground station engineer commanded direct transmission of ${mode}. Router automated selection bypassed.`,
          isOverridden: true,
          overriddenType: mode,
          passId: telemetry.currentPassId,
          score: 0
        };

        setDecisions(prev => processDecisions([localOverride, ...prev]).slice(0, 20));
        setQueue(prevQueue => {
          const rem = prevQueue.filter(item => item.type !== mode);
          return computePriorityQueue(rem, { ...telemetry, activeMode: mode }, settings);
        });
      }
    } catch (err) {
      console.error('Failed to issue override:', err);
      // OFFLINE PATH: Add local override decision immediately
      const now = new Date();
      const localOverride = {
        id: `DEC-${now.getTime().toString().slice(-4)}`,
        decisionId: `DEC-${now.getTime().toString().slice(-4)}`,
        timestamp: now.toTimeString().substring(0, 8),
        createdAt: now.toISOString(),
        selectedType: mode,
        reasoning: `OPERATOR OVERRIDE: Ground station engineer commanded direct transmission of ${mode}. Router automated selection bypassed.`,
        isOverridden: true,
        overriddenType: mode,
        passId: telemetry.currentPassId,
        score: 0
      };

      setDecisions(prev => processDecisions([localOverride, ...prev]).slice(0, 20));
      setQueue(prevQueue => {
        const rem = prevQueue.filter(item => item.type !== mode);
        return computePriorityQueue(rem, { ...telemetry, activeMode: mode }, settings);
      });
    }
  };

  const runScenarioTest = async (scenarioId) => {
    try {
      const res = await api.runScenario(scenarioId);
      return res;
    } catch (err) {
      console.error('Failed to run scenario test:', err);
      return null;
    }
  };

  const addScenario = async (newScenario) => {
    try {
      const res = await api.addScenario(newScenario);
      if (res && res.scenario) {
        setScenarios(prev => [res.scenario, ...prev]);
      }
      return res;
    } catch (err) {
      console.error('Failed to add scenario:', err);
      const fallbackScen = { ...newScenario, id: `SCEN-${Date.now()}` };
      setScenarios(prev => [fallbackScen, ...prev]);
      return { success: true, scenario: fallbackScen };
    }
  };

  const saveRouterSettings = async (newSettings) => {
    setSettings(newSettings);
    setQueue(prevQueue => computePriorityQueue(prevQueue, telemetry, newSettings));
    try {
      localStorage.setItem('arbiter_router_settings', JSON.stringify(newSettings));
    } catch (e) {}
  };

  const createNewPass = async () => {
    try {
      const newPass = await api.createPass();
      if (newPass && newPass.passId) {
        setPasses(prevPasses => {
          const updated = prevPasses.map(p => {
            if (p.status === 'ACTIVE' && p.passId !== newPass.passId) {
              return {
                ...p,
                status: 'INTERRUPTED',
                endTime: p.endTime === 'Active' ? new Date().toLocaleTimeString('en-GB', { hour12: false }) : p.endTime
              };
            }
            return p;
          });
          if (!updated.some(p => p.passId === newPass.passId)) {
            return [newPass, ...updated];
          }
          return updated;
        });

        setTelemetry(prev => ({
          ...prev,
          currentPassId: newPass.passId,
          passStatus: 'ACTIVE',
          passTimeRemainingSec: newPass.durationSec || 600
        }));

        setQueue(prevQueue => {
          const resetQueue = prevQueue.map(item => {
            if (item.type === 'TTC') {
              return { ...item, waitTimeSec: 0, isStarved: false };
            }
            return item;
          });
          return computePriorityQueue(resetQueue, {
            ...telemetryRef.current,
            currentPassId: newPass.passId,
            passStatus: 'ACTIVE'
          }, settingsRef.current);
        });

        try {
          const refreshedPasses = await api.getPasses();
          if (Array.isArray(refreshedPasses) && refreshedPasses.length > 0) {
            setPasses(refreshedPasses);
          }
        } catch (syncErr) {
          // Retain optimistic update
        }

        return { success: true, pass: newPass };
      }
      return { success: false, error: 'Invalid pass response' };
    } catch (err) {
      console.error('Failed to create new pass:', err);
      return { success: false, error: err.message || 'Failed to create new pass' };
    }
  };

  return (
    <TelemetryContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        backendOnline,
        telemetry,
        telemetryHistory,
        queue,
        decisions,
        passes,
        scenarios,
        validationRuns,
        deployment,
        inspectState,
        clearInspection,
        runLaunchSequenceDemo,
        runTimeoutContingency,
        retryVerification,
        checkSecondaryBeacon,
        escalateContingency,
        manualConfirmSeparation,
        startDeploymentSequence: runLaunchSequenceDemo,
        transitionDeploymentState,
        triggerContingency,
        resolveContingencyAction,
        settings,
        settingsLoaded,
        isPolling,
        setIsPolling,
        lastUpdated,
        issueOverride,
        runScenarioTest,
        addScenario,
        saveRouterSettings,
        createNewPass
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
};

export const useTelemetry = () => {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetry must be used within a TelemetryProvider');
  }
  return context;
};
