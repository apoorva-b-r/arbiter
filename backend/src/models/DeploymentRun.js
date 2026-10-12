const mongoose = require('mongoose');

const DeploymentRunSchema = new mongoose.Schema({
  runId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  passId: {
    type: String,
    required: true,
    index: true
  },
  currentState: {
    type: String,
    enum: ['STOWED', 'RELEASE_TRIGGERED', 'SEPARATION_CONFIRMED', 'INITIALIZATION', 'COMMISSIONING', 'OPERATIONAL'],
    default: 'STOWED'
  },
  status: {
    type: String,
    enum: ['IN_PROGRESS', 'COMPLETED', 'CONTINGENCY', 'RESOLVED', 'ABORTED'],
    default: 'IN_PROGRESS'
  },
  mode: {
    type: String,
    enum: ['NORMAL', 'CONTINGENCY_SIMULATION'],
    default: 'NORMAL'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  completionTime: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DeploymentRun', DeploymentRunSchema);
