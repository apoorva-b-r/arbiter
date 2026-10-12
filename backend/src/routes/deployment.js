const express = require('express');
const router = express.Router();
const deploymentMachine = require('../services/deploymentMachine');
const DeploymentRun = require('../models/DeploymentRun');
const DeploymentEvent = require('../models/DeploymentEvent');
const Pass = require('../models/Pass');
const { isDbConnected } = require('../db');

// --- Backward-Compatible Existing In-Memory State Endpoints ---

router.get('/', async (req, res) => {
  try {
    return res.status(200).json(deploymentMachine.getState());
  } catch (err) {
    console.error('Error fetching deployment state:', err);
    return res.status(500).json({ error: 'Failed to fetch deployment state.' });
  }
});

router.post('/transition', async (req, res) => {
  try {
    const { nextStateIndex } = req.body;
    if (nextStateIndex === undefined || nextStateIndex === null) {
      return res.status(400).json({ error: 'Missing nextStateIndex in payload.' });
    }
    const updated = deploymentMachine.transitionState(nextStateIndex);
    return res.status(200).json(updated);
  } catch (err) {
    console.error('Error transitioning deployment state:', err);
    return res.status(500).json({ error: 'Failed to transition deployment state.' });
  }
});

router.post('/contingency/trigger', async (req, res) => {
  try {
    const { reason } = req.body;
    const updated = deploymentMachine.triggerContingency(reason);
    return res.status(200).json(updated);
  } catch (err) {
    console.error('Error triggering contingency:', err);
    return res.status(500).json({ error: 'Failed to trigger contingency.' });
  }
});

router.post('/contingency/resolve', async (req, res) => {
  try {
    const { action } = req.body;
    if (!action) {
      return res.status(400).json({ error: 'Missing action in payload.' });
    }
    const updated = deploymentMachine.resolveContingency(action);
    return res.status(200).json(updated);
  } catch (err) {
    console.error('Error resolving contingency:', err);
    return res.status(500).json({ error: 'Failed to resolve contingency.' });
  }
});

// --- Persistent Deployment Runs & Pass-Linked Audit Trail Endpoints ---

// POST /api/deployment/runs -> Create new deployment run linked to active pass
router.post('/runs', async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ error: 'MongoDB connection offline. Persistent run cannot be created.' });
    }

    let { passId, mode } = req.body;

    // Resolve passId: if not supplied, look for active pass
    if (!passId) {
      const activePass = await Pass.findOne({ status: 'ACTIVE' }).lean();
      if (activePass) {
        passId = activePass.passId;
      } else {
        const latestPass = await Pass.findOne().sort({ createdAt: -1, _id: -1 }).lean();
        passId = latestPass ? latestPass.passId : 'UNASSIGNED';
      }
    } else if (passId !== 'UNASSIGNED') {
      const passDoc = await Pass.findOne({ passId }).lean();
      if (!passDoc) {
        return res.status(400).json({ error: `Referenced pass '${passId}' does not exist in the database.` });
      }
    }

    const runId = `RUN-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    const newRun = await DeploymentRun.create({
      runId,
      passId,
      currentState: 'STOWED',
      status: 'IN_PROGRESS',
      mode: mode === 'CONTINGENCY_SIMULATION' ? 'CONTINGENCY_SIMULATION' : 'NORMAL',
      startTime: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create initial SEQUENCE_STARTED event
    const eventId = `EVT-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    const nowStr = new Date().toTimeString().substring(0, 8) + ' UTC';
    const initialEvent = await DeploymentEvent.create({
      eventId,
      deploymentRunId: runId,
      passId,
      eventType: 'SEQUENCE_STARTED',
      sourceState: null,
      destinationState: 'STOWED',
      state: 'STOWED',
      message: mode === 'CONTINGENCY_SIMULATION'
        ? 'Deployment handover contingency simulation sequence started.'
        : 'Deployment handover launch sequence started.',
      logType: 'info',
      metadata: { mode: newRun.mode },
      timestamp: nowStr,
      createdAt: new Date()
    });

    return res.status(201).json({
      success: true,
      run: newRun,
      event: initialEvent
    });
  } catch (err) {
    console.error('Error creating deployment run:', err);
    return res.status(500).json({ error: 'Failed to create deployment run: ' + err.message });
  }
});

// GET /api/deployment/runs -> List runs, optionally filtered by passId
router.get('/runs', async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(200).json([]);
    }

    const { passId, limit } = req.query;
    const filter = {};
    if (passId) filter.passId = passId;

    const queryLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const runs = await DeploymentRun.find(filter)
      .sort({ createdAt: -1 })
      .limit(queryLimit)
      .lean();

    return res.status(200).json(runs);
  } catch (err) {
    console.error('Error fetching deployment runs:', err);
    return res.status(500).json({ error: 'Failed to fetch deployment runs.' });
  }
});

