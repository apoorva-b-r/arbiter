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
      const year = thirtyDaysAgo.getFullYear();
      const month = String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0');
      const day = String(thirtyDaysAgo.getDate()).padStart(2, '0');
      const dateCutoffStr = `${year}-${month}-${day}`;

      const dbPasses = await Pass.find({
        $or: [
          { status: 'ACTIVE' },
          { date: { $gte: dateCutoffStr } },
          { createdAt: { $gte: thirtyDaysAgo } }
        ]
      }).lean();

      if (dbPasses && dbPasses.length > 0) {
        dbPasses.sort((a, b) => {
          if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
          if (b.status === 'ACTIVE' && a.status !== 'ACTIVE') return 1;
          const dateCmp = (b.date || '').localeCompare(a.date || '');
          if (dateCmp !== 0) return dateCmp;
          return (b.passId || b.startTime || '').localeCompare(a.passId || a.startTime || '');
        });

        const populatedPasses = await Promise.all(
          dbPasses.map(async p => {
            const decisions = await Decision.find({ passId: p.passId }).sort({ timestamp: -1, _id: -1 }).lean();

            let createdAt = p.createdAt;
            if (!createdAt && p.passId) {
              const m = p.passId.match(/^PASS-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/);
              if (m) {
                createdAt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]));
              } else if (p.date && p.startTime) {
                const cleanTime = String(p.startTime).replace(' UTC', '').trim();
                const [y, mo, d] = p.date.split('-').map(Number);
                const [h, mi, s] = cleanTime.split(':').map(Number);
                createdAt = new Date(y, mo - 1, d, h || 0, mi || 0, s || 0);
              }
            }

            return {
              ...p,
              id: p.passId,
              createdAt,
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

        let createdAt = pass.createdAt;
        if (!createdAt && pass.passId) {
          const m = pass.passId.match(/^PASS-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/);
          if (m) {
            createdAt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]));
          } else if (pass.date && pass.startTime) {
            const cleanTime = String(pass.startTime).replace(' UTC', '').trim();
            const [y, mo, d] = pass.date.split('-').map(Number);
            const [h, mi, s] = cleanTime.split(':').map(Number);
            createdAt = new Date(y, mo - 1, d, h || 0, mi || 0, s || 0);
          }
        }

        return res.status(200).json({
          ...pass,
          id: pass.passId,
          createdAt,
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

// POST /api/passes -> initiate a new pass
router.post('/', async (req, res) => {
  try {
    const newPass = await simulator.createNewPass('MANUAL');
    return res.status(201).json(newPass);
  } catch (err) {
    console.error('Error creating new pass:', err);
    return res.status(500).json({ error: 'Failed to create new pass.' });
  }
});

module.exports = router;
