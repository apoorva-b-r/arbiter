const express = require('express');
const router = express.Router();
const simulator = require('../services/simulator');

router.get('/', (req, res) => {
  res.json(simulator.getPasses());
});

module.exports = router;
