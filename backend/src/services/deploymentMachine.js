/**
 * Deployment Handover State Machine Service
 * Manages transition stages from launch vehicle release to operational orbit
 */

let deploymentData = {
  currentStateIndex: 3, // Initialization
  states: [
    { id: 'STOWED', label: '1. Stowed', description: 'PocketQube contained in launch deployer pod.' },
    { id: 'RELEASE_TRIGGERED', label: '2. Release Triggered', description: 'Pod deployment signal fired from launch vehicle.' },
    { id: 'SEPARATION_CONFIRMED', label: '3. Separation Confirmed', description: 'Deployer door microswitch opened. Satellite ejected.' },
    { id: 'INITIALIZATION', label: '4. Initialization', description: '30-minute timer active. Solar panel & antenna deployment.' },
    { id: 'COMMISSIONING', label: '5. Commissioning', description: 'Subsystem checkout: EPS, ADCS, TT&C, Radio beacon live.' },
    { id: 'OPERATIONAL', label: '6. Operational', description: 'Nominal mission orbit operations engaged.' }
  ],
  contingencyActive: false,
  contingencyMessage: '',
  timeoutDurationSec: 60,
  timeElapsedSec: 42,
  historyLogs: [
    { timestamp: '12:00:05 UTC', event: 'POD DEPLOYER SIGNAL DETECTED', state: 'RELEASE_TRIGGERED' },
    { timestamp: '12:00:12 UTC', event: 'MECHANICAL SEPARATION SWITCH CONFIRMED', state: 'SEPARATION_CONFIRMED' },
    { timestamp: '12:00:30 UTC', event: 'SATELLITE BUS POWER ON - INITIATING 30-MIN SILENCE', state: 'INITIALIZATION' }
  ]
};

function getState() {
  return deploymentData;
}

function transitionState(nextIndex) {
  if (nextIndex < 0 || nextIndex >= deploymentData.states.length) return deploymentData;

  deploymentData.currentStateIndex = nextIndex;
  deploymentData.contingencyActive = false;
  deploymentData.contingencyMessage = '';
  
  const nowStr = new Date().toTimeString().substring(0, 8) + ' UTC';
  deploymentData.historyLogs.push({
    timestamp: nowStr,
    event: `TRANSITION TO STATE: ${deploymentData.states[nextIndex].label}`,
    state: deploymentData.states[nextIndex].id
  });

  return deploymentData;
}

function triggerContingency(reason) {
  deploymentData.contingencyActive = true;
  deploymentData.contingencyMessage = reason || 'CONFIRMATION TIMEOUT EXCEEDED (60s)';

  const nowStr = new Date().toTimeString().substring(0, 8) + ' UTC';
  deploymentData.historyLogs.push({
    timestamp: nowStr,
    event: `CONTINGENCY TRIGGERED: ${reason || 'SIGNAL TIMEOUT'}`,
    state: deploymentData.states[deploymentData.currentStateIndex].id
  });

  return deploymentData;
}

function resolveContingency(action) {
  let nextIdx = deploymentData.currentStateIndex;
  if (action === 'FORCE_CONFIRM') {
    nextIdx = Math.min(deploymentData.states.length - 1, deploymentData.currentStateIndex + 1);
  }

  deploymentData.currentStateIndex = nextIdx;
  deploymentData.contingencyActive = false;
  deploymentData.contingencyMessage = '';

  const nowStr = new Date().toTimeString().substring(0, 8) + ' UTC';
  deploymentData.historyLogs.push({
    timestamp: nowStr,
    event: `CONTINGENCY RESOLVED VIA: ${action}`,
    state: deploymentData.states[nextIdx].id
  });

  return deploymentData;
}

module.exports = {
  getState,
  transitionState,
  triggerContingency,
  resolveContingency
};
