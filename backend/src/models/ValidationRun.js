const mongoose = require('mongoose');

const ValidationRunSchema = new mongoose.Schema({
  runId: { type: String, required: true },
  scenarioId: { type: String, required: true },
  versionLabel: { type: String, required: true },
  passRate: { type: Number, required: true },
  date: { type: String, required: true },
  results: [{
    rule: { type: String, required: true },
    passed: { type: Boolean, required: true },
    detail: { type: String, required: true }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ValidationRun', ValidationRunSchema);