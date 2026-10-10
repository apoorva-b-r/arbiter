/**
 * Telemetry & Pass Simulation Service
 * Generates mock satellite telemetry metrics and enqueues payload items on a 3-second interval
 */

const router = require('./router');
const { isDbConnected } = require('../db');
const Decision = require('../models/Decision');
const Pass = require('../models/Pass');

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
  { id: 'Q-101', itemId: 'Q-101', type: 'TTC', label: 'Critical Telemetry & Beacon', sizeKb: 12, waitTimeSec: 45, baseWeight: 100, priorityScore: 145, status: 'PENDING', isStarved: false },
  { id: 'Q-102', itemId: 'Q-102', type: 'SSTV', label: 'Earth Observation Frame #44', sizeKb: 450, waitTimeSec: 40, baseWeight: 60, priorityScore: 100, status: 'PENDING', isStarved: false },
  { id: 'Q-103', itemId: 'Q-103', type: 'Codec2', label: 'Compressed Voice Beacon Stream', sizeKb: 64, waitTimeSec: 35, baseWeight: 40, priorityScore: 75, status: 'PENDING', isStarved: false },
  { id: 'Q-104', itemId: 'Q-104', type: 'M17', label: 'Digital Voice Packet Batch', sizeKb: 128, waitTimeSec: 30, baseWeight: 30, priorityScore: 60, status: 'PENDING', isStarved: false }
];

let passes = [
  {
    passId: 'PASS-20260817-09',
    date: '2026-08-17',
    startTime: '12:10:00 UTC',
    endTime: 'Active',
    durationSec: 600,
    status: 'ACTIVE',
    peakLinkQuality: 92,
    avgBattery: 85.2,
    decisions: [
      {
        id: 'DEC-809',
        decisionId: 'DEC-809',
        timestamp: '12:15:42',
        createdAt: new Date('2026-08-17T12:15:42Z'),
        selectedType: 'TTC',
        reasoning: 'STARVATION SAFEGUARD: TT&C wait time (135s) exceeded 120s starvation threshold. High priority dispatch forced.',
        isOverridden: false,
        passId: 'PASS-20260817-09',
        score: 345
      },
      {
        id: 'DEC-808',
        decisionId: 'DEC-808',
        timestamp: '12:14:30',
        createdAt: new Date('2026-08-17T12:14:30Z'),
        selectedType: 'SSTV',
        reasoning: 'SSTV selected: High link quality (92%) allows efficient transfer of 450KB frame. Priority score 215 exceeded candidates.',
        isOverridden: false,
        passId: 'PASS-20260817-09',
        score: 215
      },
      {
        id: 'DEC-807',
        decisionId: 'DEC-807',
        timestamp: '12:13:15',
        createdAt: new Date('2026-08-17T12:13:15Z'),
        selectedType: 'M17',
        reasoning: 'M17 selected: Digital voice packet batch dispatched based on queue weight calculation.',
        isOverridden: false,
        passId: 'PASS-20260817-09',
        score: 180
      }
    ]
  },
  {
    passId: 'PASS-20260817-08',
    date: '2026-08-17',
    startTime: '10:32:15 UTC',
    endTime: '10:42:15 UTC',
    durationSec: 600,
    status: 'COMPLETED',
    peakLinkQuality: 95,
    avgBattery: 88.0,
    decisions: [
      {
        id: 'DEC-706',
        decisionId: 'DEC-706',
        timestamp: '10:41:00',
        createdAt: new Date('2026-08-17T10:41:00Z'),
        selectedType: 'TTC',
        reasoning: 'TTC selected: Housekeeping beacon dispatched prior to pass loss of signal. Priority score 310.',
        isOverridden: false,
        passId: 'PASS-20260817-08',
        score: 310
      },
      {
        id: 'DEC-705',
        decisionId: 'DEC-705',
        timestamp: '10:39:10',
        createdAt: new Date('2026-08-17T10:39:10Z'),
        selectedType: 'SSTV',
        reasoning: 'SSTV selected: Image frame payload transmitted at peak SNR 19.5 dB.',
        isOverridden: false,
        passId: 'PASS-20260817-08',
        score: 240
      }
    ]
  }
];

let decisionLog = passes.flatMap(p => p.decisions);
let intervalId = null;
let tickCounter = 0;

