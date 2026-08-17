import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
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
} from '../api/mockData';

const TelemetryContext = createContext(null);

export const TelemetryProvider = ({ children }) => {
  // Auth state
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('arbiter_user');
    return saved ? JSON.parse(saved) : { username: 'Operator-Alpha', token: 'mock-jwt-token-12345' };
  });

  // Global Mission Data State
  const [telemetry, setTelemetry] = useState(MOCK_TELEMETRY);
  const [telemetryHistory, setTelemetryHistory] = useState(MOCK_TELEMETRY_HISTORY);
  const [queue, setQueue] = useState(MOCK_QUEUE);
  const [decisions, setDecisions] = useState(MOCK_DECISIONS);
  const [passes, setPasses] = useState(MOCK_PASS_HISTORY);
  const [scenarios, setScenarios] = useState(MOCK_SCENARIOS);
  const [validationRuns, setValidationRuns] = useState(MOCK_VALIDATION_RUNS);
  const [deployment, setDeployment] = useState(MOCK_DEPLOYMENT_STATE);
  const [settings, setSettings] = useState(MOCK_ROUTER_SETTINGS);
  const [isPolling, setIsPolling] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Real-time telemetry simulation fluctuation for live visual demo
  const simulateLiveTick = () => {
    setTelemetry(prev => {
      // Dynamic link quality fluctuation (simulating atmospheric noise & orbital pass)
      const linkDelta = Math.floor(Math.random() * 7) - 3;
      const newLink = Math.max(20, Math.min(100, prev.linkQuality + linkDelta));
      
      // Battery fluctuation (drains when transmitting, recharges slightly)
      const batDelta = (prev.activeMode === 'SSTV' ? -0.3 : -0.1) + 0.05;
      const newBat = Math.max(15, Math.min(100, Math.round((prev.battery + batDelta) * 10) / 10));

      const newSnr = Math.round((newLink / 5) * 10) / 10;

      // Append point to history
      const nowStr = new Date().toTimeString().substring(0, 8);
      setTelemetryHistory(h => {
        const updated = [...h.slice(1), { time: nowStr, battery: newBat, linkQuality: newLink, snr: newSnr }];
        return updated;
      });

      return {
        ...prev,
        battery: newBat,
        linkQuality: newLink,
        snr: newSnr
      };
    });

    // Tick queue wait times
    setQueue(q =>
      q.map(item => {
        const newWait = item.waitTimeSec + 3;
        const isStarved = item.type === 'TTC' && newWait > 120;
        const newScore = item.baseWeight + Math.round(newWait * 1.5) + (isStarved ? 200 : 0);
        return {
          ...item,
          waitTimeSec: newWait,
          priorityScore: newScore,
          isStarved
        };
      }).sort((a, b) => b.priorityScore - a.priorityScore)
    );

    setLastUpdated(new Date());
  };

  // Poll server or run tick interval
  useEffect(() => {
    if (!isPolling) return;

    const fetchAll = async () => {
      try {
        const tData = await api.getTelemetry();
        if (tData) setTelemetry(tData);

        const thData = await api.getTelemetryHistory();
        if (thData) setTelemetryHistory(thData);

        const qData = await api.getQueue();
        if (qData) setQueue(qData);

        const dData = await api.getDecisions();
        if (dData) setDecisions(dData);

        const pData = await api.getPasses();
        if (pData) setPasses(pData);

        const dState = await api.getDeploymentState();
        if (dState) setDeployment(dState);
      } catch (err) {
        console.error('Polling error:', err);
      }
      simulateLiveTick();
    };

    const interval = setInterval(fetchAll, 3000);
    return () => clearInterval(interval);
  }, [isPolling]);

  // Auth methods
  const login = (username, password) => {
    const userData = { username, token: `token-${Date.now()}` };
    setUser(userData);
    localStorage.setItem('arbiter_user', JSON.stringify(userData));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('arbiter_user');
  };

  // Operator action: Manual override next transmission
  const issueOverride = async (mode) => {
    try {
      await api.sendOverride(mode);
      
      // Update local state immediately
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
      
      // Increment pass override count
      setPasses(prev =>
        prev.map(p =>
          p.passId === telemetry.currentPassId
            ? { ...p, overrideCount: p.overrideCount + 1 }
            : p
        )
      );
    } catch (err) {
      console.error('Failed to issue override:', err);
    }
  };

  // Validation module actions
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

  // Deployment state machine actions
  const transitionDeploymentState = async (nextIndex) => {
    await api.transitionDeployment(nextIndex);
    setDeployment(prev => ({
      ...prev,
      currentStateIndex: nextIndex,
      contingencyActive: false,
      contingencyMessage: '',
      historyLogs: [
        ...prev.historyLogs,
        {
          timestamp: new Date().toTimeString().substring(0, 8) + ' UTC',
          event: `OPERATOR TRANSITIONED STATE TO: ${prev.states[nextIndex]?.label}`,
          state: prev.states[nextIndex]?.id
        }
      ]
    }));
  };

  const triggerContingency = (reason) => {
    setDeployment(prev => ({
      ...prev,
      contingencyActive: true,
      contingencyMessage: reason || 'DEPLOYMENT SIGNAL ACKNOWLEDGEMENT TIMEOUT EXCEEDED (60s).',
      historyLogs: [
        ...prev.historyLogs,
        {
          timestamp: new Date().toTimeString().substring(0, 8) + ' UTC',
          event: `CONTINGENCY TRIGGERED: ${reason || 'SIGNAL TIMEOUT'}`,
          state: prev.states[prev.currentStateIndex]?.id
        }
      ]
    }));
  };

  const resolveContingencyAction = async (action) => {
    await api.resolveContingency(action);
    setDeployment(prev => {
      let nextIdx = prev.currentStateIndex;
      if (action === 'FORCE_CONFIRM') nextIdx = Math.min(prev.states.length - 1, prev.currentStateIndex + 1);

      return {
        ...prev,
        currentStateIndex: nextIdx,
        contingencyActive: false,
        contingencyMessage: '',
        historyLogs: [
          ...prev.historyLogs,
          {
            timestamp: new Date().toTimeString().substring(0, 8) + ' UTC',
            event: `CONTINGENCY RESOLVED VIA: ${action}`,
            state: prev.states[nextIdx]?.id
          }
        ]
      };
    });
  };

  // Settings update
  const saveRouterSettings = async (newSettings) => {
    await api.updateSettings(newSettings);
    setSettings(newSettings);
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
        settings,
        isPolling,
        setIsPolling,
        lastUpdated,
        issueOverride,
        runScenarioTest,
        addScenario,
        transitionDeploymentState,
        triggerContingency,
        resolveContingencyAction,
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
