const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Pass = require('../src/models/Pass');
const Decision = require('../src/models/Decision');
const Downlink = require('../src/models/Downlink');

if (!Decision.schema.path('downlinkId')) {
  Decision.schema.add({ downlinkId: { type: String } });
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/arbiter';

const TYPES = ['TTC', 'SSTV', 'Codec2', 'M17'];

// Load downlink manifest if available
const manifestPath = path.resolve(__dirname, '../../frontend/public/downlink/manifest.json');
let manifestData = null;
try {
  if (fs.existsSync(manifestPath)) {
    manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }
} catch (err) {
  // Ignore fallback to defaults
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

function buildDownlinkPayload(type, linkQuality, batteryPercent, mode) {
  if (type === 'TTC') {
    const batteryVoltage = Math.round((3.3 + (batteryPercent / 100) * (4.2 - 3.3)) * 100) / 100;
    const boardTempC = Math.round((5 + Math.random() * (45 - 5)) * 10) / 10;
    const solarCurrentmA = Math.floor(Math.random() * 351);
    const uptimeSec = Math.floor(86400 + Math.random() * 500000);
    const rssiDbm = Math.round(-120 + (linkQuality / 100) * 50);

    return {
      batteryVoltage,
      batteryPercent,
      boardTempC,
      solarCurrentmA,
      uptimeSec,
      mode: mode || 'TTC',
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

const DECISION_REASONS = {
  TTC: [
    'TTC selected: High priority base weight (100) enforced for critical satellite health telemetry.',
    'STARVATION SAFEGUARD: TT&C wait time (135s) exceeded 120s starvation threshold. High priority dispatch forced.',
    'TTC selected: Periodic beacon ping scheduled prior to pass loss of signal.'
  ],
  SSTV: [
    'SSTV selected: High link quality (92%) allows efficient transfer of 450KB Earth observation image frame.',
    'SSTV selected: Image frame payload transmitted at peak SNR 19.5 dB. Priority score 240.',
    'SSTV selected: Peak elevation pass profile optimal for broadband optical sensor downlinks.'
  ],
  Codec2: [
    'Codec2 selected: Wait time (45s) accumulated sufficient priority score boost (+67).',
    'Codec2 selected: Low bandwidth compressed voice beacon stream queued during rising link curve.'
  ],
  M17: [
    'OPERATOR OVERRIDE: Ground station engineer manually commanded M17 transmission.',
    'M17 selected: Digital voice packet batch dispatched based on queue weight calculation.'
  ]
};

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

async function seed() {
  console.log('[SEED] Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  console.log(`[SEED] Connected to ${mongoose.connection.host}`);

  console.log('[SEED] Clearing existing Pass, Decision, and Downlink documents...');
  await Pass.deleteMany({});
  await Decision.deleteMany({});
  await Downlink.deleteMany({});

  console.log('[SEED] Generating 15 ground passes over the last 30 days...');

  const now = new Date();
  const passSpecs = [];

  // Pass 1: Today, newest pass, ended at least 30 minutes before current time (35 to 55 min ago)
  const p1Duration = Math.floor(420 + Math.random() * 301); // 420 - 720 sec
  const p1EndMs = now.getTime() - (35 + Math.floor(Math.random() * 20)) * 60 * 1000;
  const p1StartMs = p1EndMs - p1Duration * 1000;
  const p1Date = new Date(p1StartMs);
  passSpecs.push({ startObj: p1Date, durationSec: p1Duration });

  // Pass 2: Today, earlier pass (3 to 6 hours before Pass 1)
  const p2Duration = Math.floor(420 + Math.random() * 301);
  const todayStartMs = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
  let p2StartMs = p1StartMs - (3.5 + Math.random() * 2.5) * 3600 * 1000;
  if (p2StartMs < todayStartMs + 3600 * 1000) {
    p2StartMs = todayStartMs + (7 + Math.random() * 4) * 3600 * 1000;
  }
  const p2Date = new Date(p2StartMs);
  passSpecs.push({ startObj: p2Date, durationSec: p2Duration });

  // Passes 3 to 15: Spread over the last 1 to 28 days
  for (let i = 1; i <= 13; i++) {
    const daysAgo = Math.floor(1 + ((i - 1) / 12) * 27);
    const passDuration = Math.floor(420 + Math.random() * 301);
    const passDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - daysAgo,
      Math.floor(8 + Math.random() * 12),
      Math.floor(Math.random() * 60),
      Math.floor(Math.random() * 60)
    );
    passSpecs.push({ startObj: passDate, durationSec: passDuration });
  }

  // Sort newest first
  passSpecs.sort((a, b) => b.startObj.getTime() - a.startObj.getTime());

  const passesToInsert = [];
  const decisionsToInsert = [];
  const downlinksToInsert = [];

  for (let i = 0; i < passSpecs.length; i++) {
    const { startObj, durationSec } = passSpecs[i];
    const endObj = new Date(startObj.getTime() + durationSec * 1000);

    const startInfo = getLocalPassInfo(startObj);
    const endInfo = getLocalPassInfo(endObj);

    const peakLinkQuality = Math.floor(82 + Math.random() * 16);
    const avgBattery = Math.round((78 + Math.random() * 16) * 10) / 10;

    // Items sent roughly matches duration: 1 transmission roughly every 65-80s
    const numDecisions = Math.max(5, Math.floor(durationSec / Math.floor(65 + Math.random() * 15)));
    let overrideCount = 0;

    for (let d = numDecisions; d >= 1; d--) {
      const decId = `DEC-${1000 + (i + 1) * 20 + d}`;
      const dwnId = `DWN-${1000 + (i + 1) * 20 + d}`;
      const isOverride = Math.random() < 0.15;
      const isStarvationSafeguard = !isOverride && Math.random() < 0.125;

      let selectedType = TYPES[Math.floor(Math.random() * TYPES.length)];
      if (isStarvationSafeguard) {
        selectedType = 'TTC';
      }

      if (isOverride) overrideCount++;

      let waitTime = 0;
      let reasoning;
      if (isOverride) {
        reasoning = `OPERATOR OVERRIDE: Ground station engineer commanded direct transmission of ${selectedType}.`;
      } else if (isStarvationSafeguard) {
        waitTime = Math.floor(125 + Math.random() * 30);
        reasoning = `STARVATION SAFEGUARD: TT&C has waited ${waitTime}s, exceeding the 120s limit. Forced to top priority regardless of other scores.`;
      } else {
        const reasonList = DECISION_REASONS[selectedType] || DECISION_REASONS.TTC;
        reasoning = reasonList[Math.floor(Math.random() * reasonList.length)];
      }

      const progress = (numDecisions > 1) ? (numDecisions - d) / (numDecisions - 1) : 0.5;
      const decMs = startObj.getTime() + Math.floor(progress * durationSec * 1000);
      const decDate = new Date(decMs);
      const decInfo = getLocalPassInfo(decDate);

      // Link quality at decision time: pass elevation curve with jitter
      const curve = Math.pow(Math.sin(progress * Math.PI), 1.4);
      const baseLink = 17;
      const noise = Math.floor(Math.random() * 11) - 5;
      const decisionLinkQuality = Math.max(5, Math.min(100, Math.round(baseLink + (peakLinkQuality - baseLink) * curve + noise)));
      const decisionBattery = Math.round((avgBattery + (Math.random() * 4 - 2)) * 10) / 10;

      const status = calculateDownlinkStatus(decisionLinkQuality, selectedType);
      const ackReceived = status !== 'LOST';
      const ackLatencyMs = ackReceived ? Math.floor(120 + Math.random() * (900 - 120 + 1)) : null;
      const payload = buildDownlinkPayload(selectedType, decisionLinkQuality, decisionBattery, selectedType);

      const typeLabels = {
        TTC: 'Periodic Housekeeping Beacon',
        SSTV: 'High-Res Earth Observation Frame',
        Codec2: 'Compressed Digital Voice Stream',
        M17: 'Telemetry Packet Batch'
      };
      const typeSizes = {
        TTC: 14,
        SSTV: 450,
        Codec2: 32,
        M17: 110
      };

      downlinksToInsert.push({
        downlinkId: dwnId,
        decisionId: decId,
        passId: startInfo.passId,
        type: selectedType,
        label: typeLabels[selectedType] || `${selectedType} Transmission`,
        sizeKb: typeSizes[selectedType] || 25,
        status,
        linkQualityAtSend: decisionLinkQuality,
        ackReceived,
        ackLatencyMs,
        payload,
        isRetransmit: false,
        createdAt: decDate
      });

      decisionsToInsert.push({
        decisionId: decId,
        downlinkId: dwnId,
        timestamp: decInfo.timeStr,
        selectedType,
        reasoning,
        isOverridden: isOverride,
        overriddenType: isOverride ? selectedType : undefined,
        passId: startInfo.passId,
        score: isOverride ? 0 : (isStarvationSafeguard ? Math.round(100 + waitTime * 1.5 + peakLinkQuality * 0.8) : Math.floor(120 + Math.random() * 220)),
        createdAt: decDate
      });
    }

    passesToInsert.push({
      passId: startInfo.passId,
      date: startInfo.dateStr,
      startTime: startInfo.timeStr,
      endTime: endInfo.timeStr,
      durationSec,
      itemsSent: numDecisions,
      overrideCount,
      status: 'COMPLETED',
      peakLinkQuality,
      avgBattery,
      createdAt: startObj
    });
  }

  await Pass.insertMany(passesToInsert);
  await Decision.insertMany(decisionsToInsert);
  await Downlink.insertMany(downlinksToInsert);

  console.log(`[SEED SUCCESS] Successfully inserted ${passesToInsert.length} passes, ${decisionsToInsert.length} decisions, and ${downlinksToInsert.length} downlinks!`);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('[SEED ERROR]', err);
  process.exit(1);
});
