const mongoose = require('mongoose');

const ScenarioSchema = new mongoose.Schema({
  scenarioId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  initialBattery: { type: Number, required: true, default: 80 },
  linkProfile: { type: String, default: 'HIGH_SINE' },
  rulesCount: { type: Number, default: 4 },
  status: { type: String, enum: ['PASSED', 'FAILED'], default: 'PASSED' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Scenario', ScenarioSchema);
