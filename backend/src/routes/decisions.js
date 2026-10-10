const express = require('express');
const router = express.Router();
const simulator = require('../services/simulator');
const Decision = require('../models/Decision');
const { isDbConnected } = require('../db');

// GET /api/decisions?passId=xxx&limit=50
router.get('/', async (req, res) => {
  try {
    const { passId, limit } = req.query;
    const maxLimit = limit ? parseInt(limit, 10) : 20;

    if (isDbConnected()) {
      const filter = {};
      if (passId) {
        filter.passId = passId;
      }
      const dbDecisions = await Decision.find(filter)
        .sort({ createdAt: -1, timestamp: -1, _id: -1 })
        .limit(maxLimit)
        .lean();

      if (dbDecisions && dbDecisions.length > 0) {
        return res.status(200).json(
          dbDecisions.map(d => ({ ...d, id: d.decisionId || d._id }))
        );
      }
    }

    let inMemDecisions = simulator.getDecisions();
    if (passId) {
      inMemDecisions = inMemDecisions.filter(d => d.passId === passId);
    }

    inMemDecisions.sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA;
    });

    inMemDecisions = inMemDecisions.slice(0, maxLimit);

    return res.status(200).json(inMemDecisions);
  } catch (err) {
    console.error('Error fetching decisions:', err);
    return res.status(500).json({ error: 'Failed to fetch decisions.' });
  }
});

module.exports = router;
