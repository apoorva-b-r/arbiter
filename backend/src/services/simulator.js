/**
 * Telemetry & Pass Simulation Service
 * Generates mock satellite telemetry metrics and enqueues payload items on a 3-second interval
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const router = require('./router');
const mission = require('./mission');
const { isDbConnected } = require('../db');
const Decision = require('../models/Decision');
const Pass = require('../models/Pass');
const Downlink = require('../models/Downlink');

if (!Decision.schema.path('downlinkId')) {
  Decision.schema.add({ downlinkId: { type: String } });
}

// Load downlink manifest at startup if available
const manifestPath = path.resolve(__dirname, '../../../frontend/public/downlink/manifest.json');
let manifestData = null;
try {
  if (fs.existsSync(manifestPath)) {
    manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }
} catch (err) {
  console.warn('[DOWNLINK] Could not load manifest.json:', err.message);
}

const FALLBACK_SSTV = [
  { key: 'sstv-01', caption: 'Earth limb over the Indian Ocean' },
  { key: 'sstv-02', caption: 'Cyclone formation over the Bay of Bengal' },
  { key: 'sstv-03', caption: 'Himalayan range optical pass from orbit' },
  { key: 'sstv-04', caption: 'Western Ghats coastal cloud cover' }
];

const FALLBACK_VOICE = [
  { key: 'voice-01', transcript: 'SomaiyaSat, telemetry nominal.', type: 'Codec2' },
  { key: 'voice-02', transcript: 'SomaiyaSat beacon acknowledging ground station ping.', type: 'M17' },
  { key: 'voice-03', transcript: 'SomaiyaSat orbit tracking established on 437 MHz.', type: 'Codec2' }
];

function getSstvAsset() {
  const list = (manifestData && Array.isArray(manifestData.sstv) && manifestData.sstv.length > 0)
    ? manifestData.sstv
    : FALLBACK_SSTV;
  return list[Math.floor(Math.random() * list.length)];
}

function getVoiceAsset(type) {
  const fullList = (manifestData && Array.isArray(manifestData.voice) && manifestData.voice.length > 0)
    ? manifestData.voice
    : FALLBACK_VOICE;
  const filtered = fullList.filter(item => !item.type || item.type === type);
  const list = filtered.length > 0 ? filtered : fullList;
  return list[Math.floor(Math.random() * list.length)];
}

function calculateDownlinkStatus(linkQuality, type) {
  let status;
  if (linkQuality >= 60) {
    status = 'RECEIVED';
  } else if (linkQuality >= 30) {
    status = Math.random() < 0.7 ? 'RECEIVED' : 'PARTIAL';
  } else {
    const rand = Math.random();
    if (rand < 0.5) {
      status = 'LOST';
    } else if (rand < 0.8) {
      status = 'PARTIAL';
    } else {
      status = 'RECEIVED';
    }
  }

  // TT&C is small and robust: if type is TTC, LOST becomes PARTIAL
  if (type === 'TTC' && status === 'LOST') {
    status = 'PARTIAL';
  }

  return status;
}

function buildDownlinkPayload(type, linkQuality, battery, activeMode) {
  if (type === 'TTC') {
    const batteryPercent = typeof battery === 'number' ? Math.round(battery * 10) / 10 : 84.5;
    const batteryVoltage = Math.round((3.3 + (batteryPercent / 100) * (4.2 - 3.3)) * 100) / 100;
    const boardTempC = Math.round((5 + Math.random() * (45 - 5)) * 10) / 10;
    const solarCurrentmA = Math.floor(Math.random() * 351);
    const uptimeSec = Math.floor(process.uptime()) + 86400;
    const rssiDbm = Math.round(-120 + (linkQuality / 100) * 50);

    return {
      batteryVoltage,
      batteryPercent,
      boardTempC,
      solarCurrentmA,
      uptimeSec,
      mode: activeMode || 'TTC',
      rssiDbm
    };
  }

  if (type === 'SSTV') {
    const asset = getSstvAsset();
    return {
      imageKey: asset.key,
      caption: asset.caption,
      quality: linkQuality,
      mode: 'Martin M1',
      resolution: '320x256'
    };
  }

  if (type === 'Codec2' || type === 'M17') {
    const asset = getVoiceAsset(type);
    return {
      audioKey: asset.key,
      transcript: asset.transcript,
      bitrate: type === 'Codec2' ? '3200 bps' : '3200 bps digital voice',
      durationSec: Math.floor(4 + Math.random() * 8)
    };
  }

  return {};
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function getLocalPassInfo(dateObj) {
  const year = dateObj.getFullYear();
  const month = pad(dateObj.getMonth() + 1);
  const day = pad(dateObj.getDate());
  const hours = pad(dateObj.getHours());
  const minutes = pad(dateObj.getMinutes());
  const seconds = pad(dateObj.getSeconds());

  const dateStr = `${year}-${month}-${day}`;
  const timeStr = `${hours}:${minutes}:${seconds}`;
  const passId = `PASS-${year}${month}${day}-${hours}${minutes}${seconds}`;

  return { passId, dateStr, timeStr, hours, minutes, seconds };
}

const initialPassInfo = getLocalPassInfo(new Date());

let currentTelemetry = {
  battery: 84.5,
  linkQuality: 20,
  snr: 4.0,
  activeMode: 'TTC',
  passStatus: 'ACTIVE',
  passTimeRemainingSec: 600,
  currentPassId: initialPassInfo.passId
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
    passId: initialPassInfo.passId,
    date: initialPassInfo.dateStr,
    startTime: initialPassInfo.timeStr,
    endTime: 'Active',
    durationSec: 600,
    itemsSent: 0,
    overrideCount: 0,
    status: 'ACTIVE',
    targetPeak: 88,
    peakLinkQuality: 20,
    avgBattery: 84.5,
    batterySum: 84.5,
    batteryCount: 1,
    createdAt: new Date(),
    decisions: []
  },
  {
    passId: 'PASS-20260817-103215',
    date: '2026-08-17',
    startTime: '10:32:15',
    endTime: '10:42:15',
    durationSec: 600,
    itemsSent: 2,
    overrideCount: 0,
    status: 'COMPLETED',
    peakLinkQuality: 95,
    avgBattery: 88.0,
    createdAt: new Date('2026-08-17T10:32:15'),
    decisions: [
      {
        id: 'DEC-706',
        decisionId: 'DEC-706',
        downlinkId: 'DWN-706',
        timestamp: '10:41:00',
        createdAt: new Date('2026-08-17T10:41:00'),
        selectedType: 'TTC',
        reasoning: 'TTC selected: Housekeeping beacon dispatched prior to pass loss of signal. Priority score 310.',
        isOverridden: false,
        passId: 'PASS-20260817-103215',
        score: 310
      },
      {
        id: 'DEC-705',
        decisionId: 'DEC-705',
        downlinkId: 'DWN-705',
        timestamp: '10:39:10',
        createdAt: new Date('2026-08-17T10:39:10'),
        selectedType: 'SSTV',
        reasoning: 'SSTV selected: Image frame payload transmitted at peak SNR 19.5 dB.',
        isOverridden: false,
        passId: 'PASS-20260817-103215',
        score: 240
      }
    ]
  }
];

let decisionLog = passes.flatMap(p => p.decisions);

let downlinkLog = [
  {
    downlinkId: 'DWN-706',
    decisionId: 'DEC-706',
    passId: 'PASS-20260817-103215',
    type: 'TTC',
    label: 'Critical Telemetry & Beacon',
    sizeKb: 12,
    status: 'RECEIVED',
    linkQualityAtSend: 95,
    ackReceived: true,
    ackLatencyMs: 215,
    payload: {
      batteryVoltage: 4.09,
      batteryPercent: 88,
      boardTempC: 22.4,
      solarCurrentmA: 280,
      uptimeSec: 86400,
      mode: 'TTC',
      rssiDbm: -72
    },
    isRetransmit: false,
    createdAt: new Date('2026-08-17T10:41:00')
  },
  {
    downlinkId: 'DWN-705',
    decisionId: 'DEC-705',
    passId: 'PASS-20260817-103215',
    type: 'SSTV',
    label: 'Earth Observation Frame #44',
    sizeKb: 450,
    status: 'RECEIVED',
    linkQualityAtSend: 95,
    ackReceived: true,
    ackLatencyMs: 340,
    payload: {
      imageKey: 'sstv-01',
      caption: 'Earth limb over the Indian Ocean',
      quality: 95,
      mode: 'Martin M1',
      resolution: '320x256'
    },
    isRetransmit: false,
    createdAt: new Date('2026-08-17T10:39:10')
  }
];

function recordDispatchedDownlink({ item, type, decisionId, passId, now }) {
  const dispatchedItem = item || {
    id: `Q-${Math.floor(100 + Math.random() * 900)}`,
    itemId: `Q-${Math.floor(100 + Math.random() * 900)}`,
    type,
    label: `${type} Data Transmission`,
    sizeKb: type === 'TTC' ? 14 : type === 'SSTV' ? 450 : type === 'Codec2' ? 64 : 128,
    baseWeight: 100,
    waitTimeSec: 0,
    isRetransmit: false
  };

  const isRetransmit = Boolean(dispatchedItem.isRetransmit);
  const status = calculateDownlinkStatus(currentTelemetry.linkQuality, type);
  const ackReceived = status !== 'LOST';
  const ackLatencyMs = ackReceived ? Math.floor(120 + Math.random() * (900 - 120 + 1)) : null;
  const payload = buildDownlinkPayload(type, currentTelemetry.linkQuality, currentTelemetry.battery, currentTelemetry.activeMode);

  const downlinkId = `DWN-${now.getTime().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;

  const newDownlink = {
    downlinkId,
    decisionId,
    passId,
    type,
    label: dispatchedItem.label,
    sizeKb: dispatchedItem.sizeKb || 14,
    status,
    linkQualityAtSend: currentTelemetry.linkQuality,
    ackReceived,
    ackLatencyMs,
    payload,
    isRetransmit,
    createdAt: now
  };

  downlinkLog.unshift(newDownlink);
  if (downlinkLog.length > 100) {
    downlinkLog.pop();
  }

  if (isDbConnected()) {
    Downlink.create(newDownlink).catch(err => console.error('[DB ERROR] Failed to save downlink:', err.message));
  }

  if (status === 'LOST') {
    const rawLabel = dispatchedItem.label || `${type} Transmission`;
    const cleanLabel = rawLabel.startsWith('RETRANSMIT: ')
      ? rawLabel
      : `RETRANSMIT: ${rawLabel}`;

    const retransmitItem = {
      ...dispatchedItem,
      id: `Q-${Math.floor(100 + Math.random() * 900)}`,
      itemId: `Q-${Math.floor(100 + Math.random() * 900)}`,
      label: cleanLabel,
      waitTimeSec: 0,
      priorityScore: dispatchedItem.baseWeight || 100,
      status: 'PENDING',
      isRetransmit: true
    };
    queueItems.push(retransmitItem);
  }

  return downlinkId;
}
let intervalId = null;
let tickCounter = 0;

function startNewPass(now = new Date()) {
  const info = getLocalPassInfo(now);
  const durationSec = 600;

  const targetPeak = Math.floor(85 + Math.random() * 11);
  const newPass = {
    passId: info.passId,
    date: info.dateStr,
    startTime: info.timeStr,
    endTime: 'Active',
    durationSec,
    itemsSent: 0,
    overrideCount: 0,
    status: 'ACTIVE',
    targetPeak,
    peakLinkQuality: 20,
    avgBattery: currentTelemetry.battery,
    batterySum: currentTelemetry.battery,
    batteryCount: 1,
    createdAt: now,
    decisions: []
  };

  passes.unshift(newPass);
  currentTelemetry.currentPassId = info.passId;
  currentTelemetry.passTimeRemainingSec = durationSec;
  currentTelemetry.passStatus = 'ACTIVE';
  currentTelemetry.linkQuality = 20;
  currentTelemetry.snr = 4.0;

  if (isDbConnected()) {
    Pass.updateMany(
      { passId: { $ne: info.passId }, status: 'ACTIVE' },
      { $set: { status: 'COMPLETED' } }
    ).catch(() => {});

    Pass.updateOne(
      { passId: info.passId },
      {
        $set: {
          passId: info.passId,
          date: info.dateStr,
          startTime: info.timeStr,
          endTime: 'Active',
          durationSec,
          itemsSent: 0,
          overrideCount: 0,
          status: 'ACTIVE',
          peakLinkQuality: currentTelemetry.linkQuality,
          avgBattery: currentTelemetry.battery,
          createdAt: now
        }
      },
      { upsert: true }
    ).catch(err => console.error('[DB ERROR] Failed to upsert active pass:', err.message));
  }

  return newPass;
}

async function cleanupOldActivePasses() {
  if (isDbConnected()) {
    try {
      await Pass.updateMany({ status: 'ACTIVE' }, { $set: { status: 'COMPLETED' } });
    } catch (err) {
      console.error('[DB ERROR] Failed to clean up leftover active passes:', err.message);
    }
  }
}

async function syncActivePassToDb() {
  if (isDbConnected()) {
    const activePass = passes.find(p => p.passId === currentTelemetry.currentPassId);
    if (activePass) {
      await Pass.updateOne(
        { passId: activePass.passId },
        {
          $set: {
            passId: activePass.passId,
            date: activePass.date,
            startTime: activePass.startTime,
            endTime: 'Active',
            durationSec: activePass.durationSec || 600,
            itemsSent: activePass.itemsSent || 0,
            overrideCount: activePass.overrideCount || 0,
            status: 'ACTIVE',
            peakLinkQuality: activePass.peakLinkQuality || 88,
            avgBattery: activePass.avgBattery || 84.5,
            createdAt: activePass.createdAt || new Date()
          }
        },
        { upsert: true }
      ).catch(err => console.error('[DB ERROR] Failed to upsert active pass:', err.message));
    }
  }
}

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

async function startSimulator() {
  if (intervalId) return;

  // Mark leftover ACTIVE passes from previous run as COMPLETED and upsert current active pass
  if (isDbConnected()) {
    await cleanupOldActivePasses();
    await syncActivePassToDb();
  }

  mongoose.connection.on('connected', async () => {
    await cleanupOldActivePasses();
    await syncActivePassToDb();
  });

  intervalId = setInterval(() => {
    tickCounter++;

    // Fluctuate telemetry metrics according to realistic pass elevation profile
    const activePass = passes.find(p => p.passId === currentTelemetry.currentPassId);
    const durationSec = (activePass && activePass.durationSec) ? activePass.durationSec : 600;
    const elapsedSec = Math.max(0, durationSec - currentTelemetry.passTimeRemainingSec);
    const progress = Math.max(0, Math.min(1, elapsedSec / durationSec));

    const curve = Math.pow(Math.sin(progress * Math.PI), 1.4);
    const baseLink = 18;
    const peakLink = (activePass && activePass.targetPeak) ? activePass.targetPeak : 88;
    const noise = Math.floor(Math.random() * 11) - 5;
    const newLink = Math.max(5, Math.min(100, Math.round(baseLink + (peakLink - baseLink) * curve + noise)));

    const batDelta = (currentTelemetry.activeMode === 'SSTV' ? -0.3 : -0.1) + 0.05;
    const newBat = Math.max(15, Math.min(100, Math.round((currentTelemetry.battery + batDelta) * 10) / 10));

    currentTelemetry.linkQuality = newLink;
    currentTelemetry.battery = newBat;
    currentTelemetry.snr = Math.round((newLink / 5) * 10) / 10;

    if (activePass) {
      if (newLink > (activePass.peakLinkQuality || 0)) {
        activePass.peakLinkQuality = newLink;
      }
      activePass.batterySum = (activePass.batterySum || activePass.avgBattery || newBat) + newBat;
      activePass.batteryCount = (activePass.batteryCount || 1) + 1;
      activePass.avgBattery = Math.round((activePass.batterySum / activePass.batteryCount) * 10) / 10;
    }
    
    if (currentTelemetry.passTimeRemainingSec > 0) {
      currentTelemetry.passTimeRemainingSec -= 3;
    } else {
      // Pass finished! Complete active pass and save to DB
      const activePass = passes.find(p => p.passId === currentTelemetry.currentPassId);
      if (activePass) {
        const now = new Date();
        const endInfo = getLocalPassInfo(now);

        activePass.status = 'COMPLETED';
        activePass.endTime = endInfo.timeStr;
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

      // Start new pass with local time ID and status ACTIVE
      startNewPass();
    }

    // Append history snapshot
    const now = new Date();
    const decInfo = getLocalPassInfo(now);
    telemetryHistory.push({
      time: decInfo.timeStr,
      battery: newBat,
      linkQuality: newLink,
      snr: currentTelemetry.snr
    });
    if (telemetryHistory.length > 30) telemetryHistory.shift();

    // Mission Phase Guard: keep telemetry ticking (battery/link) but do NOT dispatch, create decisions, or create downlinks
    if (!mission.isOperational()) {
      return;
    }

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
    let dispatchedItem = null;
    if (dispatchedIndex !== -1) {
      dispatchedItem = queueItems.splice(dispatchedIndex, 1)[0];
    }

    // Periodically replenish queue items (every 3 ticks or if queue falls below 3 items)
    if (tickCounter % 3 === 0 || queueItems.length < 3) {
      replenishQueue();
    }

    const decId = `DEC-${now.getTime().toString().slice(-4)}`;
    const downlinkId = recordDispatchedDownlink({
      item: dispatchedItem,
      type: decision.selectedType,
      decisionId: decId,
      passId: currentTelemetry.currentPassId,
      now
    });

    const newDec = {
      id: decId,
      decisionId: decId,
      downlinkId,
      timestamp: decInfo.timeStr,
      createdAt: now,
      selectedType: decision.selectedType,
      reasoning: decision.reasoning,
      isOverridden: false,
      passId: currentTelemetry.currentPassId,
      score: decision.score || 0
    };

    decisionLog.unshift(newDec);
    if (activePass) {
      if (!activePass.decisions) activePass.decisions = [];
      activePass.decisions.unshift(newDec);
      activePass.itemsSent = activePass.decisions.length;
      activePass.overrideCount = activePass.decisions.filter(d => d.isOverridden).length;
      if (isDbConnected()) {
        Pass.updateOne(
          { passId: activePass.passId },
          {
            $set: {
              itemsSent: activePass.itemsSent,
              overrideCount: activePass.overrideCount
            }
          }
        ).catch(() => {});
      }
    }

    // Fire-and-forget save auto decision to MongoDB if connected
    if (isDbConnected()) {
      Decision.create({
        decisionId: newDec.decisionId,
        downlinkId: newDec.downlinkId,
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
function getDownlinks() { return downlinkLog; }

function applyOverride(mode) {
  if (!mission.isOperational()) {
    const err = new Error('Manual transmission override rejected: satellite is not operational.');
    err.status = 403;
    throw err;
  }

  currentTelemetry.activeMode = mode;

  // Remove item of dispatched mode from queue if present
  const overrideItemIndex = queueItems.findIndex(item => item.type === mode);
  let dispatchedItem = null;
  if (overrideItemIndex !== -1) {
    dispatchedItem = queueItems.splice(overrideItemIndex, 1)[0];
  }

  const now = new Date();
  const timeStr = getLocalPassInfo(now).timeStr;
  const decId = `DEC-${now.getTime().toString().slice(-4)}`;

  const downlinkId = recordDispatchedDownlink({
    item: dispatchedItem,
    type: mode,
    decisionId: decId,
    passId: currentTelemetry.currentPassId,
    now
  });

  const newDec = {
    id: decId,
    decisionId: decId,
    downlinkId,
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
    activePass.itemsSent = activePass.decisions.length;
    activePass.overrideCount = activePass.decisions.filter(d => d.isOverridden).length;
    if (isDbConnected()) {
      Pass.updateOne(
        { passId: activePass.passId },
        {
          $set: {
            itemsSent: activePass.itemsSent,
            overrideCount: activePass.overrideCount
          }
        }
      ).catch(() => {});
    }
  }

  // Fire-and-forget save override decision to MongoDB if connected
  if (isDbConnected()) {
    Decision.create({
      decisionId: newDec.decisionId,
      downlinkId: newDec.downlinkId,
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
  downlinkLog = downlinkLog.filter(d => d.passId !== passId);
}

async function createNewPass(reason = 'MANUAL') {
  const now = new Date();
  const endInfo = getLocalPassInfo(now);

  const activePass = passes.find(p => p.passId === currentTelemetry.currentPassId && p.status === 'ACTIVE');
  if (activePass) {
    activePass.status = 'INTERRUPTED';
    activePass.endTime = endInfo.timeStr;
    activePass.itemsSent = (activePass.decisions || []).length;
    activePass.overrideCount = (activePass.decisions || []).filter(d => d.isOverridden).length;

    if (isDbConnected()) {
      try {
        await Pass.updateOne(
          { passId: activePass.passId },
          {
            $set: {
              status: 'INTERRUPTED',
              endTime: activePass.endTime,
              itemsSent: activePass.itemsSent,
              overrideCount: activePass.overrideCount
            }
          }
        );
      } catch (err) {
        console.error('[DB ERROR] Failed to finalize interrupted pass:', err.message);
      }
    }
  }

  let newPassTime = new Date();
  let info = getLocalPassInfo(newPassTime);
  while (passes.some(p => p.passId === info.passId)) {
    newPassTime = new Date(newPassTime.getTime() + 1000);
    info = getLocalPassInfo(newPassTime);
  }

  const newPass = startNewPass(newPassTime);

  // Reset TTC starvation on current queue items without clobbering the queue
  queueItems = queueItems.map(item => {
    if (item.type === 'TTC') {
      const updated = { ...item, waitTimeSec: 0, isStarved: false };
      return {
        ...updated,
        priorityScore: router.calculateScore(updated, currentTelemetry)
      };
    }
    return item;
  });

  return newPass;
}

module.exports = {
  startSimulator,
  getTelemetry,
  getTelemetryHistory,
  getQueue,
  getDecisions,
  getPasses,
  getDownlinks,
  applyOverride,
  deletePass,
  createNewPass
};
