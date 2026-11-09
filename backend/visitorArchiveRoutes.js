// visitorArchiveRoutes.js
// Visitor data archive API (System Admin only, behind the same 30-minute unlock as Data Export)
// Mounted in server.js at: /api/admin/visitor-archive
//   GET  /preview?before=YYYY-MM-DD&scope=archived|all  -> what WOULD be archived
//   POST /create   { before, scope }                    -> write + verify an archive on disk
//   GET  /list                                          -> archives already on disk
//   POST /:id/verify                                    -> re-check an archive's files
//   GET  /:id/download                                  -> the archive as a ZIP (export)
//   POST /:id/delete-from-database { password, confirmation:"DELETE" }
//                                                       -> remove the archived records from the database
// BY ZHI RUO

const express = require('express');
const archiver = require('archiver');
const auth = require('./auth');
const db = require('./db');
const service = require('./visitorArchiveService');

const router = express.Router();

router.use(auth.requireAuth);

// System Admin + the Data Export unlock (same session flag dataExportRoutes.js sets)
function requireArchiveAccess(req, res, next) {
    const user = req.session && req.session.user;
    if (!user || user.role !== 'system_admin') {
        return res.status(403).json({ success: false, error: 'System Administrator privileges required' });
    }
    const unlockedAt = req.session.data_export_unlock_time ? new Date(req.session.data_export_unlock_time) : null;
    const minutes = unlockedAt ? (Date.now() - unlockedAt.getTime()) / 60000 : Infinity;
    if (!req.session.data_export_unlocked || minutes >= 30) {
        return res.status(401).json({ success: false, error: 'Session locked. Unlock Data Export with your password first.' });
    }
    next();
}

function audit(action, username, targetType, targetId, req) {
    db.run(
        'INSERT INTO audit_logs (action, admin_username, target_type, target_id, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
        [action, username, targetType, targetId, req.ip, req.headers['user-agent']],
        err => { if (err) console.error('Audit log failed:', err); }
    );
}

function sendError(res, err) {
    if (err instanceof service.ArchiveError) {
        return res.status(err.status).json({ success: false, error: err.message });
    }
    console.error('Visitor archive error:', err);
    res.status(500).json({ success: false, error: 'Server error: ' + err.message });
}

router.get('/preview', requireArchiveAccess, async (req, res) => {
    try {
        const preview = await service.previewArchive(req.query.before, req.query.scope || 'archived');
        res.json({ success: true, preview });
    } catch (err) { sendError(res, err); }
});

router.post('/create', requireArchiveAccess, async (req, res) => {
    const username = req.session.user.username;
    try {
        const { before, scope = 'archived' } = req.body || {};
        const archive = await service.createArchive(before, scope, username);
        audit('ARCHIVE_CREATED', username, 'visitor_archive', archive.counts.feedback, req);
        console.log(`🗄️ Visitor archive ${archive.id} created by ${username}: ${archive.counts.feedback} records`);
        res.json({ success: true, archive });
    } catch (err) { sendError(res, err); }
});

router.get('/list', requireArchiveAccess, (req, res) => {
    try {
        res.json({ success: true, archiveDir: service.ARCHIVE_DIR, archives: service.listArchives() });
    } catch (err) { sendError(res, err); }
});

router.post('/:id/verify', requireArchiveAccess, async (req, res) => {
    try {
        const result = await service.verifyArchive(req.params.id);
        res.json({ success: true, ...result });
    } catch (err) { sendError(res, err); }
});

router.get('/:id/download', requireArchiveAccess, async (req, res) => {
    try {
        const dir = service.getArchiveDir(req.params.id);
        const check = await service.verifyArchive(req.params.id);   // never hand out a damaged archive
        if (!check.ok) {
            return res.status(409).json({ success: false, error: 'Archive failed verification: ' + check.problems.join('; ') });
        }

        audit('ARCHIVE_DOWNLOADED', req.session.user.username, 'visitor_archive', check.archive.counts.feedback, req);
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${req.params.id}.zip"`);

        const zip = archiver('zip', { zlib: { level: 6 } });
        zip.on('error', err => { console.error('Archive zip error:', err); res.destroy(err); });
        zip.pipe(res);
        zip.directory(dir, false);
        zip.finalize();
    } catch (err) { sendError(res, err); }
});

router.post('/:id/delete-from-database', requireArchiveAccess, async (req, res) => {
    const username = req.session.user.username;
    const { password, confirmation } = req.body || {};

    if (confirmation !== 'DELETE') {
        return res.status(400).json({ success: false, error: 'Type DELETE to confirm' });
    }
    if (!password) {
        return res.status(400).json({ success: false, error: 'Password verification required' });
    }

    // Re-check the admin's password (same call adminRoutes.js uses before its deletes)
    const passwordOk = await new Promise(resolve => {
        auth.loginUser(username, password, err => resolve(!err));
    });
    if (!passwordOk) {
        audit('ARCHIVE_DB_DELETE_FAILED', username, 'visitor_archive', null, req);
        return res.status(401).json({ success: false, error: 'Invalid password' });
    }

    try {
        const result = await service.deleteFromDatabase(req.params.id, username);
        audit('ARCHIVE_DB_DELETED', username, 'visitor_archive', result.feedbackDeleted, req);
        console.log(`🗑️ Archive ${req.params.id}: ${username} deleted ${result.feedbackDeleted} records from the database`);
        res.json({ success: true, result });
    } catch (err) { sendError(res, err); }
});

module.exports = router;
