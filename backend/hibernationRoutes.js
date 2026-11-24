// hibernationRoutes.js
// Hibernation policy settings API
// Mounted in server.js at: /api/admin/hibernation
//   GET /api/admin/hibernation/policy       -> current policy (defaults if never saved)
//   PUT /api/admin/hibernation/policy       -> validate + save a new policy
//   GET /api/admin/hibernation/status       -> policy checker status + recent decisions + pages connected
//   GET /api/admin/hibernation/connections  -> which admin pages are connected live (WebSocket)
//   GET /api/admin/hibernation/monitor      -> the page for the second laptop
// BY ZHI RUO

const express = require('express');
const auth = require('./auth');
const store = require('./hibernationPolicyStore');
const evaluator = require('./hibernationEvaluator');
const realtime = require('./realtimeHub');
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

module.exports = router;
