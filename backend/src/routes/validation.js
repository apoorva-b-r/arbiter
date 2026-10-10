const express = require('express');
const router = express.Router();
const validator = require('../services/validator');

function validateScenario(body) {
  const errors = [];

  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    errors.push('Name is required');
  }

  if (
    !body.description ||
    typeof body.description !== 'string' ||
    !body.description.trim()
  ) {
    errors.push('Description is required');
  }

  if (
    typeof body.initialBattery !== 'number' ||
    !Number.isFinite(body.initialBattery) ||
    body.initialBattery < 0 ||
    body.initialBattery > 100
  ) {
    errors.push('initialBattery must be a number between 0 and 100');
  }

  if (
    !body.linkProfile ||
    typeof body.linkProfile !== 'string' ||
    !body.linkProfile.trim()
  ) {
    errors.push('linkProfile is required');
  }

  return errors;
}

router.get('/scenarios', async (req, res, next) => {
  try {
    res.json(await validator.getScenarios());
  } catch (error) {
    next(error);
  }
});

router.post('/scenarios', async (req, res, next) => {
  try {
    const errors = validateScenario(req.body || {});
    if (errors.length) return res.status(400).json({ errors });

    const scenario = await validator.addScenario(req.body);
    return res.status(201).json({ success: true, scenario });
  } catch (error) {
    next(error);
  }
});

router.put('/scenarios/:id', async (req, res, next) => {
  try {
    const errors = validateScenario(req.body || {});
    if (errors.length) return res.status(400).json({ errors });

    const scenario = await validator.updateScenario(req.params.id, req.body);
    if (!scenario) return res.status(404).json({ error: 'Scenario not found' });

    return res.json({ success: true, scenario });
  } catch (error) {
    next(error);
  }
});

router.delete('/scenarios/:id', async (req, res, next) => {
  try {
    const deleted = await validator.deleteScenario(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Scenario not found' });

    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/run/:id', async (req, res, next) => {
  try {
    const result = await validator.runScenario(req.params.id);
    if (!result) return res.status(404).json({ error: 'Scenario not found' });

    return res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/runs', async (req, res, next) => {
  try {
    res.json(await validator.getValidationRuns());
  } catch (error) {
    next(error);
  }
});

module.exports = router;