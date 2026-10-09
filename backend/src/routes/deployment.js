const express = require('express');
const router = express.Router();
const deploymentMachine = require('../services/deploymentMachine');

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

module.exports = router;
