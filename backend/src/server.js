const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const simulator = require('./services/simulator');

const telemetryRoutes = require('./routes/telemetry');
const queueRoutes = require('./routes/queue');
const decisionRoutes = require('./routes/decisions');
const overrideRoutes = require('./routes/override');
const passRoutes = require('./routes/passes');
const validationRoutes = require('./routes/validation');
const deploymentRoutes = require('./routes/deployment');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/decisions', decisionRoutes);
app.use('/api/override', overrideRoutes);
app.use('/api/passes', passRoutes);
app.use('/api/validation', validationRoutes);
app.use('/api/deployment', deploymentRoutes);
app.use('/api/settings', settingsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ONLINE', mission: 'Arbiter Mission Control', timestamp: new Date().toISOString() });
});

// Database connection with fallback
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/arbiter';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('[DB] MongoDB Connection Established Successfully.');
  })
  .catch(err => {
    console.warn('[DB WARNING] Could not connect to local MongoDB. Falling back to In-Memory Simulator Data layer.');
  });

// Start simulator loop
simulator.startSimulator();

app.listen(PORT, () => {
  console.log(`[SERVER] Arbiter Ground Station Express Backend active on port ${PORT}`);
});