function replenishQueue() {
  if (queueItems.length < 8) {
    const templates = [
      { type: 'TTC', label: 'Periodic Housekeeping Beacon', sizeKb: 14, baseWeight: 100 },
      { type: 'SSTV', label: 'High-Res Earth Observation Frame', sizeKb: 480, baseWeight: 60 },
      { type: 'Codec2', label: 'Compressed Digital Voice Stream', sizeKb: 32, baseWeight: 40 },
      { type: 'M17', label: 'Telemetry Packet Batch', sizeKb: 110, baseWeight: 30 }
    ];
    const tmpl = templates[Math.floor(Math.random() * templates.length)];
    const newItemId = `Q-${Math.floor(100 + Math.random() * 900)}`;
    queueItems.push({
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
}

function startSimulator() {
  if (intervalId) return;

  intervalId = setInterval(() => {
    tickCounter++;

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
      // Pass finished! Complete active pass and save to DB
      const activePass = passes.find(p => p.passId === currentTelemetry.currentPassId);
      if (activePass) {
        activePass.status = 'COMPLETED';
        activePass.endTime = new Date().toTimeString().substring(0, 8) + ' UTC';
        activePass.itemsSent = (activePass.decisions || []).length;
        activePass.overrideCount = (activePass.decisions || []).filter(d => d.isOverridden).length;

        // Save completed pass to MongoDB if connected
        if (isDbConnected()) {
          Pass.updateOne(
            { passId: activePass.passId },
            {
              $set: {
                passId: activePass.passId,
                date: activePass.date,
                startTime: activePass.startTime,
                endTime: activePass.endTime,
                durationSec: activePass.durationSec || 600,
                itemsSent: activePass.itemsSent,
                overrideCount: activePass.overrideCount,
                status: 'COMPLETED',
                peakLinkQuality: activePass.peakLinkQuality || 90,
                avgBattery: activePass.avgBattery || 85
              }
            },
            { upsert: true }
          ).catch(err => console.error('[DB ERROR] Failed to save completed pass:', err.message));
        }
      }

      // Start new pass
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const datePart = dateStr.replace(/-/g, '');
      const timePart = now.toTimeString().substring(0, 8).replace(/:/g, '');
      const timeStr = now.toTimeString().substring(0, 8) + ' UTC';
      const newPassId = `PASS-${datePart}-${timePart}`;
      
      const newPass = {
        passId: newPassId,
        date: dateStr,
        startTime: timeStr,
        endTime: 'Active',
        durationSec: 600,
        status: 'ACTIVE',
        peakLinkQuality: currentTelemetry.linkQuality,
        avgBattery: currentTelemetry.battery,
        decisions: []
      };
      passes.unshift(newPass);
      currentTelemetry.currentPassId = newPassId;
      currentTelemetry.passTimeRemainingSec = 600;
    }

    // Append history snapshot
    const now = new Date();
    const timeStr = now.toTimeString().substring(0, 8);
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

    // Remove dispatched item from queue
    const dispatchedIndex = queueItems.findIndex(
      item => (decision.selectedItemId && (item.id === decision.selectedItemId || item.itemId === decision.selectedItemId)) ||
              item.type === decision.selectedType
    );
    if (dispatchedIndex !== -1) {
      queueItems.splice(dispatchedIndex, 1);
    }

    // Periodically replenish queue items (every 3 ticks or if queue falls below 3 items)
    if (tickCounter % 3 === 0 || queueItems.length < 3) {
      replenishQueue();
    }

    const decId = `DEC-${now.getTime().toString().slice(-4)}`;
    const newDec = {
      id: decId,
      decisionId: decId,
      timestamp: timeStr,
      createdAt: now,
      selectedType: decision.selectedType,
      reasoning: decision.reasoning,
      isOverridden: false,
      passId: currentTelemetry.currentPassId,
      score: decision.score || 0
    };

    decisionLog.unshift(newDec);
    const activePass = passes.find(p => p.passId === currentTelemetry.currentPassId);
    if (activePass) {
      if (!activePass.decisions) activePass.decisions = [];
      activePass.decisions.unshift(newDec);
    }

    // Fire-and-forget save auto decision to MongoDB if connected
    if (isDbConnected()) {
      Decision.create({
        decisionId: newDec.decisionId,
        timestamp: newDec.timestamp,
        createdAt: newDec.createdAt,
        selectedType: newDec.selectedType,
        reasoning: newDec.reasoning,
        isOverridden: false,
        passId: newDec.passId,
        score: newDec.score
      }).catch(err => console.error('[DB ERROR] Failed to save auto decision:', err.message));
    }

  }, 3000);
}

function getTelemetry() { return currentTelemetry; }
function getTelemetryHistory() { return telemetryHistory; }
function getQueue() { return queueItems; }
function getDecisions() { return decisionLog; }
function getPasses() { return passes; }

function applyOverride(mode) {
  currentTelemetry.activeMode = mode;

  // Remove item of dispatched mode from queue if present
  const overrideItemIndex = queueItems.findIndex(item => item.type === mode);
  if (overrideItemIndex !== -1) {
    queueItems.splice(overrideItemIndex, 1);
  }

  const now = new Date();
  const timeStr = now.toTimeString().substring(0, 8);
  const decId = `DEC-${now.getTime().toString().slice(-4)}`;
  const newDec = {
    id: decId,
    decisionId: decId,
    timestamp: timeStr,
    createdAt: now,
    selectedType: mode,
    reasoning: `OPERATOR OVERRIDE: Ground station engineer commanded direct transmission of ${mode}. Router automated selection bypassed.`,
    isOverridden: true,
    overriddenType: mode,
    passId: currentTelemetry.currentPassId,
    score: 0
  };
  decisionLog.unshift(newDec);
  const activePass = passes.find(p => p.passId === currentTelemetry.currentPassId);
  if (activePass) {
    if (!activePass.decisions) activePass.decisions = [];
    activePass.decisions.unshift(newDec);
  }

  // Fire-and-forget save override decision to MongoDB if connected
  if (isDbConnected()) {
    Decision.create({
      decisionId: newDec.decisionId,
      timestamp: newDec.timestamp,
      createdAt: newDec.createdAt,
      selectedType: newDec.selectedType,
      reasoning: newDec.reasoning,
      isOverridden: true,
      overriddenType: mode,
      passId: newDec.passId,
      score: 0
    }).catch(err => console.error('[DB ERROR] Failed to save override decision:', err.message));
  }

  return newDec;
}

function deletePass(passId) {
  passes = passes.filter(p => p.passId !== passId);
  decisionLog = decisionLog.filter(d => d.passId !== passId);
}

module.exports = {
  startSimulator,
  getTelemetry,
  getTelemetryHistory,
  getQueue,
  getDecisions,
  getPasses,
  applyOverride,
  deletePass
};
