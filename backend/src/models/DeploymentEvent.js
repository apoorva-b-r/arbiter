const mongoose = require('mongoose');

const DeploymentEventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  deploymentRunId: {
    type: String,
    required: true,
    index: true
  },
  passId: {
    type: String,
    required: true,
    index: true
  },
  eventType: {
    type: String,
    required: true,
    enum: [
      'SEQUENCE_STARTED',
      'STATE_ENTRY',
      'STATE_TRANSITION',
      'SEPARATION_CONFIRMED',
      'INITIALIZATION_STARTED',
      'INITIALIZATION_COMPLETED',
      'COMMISSIONING_STARTED',
      'OPERATIONAL_HANDOVER',
      'TIMEOUT_DETECTED',
      'CONTINGENCY_ACTIVATED',
      'CONTINGENCY_RETRY',
      'SECONDARY_BEACON_CHECK',
      'CONTINGENCY_ESCALATED',
      'MANUAL_SEPARATION_CONFIRMED',
      'CONTINGENCY_RESOLVED'
    ]
  },
  sourceState: {
    type: String,
    default: null
  },
  destinationState: {
    type: String,
    default: null
  },
  state: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  logType: {
    type: String,
    enum: ['info', 'warning', 'success', 'critical'],
    default: 'info'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('DeploymentEvent', DeploymentEventSchema);
