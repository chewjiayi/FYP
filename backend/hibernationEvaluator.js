// hibernationEvaluator.js
// Checks the hibernation policy once a minute and decides what SHOULD happen.
//
// IMPORTANT: in this version nothing ever hibernates the machine.
//   - Dry Run  -> logs "WOULD hibernate now"
//   - Enforce  -> logs that the real OS hibernate action is not built yet
// The real action belongs to the "system-level hibernation" enhancement.
// BY ZHI RUO

const db = require('./db');
const store = require('./hibernationPolicyStore');

// ---------- Settings you may need to adjust ----------
// How we find the latest visitor activity. Must return ONE row with a column called last_activity.
// Change the table / column to match your database (see /api/test-db for the table list).
const ACTIVITY_QUERY = process.env.HIBERNATION_ACTIVITY_QUERY ||
    'SELECT MAX(created_at) AS last_activity FROM feedback';

const CHECK_EVERY_MS = 60 * 1000;   // how often the policy is checked
const ACTIVE_WINDOW_MINUTES = 5;    // activity this recent counts as "a visitor is using the kiosk"
const SCHEDULE_GRACE_MINUTES = 5;   // keep retrying a blocked scheduled hibernate for this long
const MAX_EVENTS = 50;              // recent decisions kept in memory

// ---------- State (lives in memory, resets when the server restarts) ----------
let timer = null;
let lastCheck = null;
let lastActivityChecked = null;
let activityErrorLogged = false;
const events = [];
const doneKeys = new Set();         // triggers we already acted on (so we don't repeat them)
const loggedBlocks = new Set();     // "blocked" messages already logged

// ---------- Small helpers ----------
function minutesOfDay(d) {
    return d.getHours() * 60 + d.getMinutes();
}

function parseHHMM(text) {
    const [h, m] = String(text).split(':').map(Number);
    return h * 60 + m;
}

