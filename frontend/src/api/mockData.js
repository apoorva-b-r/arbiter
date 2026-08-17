export const MOCK_TELEMETRY = {
  battery: 84.5,
  linkQuality: 88,
  snr: 18.2,
  activeMode: 'TTC',
  passStatus: 'ACTIVE', // 'ACTIVE' | 'IDLE'
  passTimeRemainingSec: 385,
  currentPassId: 'PASS-20260817-09'
};

export const MOCK_TELEMETRY_HISTORY = Array.from({ length: 25 }, (_, i) => {
  const t = new Date(Date.now() - (24 - i) * 10000);
  const timeStr = t.toTimeString().substring(0, 8);
  // Realistic ground pass curve (sine curve for link quality as satellite passes overhead)
  const angle = (i / 24) * Math.PI;
  const linkQuality = Math.round(35 + Math.sin(angle) * 60 + (Math.random() * 4 - 2));
  const battery = Math.round((88 - (24 - i) * 0.15 + (Math.random() * 0.2 - 0.1)) * 10) / 10;
  return {
    time: timeStr,
    battery: Math.max(10, Math.min(100, battery)),
    linkQuality: Math.max(0, Math.min(100, linkQuality)),
    snr: Math.round((linkQuality / 5) * 10) / 10
  };
});

export const MOCK_QUEUE = [
  {
    id: 'Q-101',
    type: 'TTC',
    label: 'Critical Telemetry & Beacon',
    sizeKb: 12,
    waitTimeSec: 135,
    baseWeight: 100,
    priorityScore: 345,
    status: 'PENDING',
    isStarved: true // >120s trigger
  },
  {
    id: 'Q-102',
    type: 'SSTV',
    label: 'Earth Observation Frame #44',
    sizeKb: 450,
    waitTimeSec: 85,
    baseWeight: 60,
    priorityScore: 215,
    status: 'PENDING',
    isStarved: false
  },
  {
    id: 'Q-103',
    type: 'Codec2',
    label: 'Compressed Voice Beacon Stream',
    sizeKb: 64,
    waitTimeSec: 42,
    baseWeight: 40,
    priorityScore: 135,
    status: 'PENDING',
    isStarved: false
  },
  {
    id: 'Q-104',
    type: 'M17',
    label: 'Digital Voice Packet Batch',
    sizeKb: 128,
    waitTimeSec: 18,
    baseWeight: 30,
    priorityScore: 92,
    status: 'PENDING',
    isStarved: false
  }
];

export const MOCK_DECISIONS = [
  {
    id: 'DEC-809',
    timestamp: '12:15:42',
    selectedType: 'TTC',
    reasoning: 'SAFETY OVERRIDE: TT&C wait time (135s) exceeded 120s starvation threshold. High priority dispatch forced.',
    isOverridden: false,
    passId: 'PASS-20260817-09',
    score: 345
  },
  {
    id: 'DEC-808',
    timestamp: '12:14:30',
    selectedType: 'SSTV',
    reasoning: 'SSTV selected: High link quality (92%) allows efficient transfer of 450KB frame. Priority score 215 exceeded candidates.',
    isOverridden: false,
    passId: 'PASS-20260817-09',
    score: 215
  },
  {
    id: 'DEC-807',
    timestamp: '12:13:15',
    selectedType: 'M17',
    reasoning: 'OPERATOR OVERRIDE: Ground station engineer manually commanded M17 transmission.',
    isOverridden: true,
    overriddenType: 'M17',
    passId: 'PASS-20260817-09',
    score: 0
  },
  {
    id: 'DEC-806',
    timestamp: '12:12:00',
    selectedType: 'TTC',
    reasoning: 'TTC selected: Periodic beacon ping scheduled. Priority score 280.',
    isOverridden: false,
    passId: 'PASS-20260817-09',
    score: 280
  }
];

