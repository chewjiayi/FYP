// aiCacheArchiveRoutes.js
// AI analysis cache archiving API
// Mounted in server.js at: /api/admin/ai-cache-archive
//   GET  /settings                  -> schedule settings + status (last run, next run, history)
//   PUT  /settings                  -> validate + save the schedule
//   POST /run                       -> archive now
//   GET  /archives                  -> archive files on disk
//   GET  /archives/:name/download   -> download one archive file
// BY ZHI RUO

const express = require('express');
const auth = require('./auth');
const db = require('./db');
const service = require('./aiCacheArchiveService');

const router = express.Router();

// Same check adminRoutes.js uses for the AI cache storage mode settings
router.use(auth.requireAdmin);

function who(req) {
    const s = req.session || {};
    return s.username || (s.user && s.user.username) || 'unknown';
}

function audit(action, req) {
    db.run(
        'INSERT INTO audit_logs (action, admin_username, target_type, target_id, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
        [action, who(req), 'ai_cache_archive', null, req.ip, req.headers['user-agent']],
        err => { if (err) console.error('Audit log failed:', err); }
    );
}

function sendError(res, err) {
    if (err instanceof service.ArchiveJobError) {
        return res.status(err.status).json({ success: false, error: err.message });
    }
    console.error('AI cache archive error:', err);
    res.status(500).json({ success: false, error: 'Server error: ' + err.message });
}

router.get('/settings', (req, res) => {
    try {
        res.json({ success: true, settings: service.readSettings(), status: service.getStatus() });
    } catch (err) { sendError(res, err); }
});

router.put('/settings', (req, res) => {
    const check = service.validateSettings(req.body);
    if (!check.ok) {
        return res.status(400).json({ success: false, error: check.errors.join('; '), errors: check.errors });
    }
    try {
        const saved = service.writeSettings(check.settings, who(req));
        audit('AI_CACHE_ARCHIVE_SETTINGS_CHANGED', req);
        console.log(`🗄️ AI cache archive schedule updated by ${who(req)}: enabled=${saved.enabled}, ${saved.frequency} ${saved.time}`);
        res.json({ success: true, settings: saved, status: service.getStatus() });
    } catch (err) { sendError(res, err); }
});

router.post('/run', async (req, res) => {
    try {
        const result = await service.runArchive({ trigger: 'manual', username: who(req) });
        audit('AI_CACHE_ARCHIVE_RUN', req);
        res.json({ success: true, result, status: service.getStatus() });
    } catch (err) { sendError(res, err); }
});

router.get('/archives', (req, res) => {
    try {
        res.json({ success: true, archiveDir: service.AI_ARCHIVE_DIR, archives: service.listArchiveFiles() });
    } catch (err) { sendError(res, err); }
});

router.get('/archives/:name/download', (req, res) => {
    try {
        const file = service.getArchiveFilePath(req.params.name);
        res.download(file, req.params.name);
    } catch (err) { sendError(res, err); }
});

module.exports = router;
