const express = require('express');
const router = express.Router();
const simulator = require('../services/simulator');
const Pass = require('../models/Pass');
const Decision = require('../models/Decision');
const { isDbConnected } = require('../db');

// GET /api/passes -> read from MongoDB (sorted newest first, last 30 days) if connected, else in-memory
router.get('/', async (req, res) => {
  try {
    if (isDbConnected()) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateCutoffStr = thirtyDaysAgo.toISOString().slice(0, 10);

      const dbPasses = await Pass.find({
        $or: [
          { date: { $gte: dateCutoffStr } },
          { createdAt: { $gte: thirtyDaysAgo } }
        ]
      }).sort({ date: -1, startTime: -1, _id: -1 }).lean();

      if (dbPasses && dbPasses.length > 0) {
        const populatedPasses = await Promise.all(
          dbPasses.map(async p => {
            const decisions = await Decision.find({ passId: p.passId }).sort({ timestamp: -1, _id: -1 }).lean();
            return {
              ...p,
              id: p.passId,
              decisions: decisions.map(d => ({ ...d, id: d.decisionId || d._id }))
            };
          })
        );
        return res.status(200).json(populatedPasses);
      }
    }

    return res.status(200).json(simulator.getPasses());
  } catch (err) {
    console.error('Error fetching passes:', err);
    return res.status(500).json({ error: 'Failed to fetch pass history.' });
  }
});

// GET /api/passes/:passId -> one pass plus its decisions
router.get('/:passId', async (req, res) => {
  try {
    const { passId } = req.params;

    if (isDbConnected()) {
      const pass = await Pass.findOne({ passId }).lean();
      if (pass) {
        const decisions = await Decision.find({ passId }).sort({ timestamp: -1, _id: -1 }).lean();
        return res.status(200).json({
          ...pass,
          id: pass.passId,
          decisions: decisions.map(d => ({ ...d, id: d.decisionId || d._id }))
        });
      }
    }

    const inMemPass = simulator.getPasses().find(p => p.passId === passId);
    if (inMemPass) {
      return res.status(200).json(inMemPass);
    }

    return res.status(404).json({ error: 'Pass not found.' });
  } catch (err) {
    console.error('Error fetching single pass:', err);
    return res.status(500).json({ error: 'Failed to fetch pass details.' });
  }
});

// DELETE /api/passes/:passId -> delete a pass and its decisions
router.delete('/:passId', async (req, res) => {
  try {
    const { passId } = req.params;

    if (isDbConnected()) {
      await Pass.deleteOne({ passId });
      await Decision.deleteMany({ passId });
    }

    simulator.deletePass(passId);

    return res.status(200).json({ success: true, message: `Pass ${passId} deleted successfully.` });
  } catch (err) {
    console.error('Error deleting pass:', err);
    return res.status(500).json({ error: 'Failed to delete pass.' });
  }
});

// PATCH /api/passes/:passId/notes -> update operator notes
router.patch('/:passId/notes', async (req, res) => {
  try {
    const { passId } = req.params;
    const { notes } = req.body;

    const notesStr = notes !== undefined && notes !== null ? String(notes) : '';

    if (notesStr.length > 500) {
      return res.status(400).json({ error: 'Operator notes cannot exceed 500 characters.' });
    }

    let updatedPass = null;

    if (isDbConnected()) {
      updatedPass = await Pass.findOneAndUpdate(
        { passId },
        { $set: { operatorNotes: notesStr } },
        { new: true }
      ).lean();
    }

    const inMemPass = simulator.getPasses().find(p => p.passId === passId);
    if (inMemPass) {
      inMemPass.operatorNotes = notesStr;
      if (!updatedPass) {
        updatedPass = inMemPass;
      }
    }

    if (!updatedPass) {
      return res.status(404).json({ error: 'Pass not found.' });
    }

    return res.status(200).json({
      ...updatedPass,
      id: updatedPass.passId
    });
  } catch (err) {
    console.error('Error updating pass notes:', err);
    return res.status(500).json({ error: 'Failed to update pass notes.' });
  }
});

module.exports = router;
