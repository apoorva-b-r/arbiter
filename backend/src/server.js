const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });


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
app.use('/api/auth', require('./routes/auth'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ONLINE', mission: 'Arbiter Mission Control', timestamp: new Date().toISOString() });
});

// Database connection with fallback and startup synchronization
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/arbiter';

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    console.log(`[DB] MongoDB Connection Established Successfully to ${mongoose.connection.host}`);

    // Synchronize persisted RouterSettings from MongoDB into in-memory router BEFORE simulator starts
    if (settingsRoutes.syncSettingsFromDb) {
      await settingsRoutes.syncSettingsFromDb();
      console.log('[SETTINGS] Router settings synchronized from MongoDB at startup');
    }
  } catch (err) {
    console.warn(`[DB WARNING] Could not connect to local MongoDB (${err.message}). Falling back to In-Memory Simulator Data layer.`);
  }

  // Also hook into subsequent reconnects if MongoDB connects later
  mongoose.connection.on('connected', async () => {
    if (settingsRoutes.syncSettingsFromDb) {
      await settingsRoutes.syncSettingsFromDb();
    }
  });

  // Start simulator loop AFTER settings are initialized
  simulator.startSimulator();

  app.listen(PORT, () => {
    console.log(`[SERVER] Arbiter Ground Station Express Backend active on port ${PORT}`);
  });
}

startServer();
