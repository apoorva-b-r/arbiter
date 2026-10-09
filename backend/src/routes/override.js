const express = require('express');
const router = express.Router();
const simulator = require('../services/simulator');
const Decision = require('../models/Decision');
const { isDbConnected } = require('../db');

router.post('/', async (req, res) => {
  try {
    const { mode } = req.body;
    if (!mode) {
      return res.status(400).json({ error: 'Missing transmission mode in payload.' });
    }

    const result = simulator.applyOverride(mode);

    if (isDbConnected()) {
      try {
        await Decision.create({
          decisionId: result.decisionId || result.id || `DEC-${Date.now().toString().slice(-4)}`,
          timestamp: result.timestamp || new Date().toTimeString().substring(0, 8),
          selectedType: mode,
          reasoning: result.reasoning,
          isOverridden: true,
          overriddenType: mode,
          passId: result.passId || simulator.getTelemetry().currentPassId,
          score: result.score || 0
        });
      } catch (dbErr) {
        console.error('[DB ERROR] Failed to save override decision in database:', dbErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      mode,
      decision: result,
      message: `Operator manual override issued: ${mode}`
    });
  } catch (err) {
    console.error('Error applying operator override:', err);
    return res.status(500).json({ error: 'Failed to process override command.' });
  }
});

module.exports = router;