function dayKey(d) {
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function addEvent(type, rule, message, enforcement) {
    events.unshift({ time: new Date().toISOString(), type, rule, message, enforcement });
    if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
}

// ---------- Visitor activity ----------
function getLastVisitorActivity() {
    return new Promise(resolve => {
        db.query(ACTIVITY_QUERY, (err, rows) => {
            if (err) {
                if (!activityErrorLogged) {
                    console.warn('🛌 Hibernation: could not read visitor activity (check ACTIVITY_QUERY):', err.message);
                    activityErrorLogged = true;
                }
                return resolve(null);
            }
            const value = rows && rows[0] && rows[0].last_activity;
            const date = value ? new Date(value) : null;
            resolve(date && !isNaN(date.getTime()) ? date : null);
        });
    });
}

// ---------- The decision (pure function, easy to test) ----------
// Returns { action: 'none' | 'warn' | 'blocked' | 'hibernate', rule, reason, key }
function evaluatePolicy(policy, now, lastActivity) {
    if (!policy.enabled) return { action: 'none', reason: 'policy is off' };

    const activityKnown = lastActivity instanceof Date && !isNaN(lastActivity.getTime());
    const idleMinutes = activityKnown ? (now.getTime() - lastActivity.getTime()) / 60000 : null;
    // If we can't tell, play safe and treat it as "a visitor might be active"
    const visitorActive = !activityKnown || idleMinutes < ACTIVE_WINDOW_MINUTES;
    const warnMinutes = policy.conditions.warningMinutes;

    const due = [];
    const warnings = [];

    // Rule 1: scheduled time
    if (policy.policyType !== 'idle' && policy.scheduled.days.includes(now.getDay())) {
        const diff = minutesOfDay(now) - parseHHMM(policy.scheduled.hibernateTime);
        if (diff >= 0 && diff < SCHEDULE_GRACE_MINUTES) {
            due.push({
                rule: 'scheduled',
                key: `sched-${dayKey(now)}`,
                reason: `scheduled time ${policy.scheduled.hibernateTime} reached`
            });
        } else if (warnMinutes > 0 && diff < 0 && -diff <= warnMinutes) {
            warnings.push({
                rule: 'scheduled',
                key: `sched-warn-${dayKey(now)}`,
                reason: `scheduled hibernate in ${-diff} minute(s)`
            });
        }
    }

    // Rule 2: idle timeout (needs a known activity time)
    if (policy.policyType !== 'scheduled' && activityKnown) {
        const remaining = policy.idle.timeoutMinutes - idleMinutes;
        if (remaining <= 0) {
            due.push({
                rule: 'idle',
                key: `idle-${lastActivity.getTime()}`,
                reason: `no visitor activity for ${Math.floor(idleMinutes)} minutes (limit ${policy.idle.timeoutMinutes})`
            });
        } else if (warnMinutes > 0 && remaining <= warnMinutes) {
            warnings.push({
                rule: 'idle',
                key: `idle-warn-${lastActivity.getTime()}`,
                reason: `idle limit reached in ${Math.ceil(remaining)} minute(s)`
            });
        }
    }

    if (due.length > 0) {
        const trigger = due[0];
        if (policy.conditions.skipWhenVisitorActive && visitorActive) {
            return {
                action: 'blocked',
                rule: trigger.rule,
                key: trigger.key,
                reason: activityKnown
                    ? `${trigger.reason}, but a visitor was active in the last ${ACTIVE_WINDOW_MINUTES} minutes`
                    : `${trigger.reason}, but visitor activity is unknown (check the activity query)`
            };
        }
        return { action: 'hibernate', rule: trigger.rule, key: trigger.key, reason: trigger.reason };
    }

    if (warnings.length > 0) {
        return { action: 'warn', rule: warnings[0].rule, key: warnings[0].key, reason: warnings[0].reason };
    }

    return { action: 'none', reason: 'nothing due' };
}

// ---------- Acting on the decision ----------
function performHibernation(policy, result) {
    if (policy.enforcement === 'enforce') {
        // Deliberately NOT hibernating yet. Added in the system-level hibernation step.
        const msg = `ENFORCE requested (${result.reason}) but the OS hibernate action is not installed yet`;
        console.log(`🛌 Hibernation: ${msg}`);
        addEvent('enforce_not_available', result.rule, msg, 'enforce');
        return;
    }
    const msg = `[DRY RUN] Would hibernate now: ${result.reason}`;
    console.log(`🛌 Hibernation: ${msg}`);
    addEvent('would_hibernate', result.rule, msg, 'dry_run');
}

async function tick() {
    try {
        const policy = store.readPolicy();
        const now = new Date();
        const lastActivity = await getLastVisitorActivity();

        lastCheck = now.toISOString();
        lastActivityChecked = lastActivity ? lastActivity.toISOString() : null;

        const result = evaluatePolicy(policy, now, lastActivity);
        if (result.action === 'none') return result;

        if (result.action === 'blocked') {
            const logKey = `${result.key}|${result.reason}`;
            if (!loggedBlocks.has(logKey)) {
                loggedBlocks.add(logKey);
                console.log(`🛌 Hibernation: skipped - ${result.reason}`);
                addEvent('blocked', result.rule, `Skipped: ${result.reason}`, policy.enforcement);
            }
            return result;   // not marked done, so it is retried on the next check
        }

        if (doneKeys.has(result.key)) return { action: 'none', reason: 'already handled' };
        doneKeys.add(result.key);
        if (doneKeys.size > 200) doneKeys.clear();
        if (loggedBlocks.size > 200) loggedBlocks.clear();

        if (result.action === 'warn') {
            console.log(`🛌 Hibernation: warning - ${result.reason}`);
            addEvent('warning', result.rule, `Warning: ${result.reason}`, policy.enforcement);
        } else if (result.action === 'hibernate') {
            performHibernation(policy, result);
        }
        return result;
    } catch (err) {
        console.error('🛌 Hibernation check failed:', err);
        return { action: 'error', reason: err.message };
    }
}

function start() {
    if (timer) return;
    console.log('🛌 Hibernation policy checker started (checks every minute, Dry Run safe)');
    setTimeout(tick, 5000);                 // first check shortly after startup
    timer = setInterval(tick, CHECK_EVERY_MS);
}

function stop() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

function getStatus() {
    return {
        running: !!timer,
        checkEverySeconds: CHECK_EVERY_MS / 1000,
        lastCheck,
        lastVisitorActivity: lastActivityChecked,
        events
    };
}

module.exports = { start, stop, tick, getStatus, evaluatePolicy };
