import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export const DEPLOYMENT_STATES = [
  {
    id: 'STOWED',
    step: 1,
    label: '1. Stowed',
    title: 'Stowed',
    description: 'PocketQube contained in launch deployer pod. Awaiting launch vehicle deployment signal.',
    timeoutSec: 15
  },
  {
    id: 'RELEASE_TRIGGERED',
    step: 2,
    label: '2. Release Triggered',
    title: 'Release Triggered',
    description: 'Pod deployment signal fired from launch vehicle. Spring mechanism activated. Satellite physically leaving pod.',
    timeoutSec: 15
  },
  {
    id: 'SEPARATION_CONFIRMED',
    step: 3,
    label: '3. Separation Confirmed',
    title: 'Separation Confirmed',
    description: 'Separation switch triggered and primary RF beacon received by ground control.',
    timeoutSec: 15
  },
  {
    id: 'INITIALIZATION',
    step: 4,
    label: '4. Initialization',
    title: 'Initialization',
    description: '30-minute silence period active. Onboard computer booting. Solar panels and antenna deployment in progress.',
    timeoutSec: 15
  },
  {
    id: 'COMMISSIONING',
    step: 5,
    label: '5. Commissioning',
    title: 'Commissioning',
    description: 'Subsystem checkout underway: EPS, ADCS, TT&C, AI router. Radio beacon live on 437.500 MHz.',
    timeoutSec: 15
  },
  {
    id: 'OPERATIONAL',
    step: 6,
    label: '6. Operational',
    title: 'Operational',
    description: 'All systems nominal. Mission operations engaged. Handover to ground station complete.',
    timeoutSec: 15
  }
];

export const DEPLOYMENT_TIMINGS = {
  stowedToRelease: 3000,
  releaseToSeparation: 5000,
  separationToInit: 5000,
  initToCommission: 5000,
  commissionToOperational: 5000
};

export const SEPARATION_TIMEOUT = 15;

export const VALID_TRANSITIONS = {
  STOWED: ['RELEASE_TRIGGERED'],
  RELEASE_TRIGGERED: ['SEPARATION_CONFIRMED'],
  SEPARATION_CONFIRMED: ['INITIALIZATION'],
  INITIALIZATION: ['COMMISSIONING'],
  COMMISSIONING: ['OPERATIONAL'],
  OPERATIONAL: []
};

