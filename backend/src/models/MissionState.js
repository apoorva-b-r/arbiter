const mongoose = require('mongoose');

const MissionStateSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'active'
  },
  phase: {
    type: String,
    enum: ['PRE_DEPLOYMENT', 'COMMISSIONING', 'OPERATIONAL', 'CONTACT_LOST'],
    default: 'PRE_DEPLOYMENT',
    required: true
  },
  deploymentRunId: {
    type: String,
    default: null
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  history: [
    {
      phase: {
        type: String,
        enum: ['PRE_DEPLOYMENT', 'COMMISSIONING', 'OPERATIONAL', 'CONTACT_LOST'],
        required: true
      },
      at: {
        type: Date,
        default: Date.now
      },
      reason: {
        type: String,
        default: ''
      }
    }
  ]
}, {
  timestamps: true
});

module.exports = mongoose.model('MissionState', MissionStateSchema);
