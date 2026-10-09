const express = require('express');
const router = express.Router();
const simulator = require('../services/simulator');

router.get('/latest', async (req, res) => {
  try {
    return res.status(200).json(simulator.getTelemetry());
  } catch (err) {
    console.error('Error fetching latest telemetry:', err);
    return res.status(500).json({ error: 'Failed to fetch telemetry.' });
  }
});

router.get('/history', async (req, res) => {
  try {
    return res.status(200).json(simulator.getTelemetryHistory());
  } catch (err) {
    console.error('Error fetching telemetry history:', err);
    return res.status(500).json({ error: 'Failed to fetch telemetry history.' });
  }
});

module.exports = router;
