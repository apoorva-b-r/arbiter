const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const routerService = require('../services/router');
const RouterSettings = require('../models/RouterSettings');

const DEFAULT_SETTINGS = {
  baseWeights: {
    TTC: 100,
    SSTV: 60,
    Codec2: 40,
    M17: 30
  },
  ttcStarvationTimeoutSec: 120,
  batteryThresholdLow: 30,
  linkQualityThresholdLow: 35
};

/**
 * Validates settings payload according to ARBITER rules.
 * Returns an errors object if invalid.
 */
function validateSettingsPayload(body) {
  const errors = {};

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { general: 'Payload must be a valid JSON object.' };
  }

  // Weight configuration extraction and validation
  const rawWeights = body.baseWeights || body.weights;
  if (!rawWeights || typeof rawWeights !== 'object' || Array.isArray(rawWeights)) {
    errors.baseWeights = 'Base weights configuration is required.';
  } else {
    const weightKeys = [
      { key: 'TTC', aliases: ['TTC', 'TT&C'] },
      { key: 'SSTV', aliases: ['SSTV'] },
      { key: 'Codec2', aliases: ['Codec2', 'CODE2'] },
      { key: 'M17', aliases: ['M17'] }
    ];

    weightKeys.forEach(({ key, aliases }) => {
      let val;
      for (const alias of aliases) {
        if (rawWeights[alias] !== undefined) {
          val = rawWeights[alias];
          break;
        }
      }

      if (val === undefined || val === null || val === '') {
        errors[key] = `${key} weight is required.`;
      } else {
        const num = Number(val);
        if (typeof val === 'boolean' || isNaN(num) || !isFinite(num) || num < 10 || num > 200) {
          errors[key] = `${key} weight must be a number between 10 and 200.`;
        }
      }
    });
  }

  // Timeout validation
  const rawTimeout = body.ttcStarvationTimeoutSec !== undefined 
    ? body.ttcStarvationTimeoutSec 
    : body.ttcStarvationTimeout;

  if (rawTimeout === undefined || rawTimeout === null || rawTimeout === '') {
    errors.ttcStarvationTimeoutSec = 'TT&C starvation timeout is required.';
  } else {
    const numTimeout = Number(rawTimeout);
    if (
      typeof rawTimeout === 'boolean' ||
      isNaN(numTimeout) ||
      !isFinite(numTimeout) ||
      !Number.isInteger(numTimeout) ||
      numTimeout < 30 ||
      numTimeout > 300
    ) {
      errors.ttcStarvationTimeoutSec = 'Must be between 30 and 300 seconds.';
    }
  }

  // Battery threshold validation (preserve existing if omitted)
  const rawBattery = body.batteryThresholdLow;
  if (rawBattery !== undefined) {
    if (rawBattery === null || rawBattery === '') {
      errors.batteryThresholdLow = 'Battery threshold cannot be empty.';
    } else {
      const numBattery = Number(rawBattery);
      if (
        typeof rawBattery === 'boolean' ||
        isNaN(numBattery) ||
        !isFinite(numBattery) ||
        numBattery < 0 ||
        numBattery > 100
      ) {
        errors.batteryThresholdLow = 'Must be between 0 and 100.';
      }
    }
  }

  return errors;
}

/**
 * Loads the active RouterSettings document from MongoDB, validates/normalizes it,
 * and updates in-memory routerService settings.
 * If no document exists, creates one from canonical router defaults.
 * If MongoDB is disconnected or fails, returns current in-memory settings gracefully.
 */
async function syncSettingsFromDb() {
  const isDbConnected = mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    return routerService.getSettings();
  }

  try {
    let doc = await RouterSettings.findOne({ key: 'active' });

    if (!doc) {
      const defaults = routerService.getSettings();
      doc = await RouterSettings.create({
        key: 'active',
        baseWeights: { ...defaults.baseWeights },
        ttcStarvationTimeoutSec: defaults.ttcStarvationTimeoutSec,
        batteryThresholdLow: defaults.batteryThresholdLow,
        updatedAt: new Date()
      });
      console.log('[SETTINGS] Initialized default RouterSettings document in MongoDB');
    }

    const rawWeights = doc.baseWeights || {};
    const dbConfig = {
      baseWeights: {
        TTC: typeof rawWeights.TTC === 'number' ? Math.max(10, Math.min(200, rawWeights.TTC)) : 100,
        SSTV: typeof rawWeights.SSTV === 'number' ? Math.max(10, Math.min(200, rawWeights.SSTV)) : 60,
        Codec2: typeof rawWeights.Codec2 === 'number' ? Math.max(10, Math.min(200, rawWeights.Codec2)) : 40,
        M17: typeof rawWeights.M17 === 'number' ? Math.max(10, Math.min(200, rawWeights.M17)) : 30
      },
      ttcStarvationTimeoutSec: typeof doc.ttcStarvationTimeoutSec === 'number'
        ? Math.max(30, Math.min(300, doc.ttcStarvationTimeoutSec))
        : 120,
      batteryThresholdLow: typeof doc.batteryThresholdLow === 'number'
        ? Math.max(0, Math.min(100, doc.batteryThresholdLow))
        : 30,
      linkQualityThresholdLow: routerService.getSettings().linkQualityThresholdLow || 35
    };

    routerService.updateSettings(dbConfig);

    return {
      ...dbConfig,
      key: doc.key || 'active',
      updatedAt: doc.updatedAt
    };
  } catch (err) {
    console.error('[SETTINGS] Error synchronizing settings from MongoDB:', err.message);
    return routerService.getSettings();
  }
}

