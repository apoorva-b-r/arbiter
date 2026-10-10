
const mongoose = require('mongoose');
const router = require('./router');
const Scenario = require('../models/Scenario');
const ValidationRun = require('../models/ValidationRun');
const { isDbConnected } = require('../db');

const SCENARIOS = [
  {
    scenarioId: 'SCEN-01',
    name: 'Nominal Ground Pass Sequence',
    description: 'Standard ground pass with healthy battery and strong link.',
    initialBattery: 90,
    linkProfile: 'strong',
    rulesCount: 4,
    status: 'PASSED'
  },
  {
    scenarioId: 'SCEN-02',
    name: 'Eclipse Low Battery Stress Test',
    description: 'Tests payload selection during low battery.',
    initialBattery: 25,
    linkProfile: 'weak',
    rulesCount: 4,
    status: 'PASSED'
  },
  {
    scenarioId: 'SCEN-03',
    name: 'TT&C Starvation Prevention Check',
    description: 'Tests the TT&C starvation safety fallback.',
    initialBattery: 75,
    linkProfile: 'strong',
    rulesCount: 4,
    status: 'PASSED'
  },
  {
    scenarioId: 'SCEN-04',
    name: 'Degraded Signal Link Quality Curve',
    description: 'Tests transmission under degraded signal conditions.',
    initialBattery: 60,
    linkProfile: 'fluctuating',
    rulesCount: 4,
    status: 'PASSED'
  }
];

let memoryScenarios = SCENARIOS.map(s => ({ ...s }));
let memoryRuns = [];

function connected() {
  return isDbConnected();
}

function sameId(scenario, id) {
  return (
    String(scenario._id || scenario.id || scenario.scenarioId) === String(id) ||
    String(scenario.scenarioId) === String(id)
  );
}

async function getScenarios() {
  if (!connected()) {
    return memoryScenarios;
  }

  if (await Scenario.countDocuments() === 0) {
    await Scenario.insertMany(SCENARIOS);
  }

  return Scenario.find().sort({ createdAt: 1 }).lean();
}

