const mongoose = require('mongoose');

const DecisionSchema = new mongoose.Schema({
  decisionId: { type: String, required: true },
  timestamp: { type: String, required: true },
  selectedType: { type: String, enum: ['TTC', 'SSTV', 'Codec2', 'M17'], required: true },
  reasoning: { type: String, required: true },
  isOverridden: { type: Boolean, default: false },
  overriddenType: { type: String },
  passId: { type: String, required: true },
  score: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Decision', DecisionSchema);
