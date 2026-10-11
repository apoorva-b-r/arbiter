const mongoose = require('mongoose');

const RouterSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    default: 'active',
    unique: true,
    required: true
  },
  baseWeights: {
    TTC: {
      type: Number,
      required: true,
      default: 100,
      min: 10,
      max: 200
    },
    SSTV: {
      type: Number,
      required: true,
      default: 60,
      min: 10,
      max: 200
    },
    Codec2: {
      type: Number,
      required: true,
      default: 40,
      min: 10,
      max: 200
    },
    M17: {
      type: Number,
      required: true,
      default: 30,
      min: 10,
      max: 200
    }
  },
  ttcStarvationTimeoutSec: {
    type: Number,
    required: true,
    default: 120,
    min: 30,
    max: 300
  },
  batteryThresholdLow: {
    type: Number,
    required: true,
    default: 30,
    min: 0,
    max: 100
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('RouterSettings', RouterSettingsSchema);
