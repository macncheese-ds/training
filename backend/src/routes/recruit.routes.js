/**
 * Recruitment routes — mounted at /api/recruit
 * All endpoints require at minimum a valid JWT (verifyToken).
 * Write operations require admin role (HR).
 */
const router  = require('express').Router();
const path    = require('path');
const multer  = require('multer');
const fs      = require('fs');

const { verifyToken }   = require('../middleware/auth');
const { requireAdmin, requireManager } = require('../middleware/rbac');

const vacCtrl  = require('../controllers/recruit.vacancies.controller');
const candCtrl = require('../controllers/recruit.candidates.controller');
const settCtrl = require('../controllers/recruit.settings.controller');
const dashCtrl = require('../controllers/recruit.dashboard.controller');

// ── Multer: CV uploads ────────────────────────────────────
const resumesDir = path.join(__dirname, '../../uploads/resumes');
if (!fs.existsSync(resumesDir)) fs.mkdirSync(resumesDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, resumesDir),
  filename:    (_req, file,  cb) => {
    const ext  = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}_${name}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    if (!allowed.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(new Error('Solo se permiten archivos PDF, DOC, DOCX.'));
    }
    cb(null, true);
  },
});

// ── Dashboard ─────────────────────────────────────────────
router.get('/dashboard/kpis',      verifyToken, requireManager, dashCtrl.getKpis);
router.get('/dashboard/pipeline',  verifyToken, requireManager, dashCtrl.getPipeline);
router.get('/dashboard/by-month',  verifyToken, requireManager, dashCtrl.getByMonth);
router.get('/dashboard/decisions', verifyToken, requireManager, dashCtrl.getDecisions);
router.get('/dashboard/sources',   verifyToken, requireManager, dashCtrl.getSources);

// ── Vacancies ─────────────────────────────────────────────
router.get('/',              verifyToken, requireManager, vacCtrl.list);
router.get('/vacancies',     verifyToken, requireManager, vacCtrl.list);
router.get('/vacancies/:id', verifyToken, requireManager, vacCtrl.getOne);
router.post('/vacancies',    verifyToken, requireAdmin,   vacCtrl.create);
router.put('/vacancies/:id', verifyToken, requireAdmin,   vacCtrl.update);
router.delete('/vacancies/:id', verifyToken, requireAdmin, vacCtrl.remove);

// ── Candidates ────────────────────────────────────────────
router.get('/candidates',     verifyToken, requireManager, candCtrl.list);
router.get('/candidates/:id', verifyToken, requireManager, candCtrl.getOne);
router.post('/candidates',    verifyToken, requireManager, candCtrl.create);
router.put('/candidates/:id', verifyToken, requireManager, candCtrl.update);
router.delete('/candidates/:id', verifyToken, requireAdmin, candCtrl.remove);

// CV upload
router.post('/candidates/:id/upload-cv',
  verifyToken, requireManager,
  upload.single('cv'),
  candCtrl.uploadCV
);

// Notes
router.post('/candidates/:id/notes', verifyToken, requireManager, candCtrl.addNote);

// Re-score (re-run keyword matching after requirements change)
router.post('/candidates/:id/rescore', verifyToken, requireManager, candCtrl.rescore);

// Hire → creates credenciales user + marks candidate Hired
router.post('/candidates/:id/hire', verifyToken, requireAdmin, candCtrl.hire);

// ── Settings ─────────────────────────────────────────────
router.get('/settings/departments',        verifyToken, requireManager, settCtrl.getDepartments);
router.post('/settings/departments',       verifyToken, requireAdmin,   settCtrl.createDepartment);
router.put('/settings/departments/:id',    verifyToken, requireAdmin,   settCtrl.updateDepartment);
router.delete('/settings/departments/:id', verifyToken, requireAdmin,   settCtrl.deleteDepartment);

router.get('/settings/sources',         verifyToken, requireManager, settCtrl.getSources);
router.post('/settings/sources',        verifyToken, requireAdmin,   settCtrl.createSource);
router.put('/settings/sources/:id',     verifyToken, requireAdmin,   settCtrl.updateSource);
router.delete('/settings/sources/:id',  verifyToken, requireAdmin,   settCtrl.deleteSource);

router.get('/settings/recruiters', verifyToken, requireManager, settCtrl.getRecruiters);

module.exports = router;
