const express = require('express');
const router = express.Router();
const simulator = require('../services/simulator');

router.post('/', (req, res) => {
  const { mode } = req.body;
  if (!mode) {
    return res.status(400).json({ error: 'Missing transmission mode in payload.' });
  }

  const result = simulator.applyOverride(mode);
  res.json({
    success: true,
    mode,
    decision: result,
    message: `Operator manual override issued: ${mode}`
  });
});

module.exports = router;
