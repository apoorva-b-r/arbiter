/**
 * Telemetry & Pass Simulation Service
 * Generates mock satellite telemetry metrics and enqueues payload items on a 3-second interval
 */

const router = require('./router');

let currentTelemetry = {
  battery: 84.5,
  linkQuality: 88,
  snr: 18.2,
  activeMode: 'TTC',
  passStatus: 'ACTIVE',
  passTimeRemainingSec: 420,
  currentPassId: 'PASS-20260817-09'
};

let telemetryHistory = [];

let queueItems = [
  { id: 'Q-101', itemId: 'Q-101', type: 'TTC', label: 'Critical Telemetry & Beacon', sizeKb: 12, waitTimeSec: 135, baseWeight: 100, priorityScore: 345, status: 'PENDING', isStarved: true },
  { id: 'Q-102', itemId: 'Q-102', type: 'SSTV', label: 'Earth Observation Frame #44', sizeKb: 450, waitTimeSec: 85, baseWeight: 60, priorityScore: 215, status: 'PENDING', isStarved: false },
  { id: 'Q-103', itemId: 'Q-103', type: 'Codec2', label: 'Compressed Voice Beacon Stream', sizeKb: 64, waitTimeSec: 42, baseWeight: 40, priorityScore: 135, status: 'PENDING', isStarved: false },
  { id: 'Q-104', itemId: 'Q-104', type: 'M17', label: 'Digital Voice Packet Batch', sizeKb: 128, waitTimeSec: 18, baseWeight: 30, priorityScore: 92, status: 'PENDING', isStarved: false }
];

let decisionLog = [
  {
    id: 'DEC-809',
    decisionId: 'DEC-809',
    timestamp: '12:15:42',
    selectedType: 'TTC',
    reasoning: 'SAFETY OVERRIDE: TT&C wait time (135s) exceeded 120s starvation threshold. High priority dispatch forced.',
    isOverridden: false,
    passId: 'PASS-20260817-09',
    score: 345
  }
];

let passes = [
  { passId: 'PASS-20260817-09', date: '2026-08-17', startTime: '12:10:00 UTC', endTime: 'Active', durationSec: 600, itemsSent: 14, overrideCount: 1, status: 'ACTIVE', peakLinkQuality: 92, avgBattery: 85.2 },
  { passId: 'PASS-20260817-08', date: '2026-08-17', startTime: '10:32:15 UTC', endTime: '10:42:15 UTC', durationSec: 600, itemsSent: 22, overrideCount: 0, status: 'COMPLETED', peakLinkQuality: 95, avgBattery: 88.0 }
];

let intervalId = null;

function startSimulator() {
  if (intervalId) return;

  intervalId = setInterval(() => {
    // Fluctuate telemetry metrics
    const linkDelta = Math.floor(Math.random() * 7) - 3;
    const newLink = Math.max(20, Math.min(100, currentTelemetry.linkQuality + linkDelta));
    
    const batDelta = (currentTelemetry.activeMode === 'SSTV' ? -0.3 : -0.1) + 0.05;
    const newBat = Math.max(15, Math.min(100, Math.round((currentTelemetry.battery + batDelta) * 10) / 10));

    currentTelemetry.linkQuality = newLink;
    currentTelemetry.battery = newBat;
    currentTelemetry.snr = Math.round((newLink / 5) * 10) / 10;
    
    if (currentTelemetry.passTimeRemainingSec > 0) {
      currentTelemetry.passTimeRemainingSec -= 3;
    } else {
      currentTelemetry.passTimeRemainingSec = 600;
    }

    // Append history snapshot
    const timeStr = new Date().toTimeString().substring(0, 8);
    telemetryHistory.push({
      time: timeStr,
      battery: newBat,
      linkQuality: newLink,
      snr: currentTelemetry.snr
    });
    if (telemetryHistory.length > 30) telemetryHistory.shift();

    // Tick queue wait times
    queueItems = queueItems.map(item => {
      const wait = item.waitTimeSec + 3;
      const isStarved = item.type === 'TTC' && wait >= router.getSettings().ttcStarvationTimeoutSec;
      const score = router.calculateScore({ ...item, waitTimeSec: wait }, currentTelemetry);
      return {
        ...item,
        waitTimeSec: wait,
        priorityScore: score,
        isStarved
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);

    // Make AI decision
    const decision = router.makeDecision(queueItems, currentTelemetry);
    currentTelemetry.activeMode = decision.selectedType;

  }, 3000);
}

function getTelemetry() { return currentTelemetry; }
function getTelemetryHistory() { return telemetryHistory; }
function getQueue() { return queueItems; }
function getDecisions() { return decisionLog; }
function getPasses() { return passes; }

function applyOverride(mode) {
  currentTelemetry.activeMode = mode;
  const newDec = {
    id: `DEC-${Date.now().toString().slice(-4)}`,
    decisionId: `DEC-${Date.now().toString().slice(-4)}`,
    timestamp: new Date().toTimeString().substring(0, 8),
    selectedType: mode,
    reasoning: `OPERATOR OVERRIDE: Ground station engineer commanded direct transmission of ${mode}. Router automated selection bypassed.`,
    isOverridden: true,
    overriddenType: mode,
    passId: currentTelemetry.currentPassId,
    score: 0
  };
  decisionLog.unshift(newDec);
  return newDec;
}

module.exports = {
  startSimulator,
  getTelemetry,
  getTelemetryHistory,
  getQueue,
  getDecisions,
  getPasses,
  applyOverride
};
