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

  // Check Safety Override Constraint: TT&C wait time >= ttcStarvationTimeoutSec
  const isStarved = item.type === 'TTC' && item.waitTimeSec >= ttcTimeout;

  // Starvation forces TT&C to top priority by adding high override score bonus
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

const TelemetryContext = createContext(null);

export const TelemetryProvider = ({ children }) => {
  // Auth state
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('arbiter_user');
    return saved ? JSON.parse(saved) : null;
  });

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
  const [decisions, setDecisions] = useState(MOCK_DECISIONS);
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

  // Real-time telemetry simulation fluctuation for live visual demo
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
      const tickedQueue = prevQueue.map(item => ({
        ...item,
        waitTimeSec: item.waitTimeSec + 3
      }));
      return computePriorityQueue(tickedQueue, nextTelemetry, settings);
    });

    setLastUpdated(new Date());
  };

  useEffect(() => {
    if (!isPolling) return;
    const interval = setInterval(simulateLiveTick, 3000);
    return () => clearInterval(interval);
  }, [isPolling, settings]);

  // Auth methods
  const login = (username, password) => {
    const validUsername = 'Operator-Alpha';
    const validPassword = 'arbiter2026';

    if (
      username.trim() !== validUsername ||
      password !== validPassword
    ) {
      return false;
    }

    const userData = {
      username: validUsername,
      token: `token-${Date.now()}`
    };

    setUser(userData);
    localStorage.setItem('arbiter_user', JSON.stringify(userData));

    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('arbiter_user');
  };

  const issueOverride = async (mode) => {
    try {
      await api.sendOverride(mode);
      
      setTelemetry(t => ({ ...t, activeMode: mode }));

      const newDecision = {
        id: `DEC-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toTimeString().substring(0, 8),
        selectedType: mode,
        reasoning: `OPERATOR OVERRIDE: Ground station engineer commanded direct transmission of ${mode}. Router automated selection bypassed.`,
        isOverridden: true,
        overriddenType: mode,
        passId: telemetry.currentPassId,
        score: 0
      };

      setDecisions(prev => [newDecision, ...prev]);
      
      setPasses(prev =>
        prev.map(p =>
          p.passId === telemetry.currentPassId
            ? { ...p, decisions: [newDecision, ...(p.decisions || [])] }
            : p
        )
      );
    } catch (err) {
      console.error('Failed to issue override:', err);
    }
  };

  const runScenarioTest = async (scenarioId) => {
    const res = await api.runScenario(scenarioId);
    return res;
  };

  const addScenario = async (newScenario) => {
    const res = await api.createScenario(newScenario);
    if (res && res.scenario) {
      setScenarios(prev => [res.scenario, ...prev]);
    }
    return res;
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
