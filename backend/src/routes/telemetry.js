const express = require('express');
const router = express.Router();
const simulator = require('../services/simulator');

router.get('/latest', (req, res) => {
  res.json(simulator.getTelemetry());
});

router.get('/history', (req, res) => {
  res.json(simulator.getTelemetryHistory());
});

module.exports = router;