export const useDeploymentState = ({ activePassId, onPhaseChange } = {}) => {
  const [actualStateIndex, setActualStateIndex] = useState(0);
  const [inspectedStateIndex, setInspectedStateIndex] = useState(null);
  
  // Contingency state
  const [contingencyActive, setContingencyActive] = useState(false);
  const [contingencyStatus, setContingencyStatus] = useState('NORMAL'); // 'NORMAL' | 'WAITING_CONFIRMATION' | 'CONTINGENCY' | 'RESOLVED' | 'ESCALATED'
  const [contingencyMessage, setContingencyMessage] = useState('');
  
  // Timer & Retry state
  const [timeElapsedSec, setTimeElapsedSec] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [secondaryBeaconChecked, setSecondaryBeaconChecked] = useState(false);
  const [secondaryBeaconData, setSecondaryBeaconData] = useState(null);

  // Persistence state
  const [runs, setRuns] = useState([]);
  const [currentRun, setCurrentRun] = useState(null);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // History log timeline
  const [historyLogs, setHistoryLogs] = useState([
    {
      eventId: 'INIT-EVT',
      timestamp: new Date().toTimeString().substring(0, 8) + ' UTC',
      event: 'System ready. Awaiting launch vehicle deployment command.',
      state: 'STOWED',
      type: 'info',
      persisted: false
    }
  ]);

  const timersRef = useRef([]);
  const intervalRef = useRef(null);
  const stateStartTimeRef = useRef(null);
  const isContingencySimRef = useRef(false);
  const actualStateIndexRef = useRef(0);
  const currentRunIdRef = useRef(null);
  const activePassIdRef = useRef(activePassId);
  const onPhaseChangeRef = useRef(onPhaseChange);

  useEffect(() => {
    onPhaseChangeRef.current = onPhaseChange;
  }, [onPhaseChange]);

  // Keep activePassIdRef up-to-date
  useEffect(() => {
    activePassIdRef.current = activePassId;
  }, [activePassId]);

  // Single authoritative path for mission phase updates (eliminates duplicate PUT calls)
  const notifyPhaseChange = useCallback((phase, reason) => {
    if (onPhaseChangeRef.current) {
      onPhaseChangeRef.current(phase, reason, currentRunIdRef.current);
    } else {
      api.setMissionPhase(phase, reason, currentRunIdRef.current).catch(() => {});
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    stateStartTimeRef.current = null;
    isContingencySimRef.current = false;
  }, []);

  // Per-step elapsed timer: resets to 0s upon every state transition
  const startElapsedTicker = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    stateStartTimeRef.current = Date.now();
    setTimeElapsedSec(0);

    intervalRef.current = setInterval(() => {
      if (stateStartTimeRef.current) {
        const elapsed = Math.floor((Date.now() - stateStartTimeRef.current) / 1000);
        setTimeElapsedSec(elapsed);

        if (isContingencySimRef.current && elapsed >= SEPARATION_TIMEOUT) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          isContingencySimRef.current = false;
          setContingencyActive(true);
          setContingencyStatus('CONTINGENCY');
          const msg = 'Separation confirmation timeout. Contingency protocol activated.';
          setContingencyMessage(msg);
          appendLog(
            msg,
            'RELEASE_TRIGGERED',
            'warning',
            { timeoutSec: SEPARATION_TIMEOUT },
            'CONTINGENCY_ACTIVATED'
          );
        }
      }
    }, 1000);
  }, []);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  // Load persistent history on mount or when activePassId changes
  useEffect(() => {
    let isMounted = true;
    const loadHistory = async () => {
      setIsHistoryLoading(true);
      try {
        const passId = activePassIdRef.current;
        const [fetchedEvents, fetchedRuns] = await Promise.all([
          api.getDeploymentEvents(null, passId),
          api.getDeploymentRuns(passId)
        ]);

        if (!isMounted) return;

        if (Array.isArray(fetchedRuns) && fetchedRuns.length > 0) {
          setRuns(fetchedRuns);
        }

        if (Array.isArray(fetchedEvents) && fetchedEvents.length > 0) {
          const mapped = fetchedEvents.map(e => ({
            eventId: e.eventId,
            runId: e.deploymentRunId,
            passId: e.passId,
            timestamp: e.timestamp,
            event: e.message,
            state: e.state,
            type: e.logType || 'info',
            metadata: e.metadata || {},
            persisted: true
          }));
          setHistoryLogs(mapped);
        }
      } catch (err) {
        console.warn('[useDeploymentState] Failed to fetch persistent history:', err);
      } finally {
        if (isMounted) setIsHistoryLoading(false);
      }
    };

    loadHistory();
    return () => { isMounted = false; };
  }, [activePassId]);

  // Append log and persist event to backend asynchronously
  const appendLog = useCallback((eventText, stateId, type = 'info', metadata = {}, eventType = 'STATE_TRANSITION', sourceState = null) => {
    const nowStr = new Date().toTimeString().substring(0, 8) + ' UTC';
    const localId = `LOCAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const passId = activePassIdRef.current || 'UNASSIGNED';
    const runId = currentRunIdRef.current || 'LOCAL-RUN';

    const newLogItem = {
      eventId: localId,
      runId,
      passId,
      timestamp: nowStr,
      event: eventText,
      state: stateId,
      type,
      metadata,
      persisted: Boolean(currentRunIdRef.current && !currentRunIdRef.current.startsWith('LOCAL-'))
    };

    setHistoryLogs(prev => [newLogItem, ...prev]);

    // Send to backend if a valid run exists
    if (currentRunIdRef.current && !currentRunIdRef.current.startsWith('LOCAL-')) {
      api.addDeploymentEvent(currentRunIdRef.current, {
        eventType,
        sourceState,
        destinationState: stateId,
        state: stateId,
        message: eventText,
        logType: type,
        metadata,
        timestamp: nowStr
      }).catch(err => {
        console.warn('[useDeploymentState] Failed to persist deployment event:', err.message);
      });
    }
  }, []);

  // Validate state transition and reset per-step timer synchronously
  const transitionToState = useCallback((targetIndex, eventText, logType = 'info', eventType = 'STATE_TRANSITION') => {
    const currentIdx = actualStateIndexRef.current;
    const currentState = DEPLOYMENT_STATES[currentIdx];
    const targetState = DEPLOYMENT_STATES[targetIndex];

    if (!currentState || !targetState) return;

    const allowedTargets = VALID_TRANSITIONS[currentState.id] || [];
    if (!allowedTargets.includes(targetState.id) && currentIdx !== targetIndex) {
      console.warn(`Invalid transition attempted: ${currentState.id} -> ${targetState.id}`);
      return;
    }

    actualStateIndexRef.current = targetIndex;
    setActualStateIndex(targetIndex);

    if (eventText) {
      appendLog(eventText, targetState.id, logType, { from: currentState.id, to: targetState.id }, eventType, currentState.id);
    }

    // Update authoritative mission phase based on deployment progression (single path)
    if (targetIndex === 1) {
      // Release Triggered -> PRE_DEPLOYMENT
      notifyPhaseChange('PRE_DEPLOYMENT', 'Launch vehicle pod release triggered');
    } else if (targetIndex >= 2 && targetIndex <= 4) {
      // Separation Confirmed / Initialization / Commissioning -> COMMISSIONING
      notifyPhaseChange('COMMISSIONING', `Deployment stage reached: ${targetState.label}`);
    } else if (targetIndex === 5) {
      // Operational -> OPERATIONAL
      notifyPhaseChange('OPERATIONAL', 'Satellite deployment and commissioning complete. System operational.');
    }

    // Reset per-step timer for the newly entered stage
    if (targetIndex === 5) {
      // Step 6: OPERATIONAL reached -> Completed
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      stateStartTimeRef.current = Date.now();
      setTimeElapsedSec(0);

      if (currentRunIdRef.current && !currentRunIdRef.current.startsWith('LOCAL-')) {
        api.updateDeploymentRun(currentRunIdRef.current, {
          currentState: 'OPERATIONAL',
          status: 'COMPLETED'
        }).catch(() => {});
      }
    } else {
      startElapsedTicker();
    }
  }, [appendLog, startElapsedTicker]);

  // Inspection actions (NEVER alters actual state)
  const inspectState = useCallback((index) => {
    setInspectedStateIndex(prev => (prev === index ? null : index));
  }, []);

  const clearInspection = useCallback(() => {
    setInspectedStateIndex(null);
  }, []);

  // Continue remaining sequence starting from SEPARATION_CONFIRMED (index 2)
  const resumeRemainingSequenceFromSeparation = useCallback(() => {
    const t1 = setTimeout(() => {
      transitionToState(3, 'Onboard computer booted. Subsystem initialization started.', 'info', 'INITIALIZATION_STARTED');
      
      const t2 = setTimeout(() => {
        transitionToState(4, 'Initialization complete. Subsystem commissioning engaged.', 'info', 'COMMISSIONING_STARTED');
        
        const t3 = setTimeout(() => {
          transitionToState(5, 'Satellite reached Operational state. Handover complete.', 'success', 'OPERATIONAL_HANDOVER');
        }, DEPLOYMENT_TIMINGS.commissionToOperational);
        timersRef.current.push(t3);

      }, DEPLOYMENT_TIMINGS.initToCommission);
      timersRef.current.push(t2);

    }, DEPLOYMENT_TIMINGS.separationToInit);
    timersRef.current.push(t1);
  }, [transitionToState]);

  // DEMO 1: Run Launch Sequence Demo (Normal path)
  const runLaunchSequenceDemo = useCallback(async () => {
    clearAllTimers();
    setInspectedStateIndex(null);
    setActualStateIndex(0);
    actualStateIndexRef.current = 0;
    setContingencyActive(false);
    setContingencyStatus('NORMAL');
    setContingencyMessage('');
    setTimeElapsedSec(0);
    setRetryCount(0);
    setSecondaryBeaconChecked(false);
    setSecondaryBeaconData(null);

    // Create a new persistent deployment run
    const passId = activePassIdRef.current || 'UNASSIGNED';
    let runData = null;
    try {
      const res = await api.createDeploymentRun({ passId, mode: 'NORMAL' });
      if (res && res.run) {
        runData = res.run;
        currentRunIdRef.current = res.run.runId;
        setCurrentRun(res.run);
        setRuns(prev => [res.run, ...prev.filter(r => r.runId !== res.run.runId)]);
      }
    } catch (e) {
      console.warn('[useDeploymentState] Failed to create persistent run:', e);
      currentRunIdRef.current = `LOCAL-RUN-${Date.now()}`;
    }

    appendLog('Deployment sequence started.', 'STOWED', 'info', { passId }, 'SEQUENCE_STARTED');
    startElapsedTicker();

    // 1. STOWED -> RELEASE_TRIGGERED
    const t1 = setTimeout(() => {
      transitionToState(1, 'Transitioned to Release Triggered.', 'info', 'STATE_TRANSITION');

      // 2. RELEASE_TRIGGERED -> SEPARATION_CONFIRMED
      const t2 = setTimeout(() => {
        transitionToState(2, 'Separation confirmation received.', 'success', 'SEPARATION_CONFIRMED');

        // 3 -> 4 -> 5
        resumeRemainingSequenceFromSeparation();

      }, DEPLOYMENT_TIMINGS.releaseToSeparation);
      timersRef.current.push(t2);

    }, DEPLOYMENT_TIMINGS.stowedToRelease);
    timersRef.current.push(t1);
  }, [clearAllTimers, appendLog, transitionToState, resumeRemainingSequenceFromSeparation, startElapsedTicker]);

  // DEMO 2: Simulate Timeout Contingency (Failure path)
  const runTimeoutContingency = useCallback(async () => {
    clearAllTimers();
    setInspectedStateIndex(null);
    setActualStateIndex(0);
    actualStateIndexRef.current = 0;
    setContingencyActive(false);
    setContingencyStatus('NORMAL');
    setContingencyMessage('');
    setTimeElapsedSec(0);
    setRetryCount(0);
    setSecondaryBeaconChecked(false);
    setSecondaryBeaconData(null);

    // Create a new persistent deployment run with CONTINGENCY_SIMULATION mode
    const passId = activePassIdRef.current || 'UNASSIGNED';
    try {
      const res = await api.createDeploymentRun({ passId, mode: 'CONTINGENCY_SIMULATION' });
      if (res && res.run) {
        currentRunIdRef.current = res.run.runId;
        setCurrentRun(res.run);
        setRuns(prev => [res.run, ...prev.filter(r => r.runId !== res.run.runId)]);
      }
    } catch (e) {
      console.warn('[useDeploymentState] Failed to create persistent contingency run:', e);
      currentRunIdRef.current = `LOCAL-RUN-${Date.now()}`;
    }

    appendLog('Deployment contingency simulation started.', 'STOWED', 'info', { passId }, 'SEQUENCE_STARTED');
    startElapsedTicker();

    // STOWED -> RELEASE_TRIGGERED after 2s
    const t1 = setTimeout(() => {
      isContingencySimRef.current = true;
      transitionToState(1, 'Transitioned to Release Triggered.', 'info', 'STATE_TRANSITION');
      
      setContingencyStatus('WAITING_CONFIRMATION');
      appendLog('Waiting for separation confirmation.', 'RELEASE_TRIGGERED', 'info', { timeoutSec: SEPARATION_TIMEOUT }, 'STATE_ENTRY');
    }, 2000);
    timersRef.current.push(t1);
  }, [clearAllTimers, appendLog, transitionToState, startElapsedTicker]);

  // Contingency Action 1: Retry Verification
  const retryVerification = useCallback(() => {
    setRetryCount(prev => {
      const nextAttempt = prev + 1;
      
      if (nextAttempt === 1) {
        appendLog('Verification retry #1 initiated: separation confirmation unavailable.', 'RELEASE_TRIGGERED', 'warning', { attempt: 1 }, 'CONTINGENCY_RETRY');
        const msg = 'Verification retry #1 failed: separation confirmation unavailable.';
        setContingencyMessage(msg);
      } else {
        clearAllTimers();
        appendLog('Verification retry #2 initiated and succeeded: separation confirmed.', 'SEPARATION_CONFIRMED', 'success', { attempt: 2 }, 'CONTINGENCY_RETRY');
        setContingencyActive(false);
        setContingencyStatus('RESOLVED');
        setContingencyMessage('');
        
        transitionToState(2, 'Separation confirmation received.', 'success', 'CONTINGENCY_RESOLVED');
        resumeRemainingSequenceFromSeparation();
      }
      return nextAttempt;
    });
  }, [appendLog, clearAllTimers, transitionToState, resumeRemainingSequenceFromSeparation]);

  // Contingency Action 2: Check Secondary Beacon
  const checkSecondaryBeacon = useCallback(() => {
    setSecondaryBeaconChecked(true);
    const beaconMeta = {
      beacon: 'DETECTED (-84 dBm)',
      rfCarrier: 'PRESENT',
      battery: 'HEALTHY (84.5%)',
      note: 'Secondary evidence detected. Formal separation switch unconfirmed.'
    };
    setSecondaryBeaconData(beaconMeta);
    appendLog('Secondary beacon check initiated: RF carrier detected (-84 dBm), battery healthy.', 'RELEASE_TRIGGERED', 'info', beaconMeta, 'SECONDARY_BEACON_CHECK');
  }, [appendLog]);

  // Contingency Action 3: Escalate to Mission Director
  const escalateContingency = useCallback(() => {
    clearAllTimers();
    setContingencyStatus('ESCALATED');
    const msg = 'Deployment confirmation unavailable: contingency escalated to Mission Director.';
    setContingencyMessage(msg);
    appendLog(msg, 'RELEASE_TRIGGERED', 'critical', { action: 'ESCALATE' }, 'CONTINGENCY_ESCALATED');

    notifyPhaseChange('CONTACT_LOST', msg);
  }, [clearAllTimers, appendLog, notifyPhaseChange]);

  // Reset deployment state machine back to Stowed
  const resetDeploymentStateMachine = useCallback(() => {
    clearAllTimers();
    actualStateIndexRef.current = 0;
    setActualStateIndex(0);
    setInspectedStateIndex(null);
    setContingencyActive(false);
    setContingencyStatus('NORMAL');
    setContingencyMessage('');
    setTimeElapsedSec(0);
    setRetryCount(0);
    setSecondaryBeaconChecked(false);
    setSecondaryBeaconData(null);
    currentRunIdRef.current = null;
    setCurrentRun(null);
    appendLog('Deployment state machine reset to Stowed.', 'STOWED', 'info', {}, 'STATE_RESET');
  }, [clearAllTimers, appendLog]);

  // Contingency Action 4: Manually Confirm Separation
  const manualConfirmSeparation = useCallback(() => {
    clearAllTimers();
    setContingencyActive(false);
    setContingencyStatus('RESOLVED');
    setContingencyMessage('');
    appendLog('Operator manually confirmed separation based on available evidence.', 'SEPARATION_CONFIRMED', 'success', { action: 'MANUAL_OVERRIDE' }, 'MANUAL_SEPARATION_CONFIRMED');
    
    transitionToState(2, 'Separation confirmation received.', 'success', 'CONTINGENCY_RESOLVED');
    resumeRemainingSequenceFromSeparation();
  }, [clearAllTimers, appendLog, transitionToState, resumeRemainingSequenceFromSeparation]);

  // Backwards compatible manual state transition
  const transitionDeploymentState = useCallback((targetIndex) => {
    transitionToState(targetIndex, `Operator set state to: ${DEPLOYMENT_STATES[targetIndex]?.label}`, 'info', 'STATE_TRANSITION');
  }, [transitionToState]);

  // Active step's configured timeout duration (per-step timeout)
  const currentTimeoutDurationSec = DEPLOYMENT_STATES[actualStateIndex]?.timeoutSec || SEPARATION_TIMEOUT;

  return {
    deployment: {
      currentStateIndex: actualStateIndex,
      inspectedStateIndex,
      states: DEPLOYMENT_STATES,
      contingencyActive,
      contingencyStatus,
      contingencyMessage,
      timeoutDurationSec: currentTimeoutDurationSec,
      timeElapsedSec,
      retryCount,
      secondaryBeaconChecked,
      secondaryBeaconData,
      historyLogs,
      runs,
      currentRun,
      selectedRunId,
      isHistoryLoading,
      activePassId: activePassIdRef.current || 'UNASSIGNED'
    },
    actualStateIndex,
    inspectedStateIndex,
    inspectState,
    clearInspection,
    runLaunchSequenceDemo,
    runTimeoutContingency,
    retryVerification,
    checkSecondaryBeacon,
    escalateContingency,
    manualConfirmSeparation,
    resetDeploymentStateMachine,
    transitionDeploymentState,
    setSelectedRunId,
    triggerContingency: (reason) => {
      clearAllTimers();
      setContingencyActive(true);
      setContingencyStatus('CONTINGENCY');
      setContingencyMessage(reason || 'Separation confirmation timeout. Contingency protocol activated.');
      appendLog(reason || 'Separation confirmation timeout. Contingency protocol activated.', DEPLOYMENT_STATES[actualStateIndex]?.id, 'warning', {}, 'CONTINGENCY_ACTIVATED');
    },
    resolveContingencyAction: (action) => {
      if (action === 'RETRY') retryVerification();
      else if (action === 'CHECK_SECONDARY') checkSecondaryBeacon();
      else if (action === 'ESCALATE') escalateContingency();
      else if (action === 'FORCE_CONFIRM') manualConfirmSeparation();
    }
  };
};
