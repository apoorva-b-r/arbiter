const express = require('express');
const router = express.Router();
const deploymentMachine = require('../services/deploymentMachine');

router.get('/', (req, res) => {
  res.json(deploymentMachine.getState());
});

router.post('/transition', (req, res) => {
  const { nextStateIndex } = req.body;
  const updated = deploymentMachine.transitionState(nextStateIndex);
  res.json(updated);
});

router.post('/contingency/trigger', (req, res) => {
  const { reason } = req.body;
  const updated = deploymentMachine.triggerContingency(reason);
  res.json(updated);
});

router.post('/contingency/resolve', (req, res) => {
  const { action } = req.body;
  const updated = deploymentMachine.resolveContingency(action);
  res.json(updated);
});

module.exports = router;