async function addScenario(input) {
  const scenarioId =
    `SCEN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const scenario = {
    scenarioId,
    name: input.name.trim(),
    description: input.description.trim(),
    initialBattery: input.initialBattery,
    linkProfile: input.linkProfile.trim(),
    rulesCount: 4,
    status: 'PASSED'
  };

  if (connected()) {
    return Scenario.create(scenario);
  }

  memoryScenarios.unshift({ ...scenario, id: scenarioId });
  return memoryScenarios[0];
}

async function updateScenario(id, input) {
  if (connected()) {
    const filter = mongoose.isValidObjectId(id)
      ? { $or: [{ _id: id }, { scenarioId: id }] }
      : { scenarioId: id };

    return Scenario.findOneAndUpdate(
      filter,
      {
        name: input.name.trim(),
        description: input.description.trim(),
        initialBattery: input.initialBattery,
        linkProfile: input.linkProfile.trim()
      },
      { new: true, runValidators: true }
    );
  }

  const scenario = memoryScenarios.find(item => sameId(item, id));

  if (!scenario) {
    return null;
  }

  Object.assign(scenario, {
    name: input.name.trim(),
    description: input.description.trim(),
    initialBattery: input.initialBattery,
    linkProfile: input.linkProfile.trim()
  });

  return scenario;
}

async function deleteScenario(id) {
  if (connected()) {
    const filter = mongoose.isValidObjectId(id)
      ? { $or: [{ _id: id }, { scenarioId: id }] }
      : { scenarioId: id };

    const result = await Scenario.findOneAndDelete(filter);
    return Boolean(result);
  }

  const index = memoryScenarios.findIndex(item => sameId(item, id));

  if (index === -1) {
    return false;
  }

  memoryScenarios.splice(index, 1);
  return true;
}

function linkAt(profile, tick) {
  switch (String(profile || '').toLowerCase()) {
    case 'strong':
    case 'high_flat':
      return 85;

    case 'high_sine':
      return Math.round(75 + 20 * Math.sin(tick / 8));

    case 'moderate':
      return 50;

    case 'weak':
      return 30;

    case 'low_noisy':
      return Math.round(15 + Math.random() * 25);

    case 'dropout':
      return tick >= 30 ? 5 : 80;

    case 'fluctuating':
      return Math.round(15 + Math.random() * 75);

    default:
      return 70;
  }
}

async function runScenario(id) {
  const scenarios = await getScenarios();
  const scenario = scenarios.find(item => sameId(item, id));

  if (!scenario) {
    return null;
  }

  const settings = router.getSettings();
  let battery = Number(scenario.initialBattery);
  let maxTtcWait = 0;
  let sstvBelowThreshold = false;
  let nonTtcDuringPoorLink = false;
  let belowFiveAtTick = null;
  let blockedTransmissions = 0;

  const queue = [
    { id: 'ttc', type: 'TTC', waitTimeSec: 0, sizeKb: 1 },
    { id: 'sstv', type: 'SSTV', waitTimeSec: 0, sizeKb: 500 },
    { id: 'codec2', type: 'Codec2', waitTimeSec: 0, sizeKb: 20 },
    { id: 'm17', type: 'M17', waitTimeSec: 0, sizeKb: 20 }
  ];

  // Simulate 60 ticks, with each tick representing 3 seconds.
  for (let tick = 0; tick < 60; tick++) {
    const linkQuality = linkAt(scenario.linkProfile, tick);

    // Always evaluate the actual router decision using the full queue.
    const decision = router.makeDecision(queue, {
      battery,
      linkQuality
    });

    const selected = decision.selectedType;

    // Rule 1: Record whether SSTV was selected below its battery threshold.
    if (
      selected === 'SSTV' &&
      battery < settings.batteryThresholdLow
    ) {
      sstvBelowThreshold = true;
    }

    // Approximate battery consumption for the selected payload.
    const batteryCost =
      selected === 'SSTV' ? 1.2 :
      selected === 'TTC' ? 0.05 :
      0.2;

    // Preserve the 5% battery reserve.
    const canTransmit = battery - batteryCost >= 5;

    let transmittedType = null;

    if (canTransmit) {
      transmittedType = selected;
      battery -= batteryCost;

      // A successful transmission resets the selected item's wait.
      // Every other queued item continues waiting.
      queue.forEach(item => {
        if (item.type === transmittedType) {
          item.waitTimeSec = 0;
        } else {
          item.waitTimeSec += 3;
        }
      });
    } else {
      // No transmission occurred. All queued items continue waiting.
      blockedTransmissions++;

      queue.forEach(item => {
        item.waitTimeSec += 3;
      });
    }

    // Rule 2: Check what was actually transmitted during poor link quality.
    if (linkQuality < 20 && transmittedType !== null &&
        transmittedType !== 'TTC') {
      nonTtcDuringPoorLink = true;
    }

    // Measure TT&C wait AFTER this tick's wait-time update.
    const ttc = queue.find(item => item.type === 'TTC');

    if (ttc) {
      maxTtcWait = Math.max(maxTtcWait, ttc.waitTimeSec);
    }

    if (battery < 5 && belowFiveAtTick === null) {
      belowFiveAtTick = tick + 1;
    }
  }

  const rulesChecked = [
    {
      rule: 'TT&C starvation timeout',
      name: 'TT&C max wait time <= 120s starvation rule',
      passed: maxTtcWait <= settings.ttcStarvationTimeoutSec,
      detail:
        `TT&C max wait was ${maxTtcWait}s ` +
        `(limit ${settings.ttcStarvationTimeoutSec}s)` +
        (blockedTransmissions > 0
          ? `; ${blockedTransmissions} transmission attempt(s) were blocked by the battery reserve`
          : '')
    },
    {
      rule: 'SSTV low-battery restriction',
      name: 'SSTV not selected below battery threshold',
      passed: !sstvBelowThreshold,
      detail: sstvBelowThreshold
        ? `SSTV was selected below ${settings.batteryThresholdLow}% battery`
        : `SSTV was never selected below ${settings.batteryThresholdLow}% battery`
    },
    {
      rule: 'Poor-link TT&C restriction',
      name: 'Only TT&C sent when link quality < 20%',
      passed: !nonTtcDuringPoorLink,
      detail: nonTtcDuringPoorLink
        ? 'A non-TT&C payload was transmitted during poor link quality'
        : 'No non-TT&C payload was transmitted whenever link quality was below 20%'
    },
    {
      rule: 'Battery reserve',
      name: 'Battery never drops below 5%',
      passed: belowFiveAtTick === null,
      detail: belowFiveAtTick === null
        ? `Battery stayed at or above 5%; final battery ${Math.max(0, battery).toFixed(1)}%`
        : `Battery dropped below 5% at tick ${belowFiveAtTick}`
    }
  ];

  const passedCount = rulesChecked.filter(rule => rule.passed).length;
  const passRate = Math.round(
    (passedCount / rulesChecked.length) * 100
  );

  const runAt = new Date();

  const result = {
    runId: `RUN-${Date.now()}`,
    scenarioId: scenario.scenarioId,
    scenarioName: scenario.name,
    versionLabel: 'v1.4.0',
    passRate,
    scorePercentage: passRate,
    status: passedCount === rulesChecked.length ? 'PASSED' : 'FAILED',
    rulesChecked: rulesChecked.map(rule => ({
      name: rule.name,
      status: rule.passed ? 'PASS' : 'FAIL',
      details: rule.detail
    })),
    results: rulesChecked.map(({ rule, passed, detail }) => ({
      rule,
      passed,
      detail
    })),
    date: runAt.toISOString(),
    runAt: runAt.toISOString()
  };

  if (connected()) {
    await ValidationRun.create({
      runId: result.runId,
      scenarioId: String(scenario._id || scenario.scenarioId),
      versionLabel: result.versionLabel,
      passRate,
      date: result.date,
      results: result.results
    });
  } else {
    memoryRuns.unshift({
      run: result.versionLabel,
      ...result
    });
  }

  return result;
}

async function getValidationRuns() {
  if (!connected()) {
    return memoryRuns;
  }

  return ValidationRun.find().sort({ createdAt: -1 }).lean();
}

module.exports = {
  getScenarios,
  getValidationRuns,
  addScenario,
  updateScenario,
  deleteScenario,
  runScenario
};
