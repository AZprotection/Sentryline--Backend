require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { captureException } = require('./services/errorTracking');
const authRoutes = require('./routes/auth');
const checkpointRoutes = require('./routes/checkpoints');
const shiftRoutes = require('./routes/shifts');
const incidentRoutes = require('./routes/incidents');
const visitorRoutes = require('./routes/visitors');
const activityRoutes = require('./routes/activity');
const messageRoutes = require('./routes/messages');
const reportRoutes = require('./routes/reports');
const zoneRoutes = require('./routes/zones');
const sensorRoutes = require('./routes/sensors');
const trainingRoutes = require('./routes/training');
const analyticsRoutes = require('./routes/analytics');
const fleetRoutes = require('./routes/fleet');
const sosRoutes = require('./routes/sos');
const uploadRoutes = require('./routes/uploads');
const consentRoutes = require('./routes/consent');
const geofenceRoutes = require('./routes/geofences');
const passdownRoutes = require('./routes/passdowns');
const userRoutes = require('./routes/users');

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' })); // generous limit for base64 photo/voice payloads

// Minimal structured request logging — enough to see what's happening in
// production without adding a whole logging stack. Skips noisy health
// checks and the long-lived SSE stream connection.
app.use((req, res, next) => {
  if (req.path === '/health' || req.path === '/fleet/stream') return next();
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

app.get('/health', (req, res) => res.json({ ok: true }));

// Login is the one endpoint worth protecting from brute-force guessing —
// 20 attempts per 15 minutes per IP is generous for a real user, tight
// enough to make password guessing impractical.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in a few minutes.' },
});
app.use('/auth/login', loginLimiter);

app.use('/auth', authRoutes);
app.use('/checkpoints', checkpointRoutes);
app.use('/shifts', shiftRoutes);
app.use('/incidents', incidentRoutes);
app.use('/visitors', visitorRoutes);
app.use('/activity', activityRoutes);
app.use('/messages', messageRoutes);
app.use('/reports', reportRoutes);
app.use('/zones', zoneRoutes);
app.use('/sensors', sensorRoutes);
app.use('/training', trainingRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/fleet', fleetRoutes);
app.use('/sos', sosRoutes);
app.use('/uploads', uploadRoutes);
app.use('/consent', consentRoutes);
app.use('/geofences', geofenceRoutes);
app.use('/passdowns', passdownRoutes);
app.use('/users', userRoutes);

// Centralized error handler — never leak stack traces in production.
// Reports to Sentry if SENTRY_DSN is set, always logs to console either way.
app.use((err, req, res, next) => {
  captureException(err, { path: req.path, method: req.method });
  res.status(500).json({ error: 'Internal server error' });
});

process.on('unhandledRejection', (err) => captureException(err, { source: 'unhandledRejection' }));
process.on('uncaughtException', (err) => captureException(err, { source: 'uncaughtException' }));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Sentryline API listening on :${port}`));
