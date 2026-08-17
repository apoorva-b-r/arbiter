const mongoose = require('mongoose');

const TelemetrySchema = new mongoose.Schema({
  battery: { type: Number, required: true, default: 85.0 },
  linkQuality: { type: Number, required: true, default: 90 },
  snr: { type: Number, required: true, default: 18.0 },
  activeMode: { type: String, required: true, default: 'TTC' },
  passStatus: { type: String, enum: ['ACTIVE', 'IDLE'], default: 'ACTIVE' },
  passTimeRemainingSec: { type: Number, default: 600 },
  currentPassId: { type: String, default: 'PASS-20260817-01' },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Telemetry', TelemetrySchema);
