const mongoose = require('mongoose');

const PassSchema = new mongoose.Schema({
  passId: { type: String, required: true, unique: true },
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, default: 'Active' },
  durationSec: { type: Number, default: 600 },
  itemsSent: { type: Number, default: 0 },
  overrideCount: { type: Number, default: 0 },
  status: { type: String, enum: ['ACTIVE', 'COMPLETED'], default: 'ACTIVE' },
  peakLinkQuality: { type: Number, default: 90 },
  avgBattery: { type: Number, default: 85 }
});

module.exports = mongoose.model('Pass', PassSchema);
