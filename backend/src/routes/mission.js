const express = require('express');
const router = express.Router();
const mission = require('../services/mission');

/**
 * GET /api/mission
 * Returns current mission phase, timestamp, and recent history (up to 10 entries)
 */
router.get('/', (req, res, next) => {
  try {
    const state = mission.getState();
    const historySample = Array.isArray(state.history) ? state.history.slice(0, 10) : [];
    return res.json({
      phase: state.phase,
      deploymentRunId: state.deploymentRunId,
      updatedAt: state.updatedAt,
      history: historySample
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/mission/phase
 * Body: { phase, reason, deploymentRunId }
 * Updates current mission phase
 */
router.put('/phase', async (req, res, next) => {
  try {
    const { phase, reason, deploymentRunId } = req.body || {};

    if (!phase || typeof phase !== 'string' || !mission.VALID_PHASES.includes(phase)) {
      return res.status(400).json({
        error: `Invalid mission phase: "${phase}". Allowed values: ${mission.VALID_PHASES.join(', ')}`
      });
    }

    const updatedState = await mission.setPhase(phase, reason, deploymentRunId);
    return res.json({
      phase: updatedState.phase,
      deploymentRunId: updatedState.deploymentRunId,
      updatedAt: updatedState.updatedAt,
      history: updatedState.history.slice(0, 10)
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/mission/reset
 * Resets mission phase to PRE_DEPLOYMENT for new deployment demonstration
 */
router.post('/reset', async (req, res, next) => {
  try {
    const resetState = await mission.resetMission();
    return res.json({
      message: 'Mission reset successfully',
      phase: resetState.phase,
      updatedAt: resetState.updatedAt,
      history: resetState.history.slice(0, 10)
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
