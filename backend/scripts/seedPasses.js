const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Pass = require('../src/models/Pass');
const Decision = require('../src/models/Decision');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/arbiter';

const TYPES = ['TTC', 'SSTV', 'Codec2', 'M17'];

const DECISION_REASONS = {
  TTC: [
    'TTC selected: High priority base weight (100) enforced for critical satellite health telemetry.',
    'SAFETY OVERRIDE: TT&C wait time (135s) exceeded 120s starvation threshold. High priority dispatch forced.',
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

async function seed() {
  console.log('[SEED] Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  console.log(`[SEED] Connected to ${mongoose.connection.host}`);

  console.log('[SEED] Clearing existing Pass and Decision documents...');
  await Pass.deleteMany({});
  await Decision.deleteMany({});

  console.log('[SEED] Generating 15 ground passes over the last 30 days...');

  const now = new Date();
  const passesToInsert = [];
  const decisionsToInsert = [];

  for (let i = 15; i >= 1; i--) {
    const daysAgo = Math.floor((i / 15) * 28);
    const passDateObj = new Date(now.getTime() - daysAgo * 86400000 - Math.random() * 3600000);
    const dateStr = passDateObj.toISOString().slice(0, 10);
    const startHour = Math.floor(8 + Math.random() * 12).toString().padStart(2, '0');
    const startMin = Math.floor(Math.random() * 60).toString().padStart(2, '0');
    const startTimeStr = `${startHour}:${startMin}:00 UTC`;

    const endMin = (parseInt(startMin, 10) + 10) % 60;
    const endHour = parseInt(startMin, 10) + 10 >= 60 ? (parseInt(startHour, 10) + 1) % 24 : startHour;
    const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}:00 UTC`;

    const passId = `PASS-${dateStr.replace(/-/g, '')}-${(16 - i).toString().padStart(2, '0')}`;
    const peakLinkQuality = Math.floor(82 + Math.random() * 16);
    const avgBattery = Math.round((78 + Math.random() * 16) * 10) / 10;
    const status = i === 1 ? 'ACTIVE' : 'COMPLETED';

    const numDecisions = Math.floor(5 + Math.random() * 4); // 5 to 8 decisions
    let overrideCount = 0;

    for (let d = numDecisions; d >= 1; d--) {
      const decId = `DEC-${1000 + i * 20 + d}`;
      const isOverride = Math.random() < 0.15; // ~15% chance of manual override
      const selectedType = TYPES[Math.floor(Math.random() * TYPES.length)];
      if (isOverride) overrideCount++;

      const reasonList = DECISION_REASONS[selectedType] || DECISION_REASONS.TTC;
      let reasoning = isOverride
        ? `OPERATOR OVERRIDE: Ground station engineer commanded direct transmission of ${selectedType}.`
        : reasonList[Math.floor(Math.random() * reasonList.length)];

      const decMin = (parseInt(startMin, 10) + Math.floor((d / numDecisions) * 9)) % 60;
      const decSec = Math.floor(Math.random() * 60).toString().padStart(2, '0');
      const timestampStr = `${startHour}:${decMin.toString().padStart(2, '0')}:${decSec}`;

      decisionsToInsert.push({
        decisionId: decId,
        timestamp: timestampStr,
        selectedType,
        reasoning,
        isOverridden: isOverride,
        overriddenType: isOverride ? selectedType : undefined,
        passId,
        score: isOverride ? 0 : Math.floor(120 + Math.random() * 220),
        createdAt: new Date(passDateObj.getTime() + d * 60000)
      });
    }

    passesToInsert.push({
      passId,
      date: dateStr,
      startTime: startTimeStr,
      endTime: status === 'ACTIVE' ? 'Active' : endTimeStr,
      durationSec: 600,
      itemsSent: numDecisions,
      overrideCount,
      status,
      peakLinkQuality,
      avgBattery,
      createdAt: passDateObj
    });
  }

  await Pass.insertMany(passesToInsert);
  await Decision.insertMany(decisionsToInsert);

  console.log(`[SEED SUCCESS] Successfully inserted ${passesToInsert.length} passes and ${decisionsToInsert.length} decisions!`);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('[SEED ERROR]', err);
  process.exit(1);
});
