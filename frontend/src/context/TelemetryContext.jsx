import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
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

const TelemetryContext = createContext(null);

export const TelemetryProvider = ({ children }) => {
  // Auth state
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('arbiter_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Backend connection status state
  const [backendOnline, setBackendOnline] = useState(false);

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
    let nextTelemetry = telemetry;
    setTelemetry(prev => {
      const linkDelta = Math.floor(Math.random() * 7) - 3;
      const newLink = Math.max(20, Math.min(100, prev.linkQuality + linkDelta));
      
      const batDelta = (prev.activeMode === 'SSTV' ? -0.3 : -0.1) + 0.05;
      const newBat = Math.max(15, Math.min(100, Math.round((prev.battery + batDelta) * 10) / 10));

      const newSnr = Math.round((newLink / 5) * 10) / 10;

      const nowStr = new Date().toTimeString().substring(0, 8);
      setTelemetryHistory(h => [
        ...h.slice(1),
        { time: nowStr, battery: newBat, linkQuality: newLink, snr: newSnr }
      ]);

      nextTelemetry = {
        ...prev,
        battery: newBat,
        linkQuality: newLink,
        snr: newSnr
      };
      return nextTelemetry;
    });

    setQueue(prevQueue => {
      const scoredQueue = computePriorityQueue(prevQueue, nextTelemetry, settings);
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

      // Add local fallback decision in SIMULATION MODE
      const now = new Date();
      const dispatchedType = dispatched ? dispatched.type : 'TTC';
      const dispatchedScore = dispatched ? dispatched.priorityScore : 100;
      const localDec = {
        id: `DEC-${now.getTime().toString().slice(-4)}`,
        decisionId: `DEC-${now.getTime().toString().slice(-4)}`,
        timestamp: now.toTimeString().substring(0, 8),
        createdAt: now.toISOString(),
        selectedType: dispatchedType,
        reasoning: `${dispatchedType} selected: Priority score ${dispatchedScore} dispatched from transmission queue.`,
        isOverridden: false,
        passId: nextTelemetry.currentPassId,
        score: dispatchedScore
      };

      setDecisions(prev => processDecisions([localDec, ...prev]).slice(0, 20));

      return computePriorityQueue(remainingQueue, nextTelemetry, settings);
    });

    setLastUpdated(new Date());
  };

  // Initial load of pass history, scenarios, and validation runs from backend with fallback
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [fetchedPasses, fetchedScenarios, fetchedRuns] = await Promise.all([
          api.getPasses(),
          api.getScenarios(),
          api.getValidationRuns()
        ]);
        if (Array.isArray(fetchedPasses)) setPasses(fetchedPasses);
        if (Array.isArray(fetchedScenarios)) setScenarios(fetchedScenarios);
        if (Array.isArray(fetchedRuns)) setValidationRuns(fetchedRuns);
      } catch (err) {
        console.warn('[TelemetryContext] Initial fetch warning:', err);
      }
    };
    fetchInitialData();
  }, []);

  // Polling loop (every 3s): try backend live data first, fallback to simulateLiveTick() if backend is offline
  useEffect(() => {
    if (!isPolling) return;

    const pollBackendOrSimulate = async () => {
      try {
        const [telData, histData, queueData, decData] = await Promise.all([
          api.getTelemetry(),
          api.getTelemetryHistory(),
          api.getQueue(),
          api.getDecisions(telemetry.currentPassId, 20)
        ]);

        if (telData) {
          setTelemetry(telData);
        }
        if (Array.isArray(histData) && histData.length > 0) {
          setTelemetryHistory(histData);
        }
        if (Array.isArray(queueData)) {
          setQueue(computePriorityQueue(queueData, telData || telemetry, settings));
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
        token: (res && res.token) || `token-${Date.now()}`
      };

      setUser(userData);
      localStorage.setItem('arbiter_user', JSON.stringify(userData));
      return { ok: true, usernameOk: true, passwordOk: true };
    } catch (err) {
      // 401 Unauthorized -> invalid credentials error
      if (err && err.status === 401) {
        return { ok: false, usernameOk: true, passwordOk: false };
      }

      // 404 Route Not Found or Network error -> fallback to local credential check
      const validUsername = 'Operator-Alpha';
      const validPassword = 'Arbiter2026!';

      const usernameOk = trimmedUsername === validUsername;
      const passwordOk = password === validPassword;

      if (!usernameOk || !passwordOk) {
        return { ok: false, usernameOk, passwordOk };
      }

      const userData = {
        username: validUsername,
        token: `token-${Date.now()}`
      };

      setUser(userData);
      localStorage.setItem('arbiter_user', JSON.stringify(userData));

      return { ok: true, usernameOk: true, passwordOk: true };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('arbiter_user');
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

  return (
    <TelemetryContext.Provider
      value={{
        user,
        login,
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
        isPolling,
        setIsPolling,
        lastUpdated,
        issueOverride,
        runScenarioTest,
        addScenario,
        saveRouterSettings
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
