import { useState, useRef, useEffect, useCallback } from 'react';

export const DEPLOYMENT_STATES = [
  {
    id: 'STOWED',
    step: 1,
    label: '1. Stowed',
    title: 'Stowed',
    description: 'PocketQube contained in launch deployer pod. Awaiting launch vehicle deployment signal.'
  },
  {
    id: 'RELEASE_TRIGGERED',
    step: 2,
    label: '2. Release Triggered',
    title: 'Release Triggered',
    description: 'Pod deployment signal fired from launch vehicle. Spring mechanism activated. Satellite physically leaving pod.'
  },
  {
    id: 'SEPARATION_CONFIRMED',
    step: 3,
    label: '3. Separation Confirmed',
    title: 'Separation Confirmed',
    description: 'Separation switch triggered and primary RF beacon received by ground control.'
  },
  {
    id: 'INITIALIZATION',
    step: 4,
    label: '4. Initialization',
    title: 'Initialization',
    description: '30-minute silence period active. Onboard computer booting. Solar panels and antenna deployment in progress.'
  },
  {
    id: 'COMMISSIONING',
    step: 5,
    label: '5. Commissioning',
    title: 'Commissioning',
    description: 'Subsystem checkout underway: EPS, ADCS, TT&C, AI router. Radio beacon live on 437.500 MHz.'
  },
  {
    id: 'OPERATIONAL',
    step: 6,
    label: '6. Operational',
    title: 'Operational',
    description: 'All systems nominal. Mission operations engaged. Handover to ground station complete.'
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

export const useDeploymentState = () => {
  const [actualStateIndex, setActualStateIndex] = useState(0);
  const [inspectedStateIndex, setInspectedStateIndex] = useState(null);
  
  // Contingency state
  const [contingencyActive, setContingencyActive] = useState(false);
  const [contingencyStatus, setContingencyStatus] = useState('NORMAL'); // 'NORMAL' | 'WAITING_CONFIRMATION' | 'CONTINGENCY' | 'RESOLVED' | 'ESCALATED'
  const [contingencyMessage, setContingencyMessage] = useState('');
  
  // Timer & Retry state
  const [timeElapsedSec, setTimeElapsedSec] = useState(0);
  const [timeoutDurationSec] = useState(SEPARATION_TIMEOUT);
  const [retryCount, setRetryCount] = useState(0);
  const [secondaryBeaconChecked, setSecondaryBeaconChecked] = useState(false);
  const [secondaryBeaconData, setSecondaryBeaconData] = useState(null);

  // History log timeline
  const [historyLogs, setHistoryLogs] = useState([
    {
      timestamp: new Date().toTimeString().substring(0, 8) + ' UTC',
      event: 'System ready. Awaiting launch vehicle deployment command.',
      state: 'STOWED',
      type: 'info'
    }
  ]);

  const timersRef = useRef([]);
  const intervalRef = useRef(null);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const appendLog = useCallback((event, stateId, type = 'info') => {
    setHistoryLogs(prev => [
      ...prev,
      {
        timestamp: new Date().toTimeString().substring(0, 8) + ' UTC',
        event,
        state: stateId,
        type
      }
    ]);
  }, []);

  // Validate state transition using single source of truth matrix
  const transitionToState = useCallback((targetIndex, eventText, logType = 'info') => {
    setActualStateIndex(currentIdx => {
      const currentState = DEPLOYMENT_STATES[currentIdx];
      const targetState = DEPLOYMENT_STATES[targetIndex];

      if (!currentState || !targetState) return currentIdx;

      const allowedTargets = VALID_TRANSITIONS[currentState.id] || [];
      if (!allowedTargets.includes(targetState.id) && currentIdx !== targetIndex) {
        console.warn(`Invalid transition attempted: ${currentState.id} -> ${targetState.id}`);
        return currentIdx;
      }

      if (eventText) {
        appendLog(eventText, targetState.id, logType);
      }

      return targetIndex;
    });
  }, [appendLog]);

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
      transitionToState(3, 'Onboard computer booted. Subsystem initialization started.', 'info');
      
      const t2 = setTimeout(() => {
        transitionToState(4, 'Initialization complete. Subsystem commissioning engaged.', 'info');
        
        const t3 = setTimeout(() => {
          transitionToState(5, 'Satellite reached Operational state.', 'success');
        }, DEPLOYMENT_TIMINGS.commissionToOperational);
        timersRef.current.push(t3);

      }, DEPLOYMENT_TIMINGS.initToCommission);
      timersRef.current.push(t2);

    }, DEPLOYMENT_TIMINGS.separationToInit);
    timersRef.current.push(t1);
  }, [transitionToState]);

  // DEMO 1: Run Launch Sequence Demo (Normal path)
  const runLaunchSequenceDemo = useCallback(() => {
    clearAllTimers();
    setInspectedStateIndex(null);
    setActualStateIndex(0);
    setContingencyActive(false);
    setContingencyStatus('NORMAL');
    setContingencyMessage('');
    setTimeElapsedSec(0);
    setRetryCount(0);
    setSecondaryBeaconChecked(false);
    setSecondaryBeaconData(null);

    appendLog('Deployment sequence started.', 'STOWED', 'info');

    // 1. STOWED -> RELEASE_TRIGGERED
    const t1 = setTimeout(() => {
      transitionToState(1, 'Transitioned to Release Triggered.', 'info');

      // 2. RELEASE_TRIGGERED -> SEPARATION_CONFIRMED
      const t2 = setTimeout(() => {
        transitionToState(2, 'Separation confirmation received.', 'success');

        // 3 -> 4 -> 5
        resumeRemainingSequenceFromSeparation();

      }, DEPLOYMENT_TIMINGS.releaseToSeparation);
      timersRef.current.push(t2);

    }, DEPLOYMENT_TIMINGS.stowedToRelease);
    timersRef.current.push(t1);
  }, [clearAllTimers, appendLog, transitionToState, resumeRemainingSequenceFromSeparation]);

  // DEMO 3: Simulate Timeout Contingency (Failure path - 100% Frontend simulation)
  const runTimeoutContingency = useCallback(() => {
    clearAllTimers();
    setInspectedStateIndex(null);
    setActualStateIndex(0);
    setContingencyActive(false);
    setContingencyStatus('NORMAL');
    setContingencyMessage('');
    setTimeElapsedSec(0);
    setRetryCount(0);
    setSecondaryBeaconChecked(false);
    setSecondaryBeaconData(null);

    appendLog('Deployment sequence started.', 'STOWED', 'info');

    // STOWED -> RELEASE_TRIGGERED
    const t1 = setTimeout(() => {
      transitionToState(1, 'Transitioned to Release Triggered.', 'info');
      
      setContingencyStatus('WAITING_CONFIRMATION');
      appendLog('Waiting for separation confirmation.', 'RELEASE_TRIGGERED', 'info');
      setTimeElapsedSec(0);

      // Start 1-second interval timer for frontend simulation
      intervalRef.current = setInterval(() => {
        setTimeElapsedSec(prev => {
          const nextTime = prev + 1;
          if (nextTime >= SEPARATION_TIMEOUT) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            // Halt sequence & activate local contingency protocol
            setContingencyActive(true);
            setContingencyStatus('CONTINGENCY');
            const msg = 'Separation confirmation timeout. Contingency protocol activated.';
            setContingencyMessage(msg);
            appendLog(msg, 'RELEASE_TRIGGERED', 'warning');
          }
          return nextTime;
        });
      }, 1000);

    }, 2000);
    timersRef.current.push(t1);
  }, [clearAllTimers, appendLog, transitionToState]);

  // Contingency Action 1: Retry Verification (Explicit simulated confirmation response)
  const retryVerification = useCallback(() => {
    setRetryCount(prev => {
      const nextAttempt = prev + 1;
      
      if (nextAttempt === 1) {
        // Attempt 1 fails (Simulated confirmation unavailable)
        appendLog('Verification retry #1 initiated.', 'RELEASE_TRIGGERED', 'info');
        const msg = 'Verification retry #1 failed: separation confirmation unavailable.';
        setContingencyMessage(msg);
        appendLog(msg, 'RELEASE_TRIGGERED', 'warning');
      } else {
        // Attempt 2+ succeeds (Simulated confirmation received)
        clearAllTimers();
        appendLog('Verification retry #2 initiated.', 'RELEASE_TRIGGERED', 'info');
        appendLog('Verification retry #2 succeeded: separation confirmed.', 'SEPARATION_CONFIRMED', 'success');
        setContingencyActive(false);
        setContingencyStatus('RESOLVED');
        setContingencyMessage('');
        
        transitionToState(2, 'Separation confirmation received.', 'success');
        appendLog('Normal deployment sequence resumed.', 'SEPARATION_CONFIRMED', 'info');
        resumeRemainingSequenceFromSeparation();
      }
      return nextAttempt;
    });
  }, [appendLog, clearAllTimers, transitionToState, resumeRemainingSequenceFromSeparation]);

  // Contingency Action 2: Check Secondary Beacon
  const checkSecondaryBeacon = useCallback(() => {
    setSecondaryBeaconChecked(true);
    setSecondaryBeaconData({
      beacon: 'DETECTED (-84 dBm)',
      rfCarrier: 'PRESENT',
      battery: 'HEALTHY (84.5%)',
      note: 'Secondary evidence detected. Formal separation confirmation switch is still unconfirmed.'
    });
    appendLog('Secondary beacon check initiated.', 'RELEASE_TRIGGERED', 'info');
    appendLog('Secondary beacon detected, RF carrier present, EPS telemetry healthy.', 'RELEASE_TRIGGERED', 'info');
  }, [appendLog]);

  // Contingency Action 3: Escalate to Mission Director (Terminal until operator intervention)
  const escalateContingency = useCallback(() => {
    clearAllTimers();
    setContingencyStatus('ESCALATED');
    const msg = 'Deployment confirmation unavailable: contingency escalated to Mission Director.';
    setContingencyMessage(msg);
    appendLog(msg, 'RELEASE_TRIGGERED', 'warning');
  }, [clearAllTimers, appendLog]);

  // Contingency Action 4: Manually Confirm Separation (Operator override)
  const manualConfirmSeparation = useCallback(() => {
    clearAllTimers();
    setContingencyActive(false);
    setContingencyStatus('RESOLVED');
    setContingencyMessage('');
    appendLog('Operator manually confirmed separation based on available evidence.', 'SEPARATION_CONFIRMED', 'success');
    
    transitionToState(2, 'Separation confirmation received.', 'success');
    appendLog('Normal deployment sequence resumed.', 'SEPARATION_CONFIRMED', 'info');
    resumeRemainingSequenceFromSeparation();
  }, [clearAllTimers, appendLog, transitionToState, resumeRemainingSequenceFromSeparation]);

  // Backwards compatible manual state transition (for direct clicks if valid)
  const transitionDeploymentState = useCallback((targetIndex) => {
    transitionToState(targetIndex, `Operator set state to: ${DEPLOYMENT_STATES[targetIndex]?.label}`, 'info');
  }, [transitionToState]);

  return {
    // Current deployment state object matching existing UI expectations
    deployment: {
      currentStateIndex: actualStateIndex,
      inspectedStateIndex,
      states: DEPLOYMENT_STATES,
      contingencyActive,
      contingencyStatus,
      contingencyMessage,
      timeoutDurationSec,
      timeElapsedSec,
      retryCount,
      secondaryBeaconChecked,
      secondaryBeaconData,
      historyLogs
    },
    // State machine actions
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
    transitionDeploymentState,
    triggerContingency: (reason) => {
      clearAllTimers();
      setContingencyActive(true);
      setContingencyStatus('CONTINGENCY');
      setContingencyMessage(reason || 'Separation confirmation timeout. Contingency protocol activated.');
      appendLog(reason || 'Separation confirmation timeout. Contingency protocol activated.', DEPLOYMENT_STATES[actualStateIndex]?.id, 'warning');
    },
    resolveContingencyAction: (action) => {
      if (action === 'RETRY') retryVerification();
      else if (action === 'CHECK_SECONDARY') checkSecondaryBeacon();
      else if (action === 'ESCALATE') escalateContingency();
      else if (action === 'FORCE_CONFIRM') manualConfirmSeparation();
    }
  };
};
