const express = require('express');
const router = express.Router();
const simulator = require('../services/simulator');

router.get('/', async (req, res) => {
  try {
    return res.status(200).json(simulator.getQueue());
  } catch (err) {
    console.error('Error fetching transmission queue:', err);
    return res.status(500).json({ error: 'Failed to fetch queue.' });
  }
});

module.exports = router;
