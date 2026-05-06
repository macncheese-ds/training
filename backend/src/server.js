require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const path     = require('path');
const cron     = require('node-cron');

const authRoutes          = require('./routes/auth.routes');
const categoriesRoutes    = require('./routes/categories.routes');
const trainingsRoutes     = require('./routes/trainings.routes');
const assignmentsRoutes   = require('./routes/assignments.routes');
const packagesRoutes      = require('./routes/packages.routes');
const examsRoutes         = require('./routes/exams.routes');
const skillsRoutes        = require('./routes/skills.routes');
const employeesRoutes     = require('./routes/employees.routes');
const reportsRoutes       = require('./routes/reports.routes');
const notificationsRoutes = require('./routes/notifications.routes');

const automationService   = require('./services/automation.service');

const app = express();

// ── Middleware ──────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static: uploaded training materials ─────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Routes ─────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/categories',    categoriesRoutes);
app.use('/api/trainings',     trainingsRoutes);
app.use('/api/assignments',   assignmentsRoutes);
app.use('/api/packages',      packagesRoutes);
app.use('/api/exams',         examsRoutes);
app.use('/api/skills',        skillsRoutes);
app.use('/api/employees',     employeesRoutes);
app.use('/api/reports',       reportsRoutes);
app.use('/api/notifications', notificationsRoutes);

// ── Health check ───────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── Cron: check overdue assignments every hour ─────────
cron.schedule('0 * * * *', () => {
  console.log('[CRON] Running overdue check...');
  automationService.markOverdueAssignments();
});

// ── Cron: check recurrence daily at 6 AM ───────────────
cron.schedule('0 6 * * *', () => {
  console.log('[CRON] Running recurrence check...');
  automationService.processRecurringTrainings();
});

// ── Start ──────────────────────────────────────────────
const PORT = process.env.PORT || 3102;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Training API] listening on :${PORT}`);
});
