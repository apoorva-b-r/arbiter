const mongoose = require('mongoose');

const DeploymentStateSchema = new mongoose.Schema({
  currentStateIndex: { type: Number, default: 3 },
  contingencyActive: { type: Boolean, default: false },
  contingencyMessage: { type: String, default: '' },
  timeoutDurationSec: { type: Number, default: 60 },
  timeElapsedSec: { type: Number, default: 42 },
  historyLogs: [
    {
      timestamp: String,
      event: String,
      state: String
    }
  ]
});

module.exports = mongoose.model('DeploymentState', DeploymentStateSchema);