export const MOCK_PASS_HISTORY = [
  {
    passId: 'PASS-20260817-09',
    date: '2026-08-17',
    startTime: '12:10:00 UTC',
    endTime: 'Active',
    durationSec: 600,
    itemsSent: 14,
    overrideCount: 1,
    status: 'ACTIVE',
    peakLinkQuality: 92,
    avgBattery: 85.2
  },
  {
    passId: 'PASS-20260817-08',
    date: '2026-08-17',
    startTime: '10:32:15 UTC',
    endTime: '10:42:15 UTC',
    durationSec: 600,
    itemsSent: 22,
    overrideCount: 0,
    status: 'COMPLETED',
    peakLinkQuality: 95,
    avgBattery: 88.0
  },
  {
    passId: 'PASS-20260817-07',
    date: '2026-08-17',
    startTime: '08:54:00 UTC',
    endTime: '09:04:00 UTC',
    durationSec: 600,
    itemsSent: 18,
    overrideCount: 2,
    status: 'COMPLETED',
    peakLinkQuality: 78,
    avgBattery: 79.5
  },
  {
    passId: 'PASS-20260816-06',
    date: '2026-08-16',
    startTime: '23:15:30 UTC',
    endTime: '23:25:30 UTC',
    durationSec: 600,
    itemsSent: 25,
    overrideCount: 0,
    status: 'COMPLETED',
    peakLinkQuality: 98,
    avgBattery: 91.2
  }
];

export const MOCK_SCENARIOS = [
  {
    id: 'SCEN-01',
    name: 'Nominal Ground Pass Sequence',
    description: 'Standard 10-minute ground pass with link quality up to 95% and initial battery at 90%. Checks standard priority balance.',
    initialBattery: 90,
    linkProfile: 'HIGH_SINE',
    rulesCount: 4,
    status: 'PASSED',
    lastRunAt: '2026-08-17 11:30'
  },
  {
    id: 'SCEN-02',
    name: 'Eclipse Low Battery Stress Test',
    description: 'Simulates eclipse entry with initial battery at 25%. Tests if AI router halts SSTV payload transfer to conserve power for TT&C.',
    initialBattery: 25,
    linkProfile: 'MODERATE',
    rulesCount: 5,
    status: 'PASSED',
    lastRunAt: '2026-08-17 11:32'
  },
  {
    id: 'SCEN-03',
    name: 'TT&C Starvation Prevention Check',
    description: 'Injects high volume of payload requests while withholding TT&C. Verifies that TT&C forces transmission when wait time > 120s.',
    initialBattery: 75,
    linkProfile: 'HIGH_FLAT',
    rulesCount: 3,
    status: 'PASSED',
    lastRunAt: '2026-08-17 11:35'
  },
  {
    id: 'SCEN-04',
    name: 'Degraded Signal Link Quality Curve',
    description: 'Pass with severe fading (link quality < 30%). Tests router response during poor signal-to-noise ratio conditions.',
    initialBattery: 60,
    linkProfile: 'LOW_NOISY',
    rulesCount: 4,
    status: 'FAILED',
    lastRunAt: '2026-08-17 11:40'
  }
];

export const MOCK_VALIDATION_RUNS = [
  { run: 'v1.0.0', passRate: 75, date: 'Aug 10' },
  { run: 'v1.1.0', passRate: 82, date: 'Aug 12' },
  { run: 'v1.2.0', passRate: 90, date: 'Aug 15' },
  { run: 'v1.3.0 (Current)', passRate: 96, date: 'Aug 17' }
];

export const MOCK_DEPLOYMENT_STATE = {
  currentStateIndex: 3, // 0: Stowed, 1: Release triggered, 2: Separation confirmed, 3: Initialization, 4: Commissioning, 5: Operational
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

export const MOCK_ROUTER_SETTINGS = {
  baseWeights: {
    TTC: 100,
    SSTV: 60,
    Codec2: 40,
    M17: 30
  },
  ttcStarvationTimeoutSec: 120,
  batteryThresholdLow: 30,
  linkQualityThresholdLow: 35
};
