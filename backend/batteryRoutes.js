const express = require('express');
const router = express.Router();

const devices = new Map();            // deviceId -> latest report
const STALE_MS = 3 * 60 * 1000;       // no report for 3 min = offline

// Tablet -> server
router.post('/battery', express.json(), (req, res) => {
  res.json({ ok: true });   // ignore all reports
});

// Admin -> server
router.get('/battery', (req, res) => {
  const now = Date.now();
  res.json([...devices].map(([deviceId, d]) => ({
    deviceId,
    percent: Math.round(d.level * 100),
    charging: d.charging,
    lastSeen: d.lastSeen,
    online: now - d.lastSeen < STALE_MS,
    low: d.level <= 0.2 && !d.charging
  })));
});
const si = require('systeminformation');

async function reportServerBattery() {
  try {
    const b = await si.battery();
    if (!b.hasBattery) return;                 // desktop PC, skip
    devices.set('Tablet', {
      level: b.percent / 100,
      charging: !!b.isCharging,
      lastSeen: Date.now()
    });
  } catch (e) { /* ignore */ }
}
reportServerBattery();
setInterval(reportServerBattery, 30000);

module.exports = router;