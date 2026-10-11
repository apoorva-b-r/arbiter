/**
 * AI Priority Router Service for Arbiter Ground Station
 * Decides payload transmission schedules during active ground passes
 */

const DEFAULT_SETTINGS = {
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

let currentSettings = { ...DEFAULT_SETTINGS };

function getSettings() {
  return currentSettings;
}

function updateSettings(newSettings) {
  currentSettings = {
    ...currentSettings,
    ...newSettings,
    baseWeights: {
      ...currentSettings.baseWeights,
      ...(newSettings.baseWeights || {})
    }
  };

  return currentSettings;
}

/**
 * Calculates the priority score for a single queue item.
 */
function calculateScore(item, telemetry) {
  const baseWeight = currentSettings.baseWeights[item.type] || 30;
  const waitBonus = item.waitTimeSec * 1.5;
  const linkBonus = (telemetry.linkQuality || 80) * 0.8;

  let score = baseWeight + waitBonus + linkBonus;

  // Retain a penalty as an additional preference,
  // although makeDecision also enforces a hard SSTV restriction.
  if (
    telemetry.battery < currentSettings.batteryThresholdLow &&
    item.type === 'SSTV'
  ) {
    score -= 150;
  }

  return Math.round(score);
}

/**
 * Core AI Router Decision Engine.
 * Selects the next payload item and generates plain-English reasoning.
 */
function makeDecision(queueItems, telemetry) {
  if (!queueItems || queueItems.length === 0) {
    return {
      selectedType: 'TTC',
      reasoning:
        'Queue empty. Defaulting to periodic TT&C telemetry beacon ping.',
      isOverridden: false,
      score: 100
    };
  }

  // Safety override: prevent TT&C from exceeding its starvation timeout.
  const starvedTtc = queueItems.find(
    item =>
      item.type === 'TTC' &&
      item.waitTimeSec >= currentSettings.ttcStarvationTimeoutSec
  );

  if (starvedTtc) {
    const realScore = calculateScore(starvedTtc, telemetry);

    return {
      selectedType: 'TTC',
      reasoning:
        `STARVATION SAFEGUARD: TT&C has been waiting ${starvedTtc.waitTimeSec}s, ` +
        `reaching the ${currentSettings.ttcStarvationTimeoutSec}s starvation limit. ` +
        'Priority is forced to protect critical telemetry.',
      isOverridden: false,
      score: realScore,
      selectedItemId: starvedTtc.id || starvedTtc.itemId
    };
  }

  // Hard safety constraint: only TT&C is eligible when link quality is below 20%.
  if (telemetry.linkQuality < 20) {
    const ttc = queueItems.find(item => item.type === 'TTC');

    if (ttc) {
      return {
        selectedType: 'TTC',
        reasoning:
          `LINK QUALITY SAFEGUARD: Link quality is ${telemetry.linkQuality}%, ` +
          'below 20%. Only TT&C is eligible for transmission.',
        isOverridden: false,
        score: calculateScore(ttc, telemetry),
        selectedItemId: ttc.id || ttc.itemId
      };
    }
  }

  // Hard safety constraint: exclude SSTV when battery is below the threshold.
  const sstvBlocked =
    telemetry.battery < currentSettings.batteryThresholdLow;

  const eligibleItems = queueItems.filter(
    item => !(sstvBlocked && item.type === 'SSTV')
  );

  // Defensive fallback if no eligible items remain.
  if (eligibleItems.length === 0) {
    const ttc = queueItems.find(item => item.type === 'TTC');

    return {
      selectedType: 'TTC',
      reasoning:
        'BATTERY SAFEGUARD: SSTV is blocked by the low-battery restriction. ' +
        'Defaulting to TT&C.',
      isOverridden: false,
      score: ttc ? calculateScore(ttc, telemetry) : 100,
      selectedItemId: ttc ? (ttc.id || ttc.itemId) : undefined
    };
  }

  // Score and rank only eligible candidates.
  const scoredItems = eligibleItems
    .map(item => ({
      ...item,
      score: calculateScore(item, telemetry)
    }))
    .sort((a, b) => b.score - a.score);

  const topChoice = scoredItems[0];

  // Construct plain-English reasoning.
  let reasoning =
    `${topChoice.type} selected: Priority score ${topChoice.score} ` +
    'exceeded other eligible candidates. ';

  if (sstvBlocked) {
    reasoning +=
      'SSTV was excluded because battery is below the safety threshold. ';
  }

  if (topChoice.type === 'TTC') {
    reasoning +=
      `High base priority weight (${currentSettings.baseWeights.TTC}) ` +
      'supports critical satellite health telemetry.';
  } else if (topChoice.type === 'SSTV') {
    reasoning +=
      `Link quality (${telemetry.linkQuality}%) allows transfer of ` +
      `${topChoice.sizeKb}KB Earth imaging frame.`;
  } else {
    reasoning +=
      `Wait time (${topChoice.waitTimeSec}s) contributed to its priority score.`;
  }

  return {
    selectedType: topChoice.type,
    reasoning,
    isOverridden: false,
    score: topChoice.score,
    selectedItemId: topChoice.id || topChoice.itemId
  };
}

module.exports = {
  getSettings,
  updateSettings,
  calculateScore,
  makeDecision
};
