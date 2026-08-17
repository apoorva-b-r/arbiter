const express = require('express');
const router = express.Router();
const validator = require('../services/validator');

router.get('/scenarios', (req, res) => {
  res.json(validator.getScenarios());
});

router.post('/scenarios', (req, res) => {
  const newScen = validator.addScenario(req.body);
  res.json({ success: true, scenario: newScen });
});

router.post('/run/:id', (req, res) => {
  const result = validator.runScenario(req.params.id);
  res.json(result);
});

router.get('/runs', (req, res) => {
  res.json(validator.getValidationRuns());
});

module.exports = router;