// GET /api/deployment/runs/:runId -> Get single run with chronological events
router.get('/runs/:runId', async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ error: 'MongoDB connection offline.' });
    }

    const { runId } = req.params;
    const run = await DeploymentRun.findOne({ runId }).lean();
    if (!run) {
      return res.status(404).json({ error: `Deployment run '${runId}' not found.` });
    }

    const events = await DeploymentEvent.find({ deploymentRunId: runId })
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({ run, events });
  } catch (err) {
    console.error('Error fetching deployment run details:', err);
    return res.status(500).json({ error: 'Failed to fetch run details.' });
  }
});

// PATCH /api/deployment/runs/:runId -> Update run state / status
router.patch('/runs/:runId', async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ error: 'MongoDB connection offline.' });
    }

    const { runId } = req.params;
    const { currentState, status, completionTime } = req.body;

    const updates = { updatedAt: new Date() };
    if (currentState) updates.currentState = currentState;
    if (status) updates.status = status;
    if (completionTime) updates.completionTime = completionTime;
    if (status === 'COMPLETED' && !completionTime) updates.completionTime = new Date();

    const updatedRun = await DeploymentRun.findOneAndUpdate(
      { runId },
      { $set: updates },
      { new: true }
    ).lean();

    if (!updatedRun) {
      return res.status(404).json({ error: `Deployment run '${runId}' not found.` });
    }

    return res.status(200).json(updatedRun);
  } catch (err) {
    console.error('Error updating deployment run:', err);
    return res.status(500).json({ error: 'Failed to update deployment run.' });
  }
});

// POST /api/deployment/runs/:runId/events -> Append immutable deployment event
router.post('/runs/:runId/events', async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ error: 'MongoDB connection offline. Event cannot be recorded.' });
    }

    const { runId } = req.params;
    const run = await DeploymentRun.findOne({ runId });
    if (!run) {
      return res.status(404).json({ error: `Deployment run '${runId}' not found.` });
    }

    const {
      eventType,
      sourceState,
      destinationState,
      state,
      message,
      logType,
      metadata,
      timestamp
    } = req.body;

    if (!eventType || !message || !state) {
      return res.status(400).json({ error: 'Missing required fields: eventType, message, and state are required.' });
    }

    const eventId = `EVT-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    const nowStr = timestamp || (new Date().toTimeString().substring(0, 8) + ' UTC');

    const newEvent = await DeploymentEvent.create({
      eventId,
      deploymentRunId: run.runId,
      passId: run.passId,
      eventType,
      sourceState: sourceState || null,
      destinationState: destinationState || null,
      state,
      message,
      logType: logType || 'info',
      metadata: metadata || {},
      timestamp: nowStr,
      createdAt: new Date()
    });

    // Synchronize run state
    const runUpdates = { updatedAt: new Date() };
    if (destinationState) {
      runUpdates.currentState = destinationState;
    } else if (state) {
      runUpdates.currentState = state;
    }

    if (eventType === 'OPERATIONAL_HANDOVER' || destinationState === 'OPERATIONAL') {
      runUpdates.status = 'COMPLETED';
      runUpdates.completionTime = new Date();
    } else if (eventType === 'CONTINGENCY_ACTIVATED') {
      runUpdates.status = 'CONTINGENCY';
    } else if (eventType === 'CONTINGENCY_RESOLVED') {
      runUpdates.status = 'RESOLVED';
    }

    await DeploymentRun.updateOne({ runId: run.runId }, { $set: runUpdates });

    return res.status(201).json(newEvent);
  } catch (err) {
    console.error('Error appending deployment event:', err);
    return res.status(500).json({ error: 'Failed to record deployment event: ' + err.message });
  }
});

// GET /api/deployment/events -> Retrieve events chronologically, filterable by passId or runId
router.get('/events', async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(200).json([]);
    }

    const { passId, runId, limit } = req.query;
    const filter = {};
    if (passId) filter.passId = passId;
    if (runId) filter.deploymentRunId = runId;

    const queryLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 100));
    const events = await DeploymentEvent.find(filter)
      .sort({ createdAt: 1 })
      .limit(queryLimit)
      .lean();

    return res.status(200).json(events);
  } catch (err) {
    console.error('Error fetching deployment events:', err);
    return res.status(500).json({ error: 'Failed to fetch deployment events.' });
  }
});

module.exports = router;
