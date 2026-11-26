// hibernationRoutes.js
// Hibernation policy settings API
// Mounted in server.js at: /api/admin/hibernation
//   GET /api/admin/hibernation/policy       -> current policy (defaults if never saved)
//   PUT /api/admin/hibernation/policy       -> validate + save a new policy
//   GET /api/admin/hibernation/status       -> policy checker status + recent decisions + pages connected
//   GET /api/admin/hibernation/connections  -> which admin pages are connected live (WebSocket)
//   GET /api/admin/hibernation/monitor      -> the page for the second laptop
//   GET /api/admin/hibernation/capability   -> can this computer hibernate? (and how to fix it if not)
//   POST /api/admin/hibernation/test-now    -> REALLY hibernate after a countdown (System Admin + password)
//   POST /api/admin/hibernation/cancel      -> stop a hibernation that is counting down
// BY ZHI RUO

const express = require('express');
const auth = require('./auth');
const db = require('./db');
const store = require('./hibernationPolicyStore');
const evaluator = require('./hibernationEvaluator');
const realtime = require('./realtimeHub');
const action = require('./hibernateAction');
const { PAGE: MONITOR_PAGE } = require('./hibernationMonitorPage');

const router = express.Router();

// Same login check as systemRoutes.js
router.use(auth.requireAuth);

router.get('/policy', (req, res) => {
    res.json({ success: true, policy: store.readPolicy() });
});

router.put('/policy', (req, res) => {
    const { ok, errors, policy } = store.validatePolicy(req.body);
    if (!ok) {
        return res.status(400).json({ success: false, error: errors.join('; '), errors });
    }

    try {
        const who = (req.session && (req.session.username ||
                    (req.session.user && req.session.user.username))) || 'unknown';
        const saved = store.writePolicy(policy, who);
        console.log(`🛌 Hibernation policy updated by ${who}: enabled=${saved.enabled}, type=${saved.policyType}, enforcement=${saved.enforcement}`);

        // Tell every other open admin page, so they can show the new policy straight away
        realtime.broadcast('hibernation:policy-updated', {
            enabled: saved.enabled,
            policyType: saved.policyType,
            enforcement: saved.enforcement,
            updated_by: saved.updated_by,
            last_updated: saved.last_updated
        });

        res.json({ success: true, policy: saved });
    } catch (err) {
        console.error('Hibernation policy save error:', err);
        res.status(500).json({ success: false, error: 'Could not save hibernation policy' });
    }
});

router.get('/status', (req, res) => {
    res.json({ success: true, ...evaluator.getStatus(), connectedPages: realtime.connectionCount() });
});

router.get('/connections', (req, res) => {
    res.json({ success: true, count: realtime.connectionCount(), connections: realtime.connectionList() });
});

router.get('/monitor', (req, res) => {
    res.type('html').send(MONITOR_PAGE);
});

// ---------- Real hibernation ----------
function audit(action, req) {
    db.run(
        'INSERT INTO audit_logs (action, admin_username, target_type, target_id, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
        [action, (req.session && req.session.user && req.session.user.username) || 'unknown', 'hibernation', null, req.ip, req.headers['user-agent']],
        err => { if (err) console.error('Audit log failed:', err); }
    );
}

function requireSystemAdmin(req, res, next) {
    const user = req.session && req.session.user;
    if (!user || user.role !== 'system_admin') {
        return res.status(403).json({ success: false, error: 'System Administrator privileges required' });
    }
    next();
}

router.get('/capability', async (req, res) => {
    try {
        res.json({ success: true, capability: await action.check() });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Starts a countdown, then REALLY hibernates this computer (even when the policy is Dry Run).
router.post('/test-now', requireSystemAdmin, async (req, res) => {
    const username = req.session.user.username;
    const { password, confirmation } = req.body || {};

    if (confirmation !== 'HIBERNATE') {
        return res.status(400).json({ success: false, error: 'Type HIBERNATE to confirm' });
    }
    if (!password) {
        return res.status(400).json({ success: false, error: 'Password verification required' });
    }
    const passwordOk = await new Promise(resolve => {
        auth.loginUser(username, password, err => resolve(!err));
    });
    if (!passwordOk) {
        return res.status(401).json({ success: false, error: 'Invalid password' });
    }

    const seconds = Math.min(120, Math.max(10, parseInt(req.body.seconds, 10) || 15));
    try {
        const started = await evaluator.hibernateNow({ username, seconds });
        if (!started.started) {
            return res.status(409).json({ success: false, error: started.error });
        }
        audit('HIBERNATION_TEST_STARTED', req);
        console.log(`🛌 Manual hibernation test started by ${username} (${seconds}s countdown)`);
        res.json({ success: true, message: `Hibernating in ${seconds} seconds`, seconds, pending: evaluator.getPending() });
    } catch (err) {
        console.error('Test hibernate error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/cancel', (req, res) => {
    const who = (req.session && req.session.user && req.session.user.username) || 'an admin';
    const cancelled = evaluator.cancelPending(who);
    if (cancelled) audit('HIBERNATION_CANCELLED', req);
    res.json({ success: true, cancelled, message: cancelled ? 'Hibernation cancelled' : 'Nothing was counting down' });
});

module.exports = router;
