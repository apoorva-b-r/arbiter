const mongoose = require('mongoose');

const ScenarioSchema = new mongoose.Schema({
  scenarioId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  initialBattery: { type: Number, required: true, min: 0, max: 100 },
  linkProfile: { type: String, required: true },
  rulesCount: { type: Number, default: 4 },
  status: { type: String, enum: ['PASSED', 'FAILED'], default: 'PASSED' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Scenario', ScenarioSchema);
