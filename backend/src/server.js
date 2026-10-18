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
const downlinkRoutes = require('./routes/downlinks');
const overrideRoutes = require('./routes/override');
const passRoutes = require('./routes/passes');
const validationRoutes = require('./routes/validation');
const deploymentRoutes = require('./routes/deployment');
const settingsRoutes = require('./routes/settings');
const missionRoutes = require('./routes/mission');
const mission = require('./services/mission');
const requireAuth = require('./middleware/requireAuth');

const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/telemetry', requireAuth, telemetryRoutes);
app.use('/api/queue', requireAuth, queueRoutes);
app.use('/api/decisions', requireAuth, decisionRoutes);
app.use('/api/downlinks', requireAuth, downlinkRoutes);
app.use('/api/override', requireAuth, overrideRoutes);
app.use('/api/passes', requireAuth, passRoutes);
app.use('/api/validation', requireAuth, validationRoutes);
app.use('/api/deployment', requireAuth, deploymentRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);
app.use('/api/mission', requireAuth, missionRoutes);
app.use('/api/auth', require('./routes/auth'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ONLINE', mission: 'Arbiter Mission Control', timestamp: new Date().toISOString() });
});

const { sanitizeLog } = require('./utils/sanitizeLog');

// Centralized JSON error handling middleware (prevents HTML stack trace and internal detail leakage)
app.use((err, req, res, next) => {
  const reqId = req.headers['x-request-id'] || 'REQ-' + Date.now().toString(36);
  const isSafeStatus = typeof err.status === 'number' && ((err.status >= 400 && err.status < 500) || err.status === 503);
  const statusCode = isSafeStatus ? err.status : 500;
  const clientMessage = isSafeStatus ? (err.message || 'Bad Request') : 'Internal server error';

  // Sanitize server-side log: never print credentials, database URLs, tokens, or raw sensitive headers
  const sanitizedMessage = sanitizeLog(err.message || err);
  console.error(`[SERVER ERROR] [${reqId}] ${req.method} ${req.path} [${statusCode}]: ${sanitizedMessage}`);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(statusCode).json({
    error: clientMessage,
    requestId: reqId
  });
});

// Database connection with fallback and startup synchronization
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/arbiter';

async function startServer() {
  // Security: Prevent silent fallback to predictable development secret in production
  if (process.env.NODE_ENV === 'production') {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === 'arbiter-dev-secret' || secret.length < 16) {
      console.error('[SECURITY FATAL] Production startup aborted: JWT_SECRET must be securely configured with at least 16 characters in production.');
      process.exit(1);
    }
  }

  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    console.log(`[DB] MongoDB Connection Established Successfully to ${mongoose.connection.host}`);

    // Synchronize persisted RouterSettings from MongoDB into in-memory router BEFORE simulator starts
    if (settingsRoutes.syncSettingsFromDb) {
      await settingsRoutes.syncSettingsFromDb();
      console.log('[SETTINGS] Router settings synchronized from MongoDB at startup');
    }
    // Synchronize authoritative MissionState from MongoDB before simulator starts
    await mission.loadFromDb();
  } catch (err) {
    console.warn(`[DB WARNING] Could not connect to local MongoDB (${err.message}). Falling back to In-Memory Simulator Data layer.`);
  }

  // Also hook into subsequent reconnects if MongoDB connects later
  mongoose.connection.on('connected', async () => {
    if (settingsRoutes.syncSettingsFromDb) {
      await settingsRoutes.syncSettingsFromDb();
    }
    await mission.loadFromDb();
  });

  // Start simulator loop AFTER settings are initialized
  simulator.startSimulator();

  app.listen(PORT, () => {
    console.log(`[SERVER] Arbiter Ground Station Express Backend active on port ${PORT}`);
  });
}

startServer();
