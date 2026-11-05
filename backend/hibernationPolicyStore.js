// hibernationPolicyStore.js
// Reads / validates / saves the hibernation POLICY (the rules), kept in hibernation-policy.json.
// This file only stores settings. Nothing in here hibernates the machine.
// BY ZHI RUO

const fs = require('fs');
const path = require('path');

const POLICY_FILE = process.env.HIBERNATION_POLICY_FILE || path.join(__dirname, 'hibernation-policy.json');

const POLICY_TYPES = ['scheduled', 'idle', 'scheduled_or_idle'];
const ENFORCEMENT_MODES = ['dry_run', 'enforce'];

const DEFAULT_POLICY = {
    enabled: false,                       // master switch
    policyType: 'scheduled',              // WHEN to hibernate: at a set time, after idling, or whichever comes first
    scheduled: {
        hibernateTime: '22:00',           // 24h HH:MM, server local time
        days: [0, 1, 2, 3, 4, 5, 6]       // 0 = Sunday ... 6 = Saturday
    },
    idle: {
        timeoutMinutes: 60                // no visitor activity for this long
    },
    conditions: {
        skipWhenVisitorActive: true,      // never hibernate in the middle of a visitor session
        warningMinutes: 5                 // warn admins this long before hibernating (0 = no warning)
    },
    enforcement: 'dry_run',               // dry_run = only log what WOULD happen, enforce = really hibernate
    updated_by: 'system',
    last_updated: null
};

function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Merge saved data over the defaults, keeping only keys we know about
function withDefaults(saved) {
    const p = clone(DEFAULT_POLICY);
    if (!saved || typeof saved !== 'object') return p;

    if (typeof saved.enabled === 'boolean') p.enabled = saved.enabled;
    if (POLICY_TYPES.includes(saved.policyType)) p.policyType = saved.policyType;
    if (ENFORCEMENT_MODES.includes(saved.enforcement)) p.enforcement = saved.enforcement;

    if (saved.scheduled && typeof saved.scheduled === 'object') {
        if (typeof saved.scheduled.hibernateTime === 'string') p.scheduled.hibernateTime = saved.scheduled.hibernateTime;
        if (Array.isArray(saved.scheduled.days)) p.scheduled.days = saved.scheduled.days;
    }
    if (saved.idle && typeof saved.idle === 'object') {
        if (saved.idle.timeoutMinutes !== undefined) p.idle.timeoutMinutes = saved.idle.timeoutMinutes;
    }
    if (saved.conditions && typeof saved.conditions === 'object') {
        if (typeof saved.conditions.skipWhenVisitorActive === 'boolean') {
            p.conditions.skipWhenVisitorActive = saved.conditions.skipWhenVisitorActive;
        }
        if (saved.conditions.warningMinutes !== undefined) p.conditions.warningMinutes = saved.conditions.warningMinutes;
    }
    if (typeof saved.updated_by === 'string') p.updated_by = saved.updated_by;
    if (typeof saved.last_updated === 'string') p.last_updated = saved.last_updated;
    return p;
}

// Check a policy coming from the admin page. Returns { ok, errors, policy }
function validatePolicy(input) {
    const errors = [];
    if (!input || typeof input !== 'object') {
        return { ok: false, errors: ['Policy must be an object'], policy: null };
    }

    const p = withDefaults(input);

    if (typeof input.enabled !== 'boolean') errors.push('enabled must be true or false');
    if (!POLICY_TYPES.includes(input.policyType)) errors.push(`policyType must be one of: ${POLICY_TYPES.join(', ')}`);
    if (!ENFORCEMENT_MODES.includes(input.enforcement)) errors.push(`enforcement must be one of: ${ENFORCEMENT_MODES.join(', ')}`);

    // Scheduled rule
    const s = input.scheduled || {};
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(s.hibernateTime))) {
        errors.push('scheduled.hibernateTime must be HH:MM (24-hour)');
    }
    if (!Array.isArray(s.days) || s.days.length === 0 ||
        !s.days.every(d => Number.isInteger(d) && d >= 0 && d <= 6)) {
        errors.push('scheduled.days must be a non-empty list of numbers 0-6');
    } else {
        p.scheduled.days = [...new Set(s.days)].sort((a, b) => a - b);
    }

    // Idle rule
    const idle = Number((input.idle || {}).timeoutMinutes);
    if (!Number.isInteger(idle) || idle < 5 || idle > 1440) {
        errors.push('idle.timeoutMinutes must be a whole number from 5 to 1440');
    } else {
        p.idle.timeoutMinutes = idle;
    }

    // Conditions
    const c = input.conditions || {};
    if (typeof c.skipWhenVisitorActive !== 'boolean') errors.push('conditions.skipWhenVisitorActive must be true or false');
    const warn = Number(c.warningMinutes);
    if (!Number.isInteger(warn) || warn < 0 || warn > 30) {
        errors.push('conditions.warningMinutes must be a whole number from 0 to 30');
    } else {
        p.conditions.warningMinutes = warn;
    }

    return { ok: errors.length === 0, errors, policy: p };
}

function readPolicy() {
    try {
        if (!fs.existsSync(POLICY_FILE)) return clone(DEFAULT_POLICY);
        return withDefaults(JSON.parse(fs.readFileSync(POLICY_FILE, 'utf8')));
    } catch (err) {
        console.error('Hibernation policy: could not read file, using defaults:', err.message);
        return clone(DEFAULT_POLICY);
    }
}

// Write to a temp file first, then rename, so a crash can't leave half a file
function writePolicy(policy, updatedBy) {
    const toSave = clone(policy);
    toSave.updated_by = updatedBy || 'unknown';
    toSave.last_updated = new Date().toISOString();

    const tmp = POLICY_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(toSave, null, 2), 'utf8');
    fs.renameSync(tmp, POLICY_FILE);
    return toSave;
}

module.exports = { DEFAULT_POLICY, POLICY_TYPES, ENFORCEMENT_MODES, validatePolicy, readPolicy, writePolicy };
