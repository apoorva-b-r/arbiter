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
 * Calculates priority score for a single queue item
 */
function calculateScore(item, telemetry) {
  const baseWeight = currentSettings.baseWeights[item.type] || 30;
  const waitBonus = item.waitTimeSec * 1.5;
  const linkBonus = (telemetry.linkQuality || 80) * 0.8;

  let score = baseWeight + waitBonus + linkBonus;

  // Penalty if battery is low and item is heavy payload (SSTV)
  if (telemetry.battery < currentSettings.batteryThresholdLow && item.type === 'SSTV') {
    score -= 150;
  }

  return Math.round(score);
}

/**
 * Core AI Router Decision Engine
 * Selects the next payload item to transmit and generates plain-English reasoning
 */
function makeDecision(queueItems, telemetry) {
  if (!queueItems || queueItems.length === 0) {
    return {
      selectedType: 'TTC',
      reasoning: 'Queue empty. Defaulting to periodic TT&C telemetry beacon ping.',
      isOverridden: false,
      score: 100
    };
  }

  // Check Safety Fallback Constraint: TT&C wait time > starvation timeout (120s)
  const starvedTtc = queueItems.find(
    item => item.type === 'TTC' && item.waitTimeSec >= currentSettings.ttcStarvationTimeoutSec
  );

  if (starvedTtc) {
    return {
      selectedType: 'TTC',
      reasoning: `SAFETY OVERRIDE TRIGGERED: TT&C beacon has been waiting ${starvedTtc.waitTimeSec}s, exceeding the ${currentSettings.ttcStarvationTimeoutSec}s starvation limit. Priority forced regardless of candidate scores.`,
      isOverridden: false,
      score: 999
    };
  }

  // Score all candidate queue items
  const scoredItems = queueItems.map(item => ({
    ...item,
    score: calculateScore(item, telemetry)
  })).sort((a, b) => b.score - a.score);

  const topChoice = scoredItems[0];

  // Construct plain-English reasoning
  let reasoning = `${topChoice.type} selected: Priority score ${topChoice.score} exceeded other candidates. `;
  if (topChoice.type === 'TTC') {
    reasoning += `High base priority weight (${currentSettings.baseWeights.TTC}) enforced for critical satellite health telemetry.`;
  } else if (topChoice.type === 'SSTV') {
    reasoning += `Strong link quality (${telemetry.linkQuality}%) allows efficient transfer of ${topChoice.sizeKb}KB Earth imaging frame.`;
  } else {
    reasoning += `Wait time (${topChoice.waitTimeSec}s) accumulated sufficient priority score boost (+${Math.round(topChoice.waitTimeSec * 1.5)}).`;
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
