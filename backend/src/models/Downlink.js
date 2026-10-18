const mongoose = require('mongoose');

const DownlinkSchema = new mongoose.Schema({
  downlinkId: { type: String, required: true, unique: true },
  decisionId: { type: String },
  passId: { type: String },
  type: { type: String, enum: ['TTC', 'SSTV', 'Codec2', 'M17'], required: true },
  label: { type: String },
  sizeKb: { type: Number },
  status: { type: String, enum: ['RECEIVED', 'PARTIAL', 'LOST'], required: true },
  linkQualityAtSend: { type: Number },
  ackReceived: { type: Boolean },
  ackLatencyMs: { type: Number, default: null },
  payload: { type: mongoose.Schema.Types.Mixed },
  isRetransmit: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Downlink', DownlinkSchema);
