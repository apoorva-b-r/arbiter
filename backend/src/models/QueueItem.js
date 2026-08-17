const mongoose = require('mongoose');

const QueueItemSchema = new mongoose.Schema({
  itemId: { type: String, required: true },
  type: { type: String, enum: ['TTC', 'SSTV', 'Codec2', 'M17'], required: true },
  label: { type: String, required: true },
  sizeKb: { type: Number, required: true },
  waitTimeSec: { type: Number, default: 0 },
  baseWeight: { type: Number, default: 50 },
  priorityScore: { type: Number, default: 0 },
  status: { type: String, enum: ['PENDING', 'TRANSMITTING', 'SENT'], default: 'PENDING' },
  isStarved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QueueItem', QueueItemSchema);
