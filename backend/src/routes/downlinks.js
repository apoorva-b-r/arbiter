const express = require('express');
const router = express.Router();
const simulator = require('../services/simulator');
const Downlink = require('../models/Downlink');
const { isDbConnected } = require('../db');

// GET /api/downlinks?type=&status=&passId=&limit=50
router.get('/', async (req, res) => {
  try {
    const { type, status, passId, limit } = req.query;
    const maxLimit = limit ? parseInt(limit, 10) : 50;

    if (isDbConnected()) {
      const filter = {};
      if (type) filter.type = type;
      if (status) filter.status = status;
      if (passId) filter.passId = passId;

      const dbDownlinks = await Downlink.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .limit(maxLimit)
        .lean();

      if (dbDownlinks.length > 0 || type || status || passId) {
        return res.status(200).json(
          dbDownlinks.map(d => ({ ...d, id: d.downlinkId || d._id }))
        );
      }
    }

    let inMem = simulator.getDownlinks();
    if (type) inMem = inMem.filter(d => d.type === type);
    if (status) inMem = inMem.filter(d => d.status === status);
    if (passId) inMem = inMem.filter(d => d.passId === passId);

    inMem.sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA;
    });

    inMem = inMem.slice(0, maxLimit);

    return res.status(200).json(
      inMem.map(d => ({ ...d, id: d.downlinkId || d.id || d._id }))
    );
  } catch (err) {
    console.error('Error fetching downlinks:', err);
    return res.status(500).json({ error: 'Failed to fetch downlinks.' });
  }
});

// GET /api/downlinks/stats?passId=
router.get('/stats', async (req, res) => {
  try {
    const { passId } = req.query;

    if (isDbConnected()) {
      const filter = {};
      if (passId) filter.passId = passId;

      const [total, received, partial, lost] = await Promise.all([
        Downlink.countDocuments(filter),
        Downlink.countDocuments({ ...filter, status: 'RECEIVED' }),
        Downlink.countDocuments({ ...filter, status: 'PARTIAL' }),
        Downlink.countDocuments({ ...filter, status: 'LOST' })
      ]);

      if (total > 0 || passId) {
        const successRate = total > 0 ? Math.round((received / total) * 100) : 0;
        return res.status(200).json({
          total,
          received,
          partial,
          lost,
          successRate
        });
      }
    }

    let inMem = simulator.getDownlinks();
    if (passId) {
      inMem = inMem.filter(d => d.passId === passId);
    }

    const total = inMem.length;
    const received = inMem.filter(d => d.status === 'RECEIVED').length;
    const partial = inMem.filter(d => d.status === 'PARTIAL').length;
    const lost = inMem.filter(d => d.status === 'LOST').length;
    const successRate = total > 0 ? Math.round((received / total) * 100) : 0;

    return res.status(200).json({
      total,
      received,
      partial,
      lost,
      successRate
    });
  } catch (err) {
    console.error('Error fetching downlink stats:', err);
    return res.status(500).json({ error: 'Failed to fetch downlink stats.' });
  }
});

// GET /api/downlinks/by-decision/:decisionId
router.get('/by-decision/:decisionId', async (req, res) => {
  try {
    const { decisionId } = req.params;

    if (isDbConnected()) {
      const doc = await Downlink.findOne({ decisionId }).lean();
      if (doc) {
        return res.status(200).json({ ...doc, id: doc.downlinkId || doc._id });
      }
    }

    const inMem = simulator.getDownlinks().find(d => d.decisionId === decisionId);
    if (inMem) {
      return res.status(200).json({ ...inMem, id: inMem.downlinkId || inMem.id });
    }

    return res.status(404).json({ error: 'Downlink for decision not found.' });
  } catch (err) {
    console.error('Error fetching downlink by decisionId:', err);
    return res.status(500).json({ error: 'Failed to fetch downlink by decisionId.' });
  }
});

// GET /api/downlinks/:downlinkId
router.get('/:downlinkId', async (req, res) => {
  try {
    const { downlinkId } = req.params;

    if (isDbConnected()) {
      const doc = await Downlink.findOne({ downlinkId }).lean();
      if (doc) {
        return res.status(200).json({ ...doc, id: doc.downlinkId || doc._id });
      }
    }

    const inMem = simulator.getDownlinks().find(
      d => d.downlinkId === downlinkId || d.id === downlinkId
    );
    if (inMem) {
      return res.status(200).json({ ...inMem, id: inMem.downlinkId || inMem.id });
    }

    return res.status(404).json({ error: 'Downlink not found.' });
  } catch (err) {
    console.error('Error fetching single downlink:', err);
    return res.status(500).json({ error: 'Failed to fetch downlink details.' });
  }
});

module.exports = router;