router.syncSettingsFromDb = syncSettingsFromDb;

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const current = await syncSettingsFromDb();
      return res.json(current);
    }

    // Offline database fallback: return in-memory router configuration
    return res.json(routerService.getSettings());
  } catch (err) {
    console.error('[SETTINGS] Error in GET /api/settings:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve router settings.' });
  }
});

// PUT /api/settings
router.put('/', async (req, res) => {
  try {
    const errors = validateSettingsPayload(req.body);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    const currentSettings = routerService.getSettings();
    const rawWeights = req.body.baseWeights || req.body.weights;
    const rawTimeout = req.body.ttcStarvationTimeoutSec !== undefined
      ? req.body.ttcStarvationTimeoutSec
      : req.body.ttcStarvationTimeout;
    const rawBattery = req.body.batteryThresholdLow !== undefined
      ? req.body.batteryThresholdLow
      : currentSettings.batteryThresholdLow;

    const validatedSettings = {
      baseWeights: {
        TTC: Number(rawWeights.TTC !== undefined ? rawWeights.TTC : rawWeights['TT&C']),
        SSTV: Number(rawWeights.SSTV),
        Codec2: Number(rawWeights.Codec2 !== undefined ? rawWeights.Codec2 : rawWeights.CODE2),
        M17: Number(rawWeights.M17)
      },
      ttcStarvationTimeoutSec: Number(rawTimeout),
      batteryThresholdLow: Number(rawBattery),
      linkQualityThresholdLow: currentSettings.linkQualityThresholdLow || 35
    };

    // 1. Update in-memory configuration
    const updatedInMemory = routerService.updateSettings(validatedSettings);

    // 2. If MongoDB is connected, upsert active document
    const isDbConnected = mongoose.connection.readyState === 1;
    let savedUpdatedAt = new Date();

    if (isDbConnected) {
      try {
        const savedDoc = await RouterSettings.findOneAndUpdate(
          { key: 'active' },
          {
            $set: {
              key: 'active',
              baseWeights: validatedSettings.baseWeights,
              ttcStarvationTimeoutSec: validatedSettings.ttcStarvationTimeoutSec,
              batteryThresholdLow: validatedSettings.batteryThresholdLow,
              updatedAt: savedUpdatedAt
            }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        if (savedDoc && savedDoc.updatedAt) {
          savedUpdatedAt = savedDoc.updatedAt;
        }
      } catch (dbErr) {
        console.error('[SETTINGS] Database write failure:', dbErr.message);
        return res.status(500).json({ error: 'Database write failed while persisting settings.' });
      }
    }

    const responsePayload = {
      ...updatedInMemory,
      key: 'active',
      updatedAt: savedUpdatedAt
    };

    return res.json({
      success: true,
      settings: responsePayload,
      ...responsePayload
    });
  } catch (err) {
    console.error('[SETTINGS] Unexpected error in PUT /api/settings:', err.message);
    return res.status(500).json({ error: 'Failed to update router settings.' });
  }
});

// POST /api/settings/reset
router.post('/reset', async (req, res) => {
  try {
    // 1. Restore defaults in in-memory router
    const restored = routerService.updateSettings(DEFAULT_SETTINGS);

    // 2. If MongoDB is connected, persist defaults to active document
    const isDbConnected = mongoose.connection.readyState === 1;
    let resetUpdatedAt = new Date();

    if (isDbConnected) {
      try {
        const resetDoc = await RouterSettings.findOneAndUpdate(
          { key: 'active' },
          {
            $set: {
              key: 'active',
              baseWeights: DEFAULT_SETTINGS.baseWeights,
              ttcStarvationTimeoutSec: DEFAULT_SETTINGS.ttcStarvationTimeoutSec,
              batteryThresholdLow: DEFAULT_SETTINGS.batteryThresholdLow,
              updatedAt: resetUpdatedAt
            }
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        if (resetDoc && resetDoc.updatedAt) {
          resetUpdatedAt = resetDoc.updatedAt;
        }
      } catch (dbErr) {
        console.error('[SETTINGS] Database write failure during reset:', dbErr.message);
        return res.status(500).json({ error: 'Database write failed during settings reset.' });
      }
    }

    const responsePayload = {
      ...restored,
      key: 'active',
      updatedAt: resetUpdatedAt
    };

    return res.json({
      success: true,
      settings: responsePayload,
      ...responsePayload
    });
  } catch (err) {
    console.error('[SETTINGS] Unexpected error in POST /api/settings/reset:', err.message);
    return res.status(500).json({ error: 'Failed to reset router settings.' });
  }
});

module.exports = router;
