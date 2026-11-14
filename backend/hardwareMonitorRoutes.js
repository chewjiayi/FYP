// hardwareMonitorRoutes.js
// Hardware monitoring API (history graphs + monitor settings)
// Mounted in server.js at: /api/admin/hardware
//   GET /current                      -> latest sample + monitor status
//   GET /history?range=15m|1h|6h|24h|7d|30d  -> points for the graphs
//   GET /settings                     -> sampling interval, retention, on/off
//   PUT /settings                     -> change them (admin)
// BY ZHI RUO

const express = require('express');
const auth = require('./auth');
const db = require('./db');
const monitor = require('./hardwareMonitor');

const router = express.Router();

// Same login check as systemRoutes.js; changing settings needs an admin
router.use(auth.requireAuth);

function who(req) {
    const s = req.session || {};
    return s.username || (s.user && s.user.username) || 'unknown';
}

function sendError(res, err) {
    if (err instanceof monitor.MonitorError) {
        return res.status(err.status).json({ success: false, error: err.message });
    }
    console.error('Hardware monitor error:', err);
    res.status(500).json({ success: false, error: 'Server error: ' + err.message });
}

router.get('/current', (req, res) => {
    try {
        res.json({ success: true, ...monitor.getCurrent() });
    } catch (err) { sendError(res, err); }
});

router.get('/history', (req, res) => {
    try {
        res.json({ success: true, ...monitor.getHistory(req.query.range || '1h'), status: monitor.getStatus() });
    } catch (err) { sendError(res, err); }
});

router.get('/settings', (req, res) => {
    try {
        res.json({
            success: true,
            settings: monitor.readSettings(),
            options: { sampleIntervalSeconds: monitor.INTERVAL_OPTIONS, retentionDays: { min: 1, max: 90 } },
            status: monitor.getStatus()
        });
    } catch (err) { sendError(res, err); }
});

router.put('/settings', auth.requireAdmin, (req, res) => {
    const check = monitor.validateSettings(req.body);
    if (!check.ok) {
        return res.status(400).json({ success: false, error: check.errors.join('; '), errors: check.errors });
    }
    try {
        const saved = monitor.updateSettings(check.settings, who(req));
        db.run(
            'INSERT INTO audit_logs (action, admin_username, target_type, target_id, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
            ['HARDWARE_MONITOR_SETTINGS_CHANGED', who(req), 'hardware_monitor', null, req.ip, req.headers['user-agent']],
            err => { if (err) console.error('Audit log failed:', err); }
        );
        console.log(`📈 Hardware monitor settings changed by ${who(req)}: enabled=${saved.enabled}, every ${saved.sampleIntervalSeconds}s, keep ${saved.retentionDays} days`);
        res.json({ success: true, settings: saved, status: monitor.getStatus() });
    } catch (err) { sendError(res, err); }
});

module.exports = router;
