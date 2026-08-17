const express = require('express');
const router = express.Router();
const routerService = require('../services/router');

router.get('/', (req, res) => {
  res.json(routerService.getSettings());
});

router.put('/', (req, res) => {
  const updated = routerService.updateSettings(req.body);
  res.json({ success: true, settings: updated });
});

module.exports = router;
