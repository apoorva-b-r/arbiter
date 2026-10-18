const MissionState = require('../models/MissionState');
const { isDbConnected } = require('../db');

const VALID_PHASES = ['PRE_DEPLOYMENT', 'COMMISSIONING', 'OPERATIONAL', 'CONTACT_LOST'];

// In-memory mission state singleton
let currentMissionState = {
  key: 'active',
  phase: 'PRE_DEPLOYMENT',
  deploymentRunId: null,
  updatedAt: new Date(),
  history: [
    {
      phase: 'PRE_DEPLOYMENT',
      at: new Date(),
      reason: 'Initial ground station initialization'
    }
  ]
};

/**
 * Loads the active mission state from MongoDB into memory.
 * If no document exists, creates an initial record.
 */
async function loadFromDb() {
  if (!isDbConnected()) {
    console.warn('[MISSION] MongoDB not connected; maintaining in-memory mission state.');
    return currentMissionState;
  }

  try {
    let doc = await MissionState.findOne({ key: 'active' });
    if (!doc) {
      doc = await MissionState.create({
        key: 'active',
        phase: 'PRE_DEPLOYMENT',
        deploymentRunId: null,
        updatedAt: new Date(),
        history: [
          {
            phase: 'PRE_DEPLOYMENT',
            at: new Date(),
            reason: 'Initial mission state record created'
          }
        ]
      });
      console.log('[MISSION] Initialized new persistent MissionState in MongoDB with phase PRE_DEPLOYMENT');
    }

    currentMissionState = {
      key: doc.key,
      phase: doc.phase,
      deploymentRunId: doc.deploymentRunId || null,
      updatedAt: doc.updatedAt || new Date(),
      history: Array.isArray(doc.history) ? doc.history.map(h => ({
        phase: h.phase,
        at: h.at,
        reason: h.reason
      })) : []
    };

    console.log(`[MISSION] Synchronized mission phase from MongoDB: ${currentMissionState.phase}`);
    return currentMissionState;
  } catch (err) {
    console.error('[MISSION ERROR] Failed to load mission state from MongoDB:', err.message);
    return currentMissionState;
  }
}

/**
 * Returns current mission phase string
 */
function getPhase() {
  return currentMissionState.phase;
}

/**
 * Returns true if mission phase is OPERATIONAL and authoritative state is available
 */
function isOperational() {
  if (!currentMissionState || currentMissionState.phase !== 'OPERATIONAL') {
    return false;
  }
  // Production strictly fails closed: database connectivity is mandatory to authorize protected dispatches
  if (process.env.NODE_ENV === 'production' && !isDbConnected()) {
    return false;
  }
  // In non-production: if database is disconnected, fail closed unless offline dev auth is explicitly enabled
  if (!isDbConnected() && process.env.ENABLE_OFFLINE_DEV_AUTH !== 'true') {
    return false;
  }
  return true;
}

/**
 * Returns full state snapshot
 */
function getState() {
  return {
    phase: currentMissionState.phase,
    deploymentRunId: currentMissionState.deploymentRunId,
    updatedAt: currentMissionState.updatedAt,
    history: currentMissionState.history
  };
}

/**
 * Updates mission phase in memory and upserts in MongoDB.
 * Fails closed if database persistence fails.
 * @param {string} phase - One of VALID_PHASES
 * @param {string} [reason] - Description of transition
 * @param {string} [deploymentRunId] - Associated deployment run ID
 */
async function setPhase(phase, reason = '', deploymentRunId = null) {
  if (!VALID_PHASES.includes(phase)) {
    const err = new Error(`Invalid mission phase: "${phase}". Allowed: ${VALID_PHASES.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const now = new Date();
  const entry = {
    phase,
    at: now,
    reason: reason || `Transition to ${phase}`
  };

  // Enforce database persistence: if DB is disconnected, reject mutation unless explicit offline dev auth
  if (!isDbConnected()) {
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_OFFLINE_DEV_AUTH !== 'true') {
      const dbErr = new Error('Database offline. Mission phase mutation cannot be persisted.');
      dbErr.status = 503;
      throw dbErr;
    }
  } else {
    // Database is connected: persist to MongoDB FIRST.
    // If updateOne fails, error is thrown, leaving in-memory state unmutated.
    const updateData = {
      $set: {
        phase,
        deploymentRunId: deploymentRunId !== undefined && deploymentRunId !== null ? deploymentRunId : currentMissionState.deploymentRunId,
        updatedAt: now
      },
      $push: {
        history: {
          $each: [entry],
          $position: 0,
          $slice: 50
        }
      }
    };

    await MissionState.updateOne({ key: 'active' }, updateData, { upsert: true });
  }

  // Database write succeeded (or explicit offline dev mode active): commit to memory
  currentMissionState.phase = phase;
  if (deploymentRunId !== undefined && deploymentRunId !== null) {
    currentMissionState.deploymentRunId = deploymentRunId;
  }
  currentMissionState.updatedAt = now;
  currentMissionState.history.unshift(entry);
  if (currentMissionState.history.length > 50) {
    currentMissionState.history = currentMissionState.history.slice(0, 50);
  }

  return getState();
}

/**
 * Resets mission back to PRE_DEPLOYMENT for new deployment run
 */
async function resetMission() {
  return await setPhase('PRE_DEPLOYMENT', 'Mission reset for new deployment', null);
}

module.exports = {
  loadFromDb,
  getPhase,
  isOperational,
  getState,
  setPhase,
  resetMission,
  VALID_PHASES
};
