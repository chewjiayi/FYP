// hibernationEvaluator.js
// Checks the hibernation policy once a minute, decides what SHOULD happen, and, in Enforce mode,
// really hibernates the computer, with safeguards:
//   1. A visible countdown (default 15 seconds) that any admin can CANCEL.
//   2. At the last moment it re-checks the policy and that no visitor became active.
//   3. If the computer slept during the countdown, the hibernation is cancelled (never "double sleep").
//   4. After the computer wakes up, hibernation is paused for a grace period (default 10 minutes),
//      and the idle timer restarts from the moment it woke. No sleep-wake-sleep loop.
//   5. Never twice within 10 minutes, and never when hibernation is not available on this computer.
// Dry Run mode still only logs what WOULD happen.
// BY ZHI RUO

const db = require('./db');
const store = require('./hibernationPolicyStore');
const realtime = require('./realtimeHub');   // pushes events to connected admin pages (WebSocket)
const action = require('./hibernateAction'); // the part that really sends the hibernate command

// ---------- Settings you may need to adjust ----------
// How we find the latest visitor activity. Must return ONE row with a column called last_activity.
// Change the table / column to match your database (see /api/test-db for the table list).
const ACTIVITY_QUERY = process.env.HIBERNATION_ACTIVITY_QUERY ||
    'SELECT MAX(created_at) AS last_activity FROM feedback';

const CHECK_EVERY_MS = 60 * 1000;   // how often the policy is checked
const ACTIVE_WINDOW_MINUTES = 5;    // activity this recent counts as "a visitor is using the kiosk"
const SCHEDULE_GRACE_MINUTES = 5;   // keep retrying a blocked scheduled hibernate for this long
const MAX_EVENTS = 50;              // recent decisions kept in memory

// Safety settings for the real hibernate
const COUNTDOWN_SECONDS = Number(process.env.HIBERNATE_COUNTDOWN_SECONDS) || 15;   // visible, cancellable countdown
const HANDOFF_MS = Number(process.env.HIBERNATE_HANDOFF_MS) || 2000;   // time for the last message to reach the pages
const MIN_BETWEEN_HIBERNATES_MS = 10 * 60 * 1000;         // never twice within this time
const RESUME_GAP_MS = 3 * CHECK_EVERY_MS;                 // no check for this long = the computer was asleep
const WAKE_GRACE_MS = (Number(process.env.HIBERNATE_WAKE_GRACE_MINUTES) || 10) * 60 * 1000;
const SLEPT_DURING_COUNTDOWN_MS = 30 * 1000;              // countdown ran this much too long = it slept

// ---------- State (lives in memory, resets when the server restarts) ----------
let timer = null;
let firstTimer = null;
let lastCheck = null;
let lastActivityChecked = null;
let activityErrorLogged = false;
const events = [];
const doneKeys = new Set();         // triggers we already acted on (so we don't repeat them)
const loggedBlocks = new Set();     // "blocked" messages already logged

let pending = null;                 // the hibernation that is counting down right now, if any
let lastHibernateAt = 0;            // when we last sent the hibernate command (wall clock, ms)
let lastTickWall = 0;               // when the last check ran (wall clock, ms)
let resumedAtWall = 0;              // when the computer last woke up
let graceUntilWall = 0;             // no hibernating before this moment

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

function addEvent(type, rule, message, enforcement, extra = {}) {
    const event = { time: new Date().toISOString(), type, rule, message, enforcement, ...extra };
    events.unshift(event);
    if (events.length > MAX_EVENTS) events.length = MAX_EVENTS;
    realtime.broadcast('hibernation:event', event);   // live to every connected admin page
    return event;
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
                minutesLeft: -diff,
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
                minutesLeft: Math.ceil(remaining),
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
        return { action: 'warn', rule: warnings[0].rule, key: warnings[0].key, reason: warnings[0].reason, minutesLeft: warnings[0].minutesLeft };
    }

    return { action: 'none', reason: 'nothing due' };
}


// ---------- Waking up ----------
function onResume(gapMs, wall) {
    resumedAtWall = wall;
    graceUntilWall = wall + WAKE_GRACE_MS;
    const awayMinutes = Math.round(gapMs / 60000);
    const afterHibernate = lastHibernateAt > 0 && lastHibernateAt >= wall - gapMs - CHECK_EVERY_MS;
    const message = `${afterHibernate ? 'The server woke up after hibernating' : 'The computer woke up'} ` +
        `(away about ${awayMinutes} min). Hibernation is paused for ${Math.round(WAKE_GRACE_MS / 60000)} minutes.`;
    console.log(`🛌 Hibernation: ${message}`);
    addEvent('resumed', null, message, 'info', { awayMinutes, afterHibernate });
    if (pending) cancelPending('system (the computer was asleep)');
}

// ---------- The real hibernation, step by step ----------
function sleepInterruptible(ms, p) {
    return new Promise(resolve => {
        if (p.cancelled) return resolve();
        p.wake = resolve;
        p.timer = setTimeout(resolve, ms);
    });
}

function plainSleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Stop a hibernation that is counting down. Returns true if there was one.
function cancelPending(username) {
    if (!pending) return false;
    pending.cancelled = true;
    pending.cancelledBy = username || 'an admin';
    clearTimeout(pending.timer);
    if (pending.wake) pending.wake();
    return true;
}

function getPending() {
    if (!pending) return null;
    const left = Math.max(0, Math.round((pending.startedAt + pending.countdownMs - Date.now()) / 1000));
    return {
        startedAt: new Date(pending.startedAt).toISOString(),
        secondsLeft: left,
        reason: pending.reason,
        manual: pending.manual,
        startedBy: pending.startedBy
    };
}

// manual = an admin pressed "Test hibernate now" (ignores the policy and visitor checks, but can be cancelled)
async function executeHibernationSequence({ reason, rule, manual = false, startedBy = 'schedule',
        countdownMs = COUNTDOWN_SECONDS * 1000, handoffMs = HANDOFF_MS, supportChecked = false } = {}) {
    const enforcement = manual ? 'manual' : 'enforce';

    if (pending) return { outcome: 'blocked', error: 'A hibernation is already counting down' };
    if (lastHibernateAt && Date.now() - lastHibernateAt < MIN_BETWEEN_HIBERNATES_MS) {
        const msg = 'Hibernation skipped: the computer hibernated less than 10 minutes ago';
        addEvent('blocked', rule, msg, enforcement);
        return { outcome: 'blocked', error: msg };
    }

    const p = pending = {
        startedAt: Date.now(), countdownMs, reason, rule, manual, startedBy,
        cancelled: false, cancelledBy: null, timer: null, wake: null
    };

    const cancelled = (why) => {
        addEvent('hibernate_cancelled', rule, `Hibernation cancelled: ${why}`, enforcement);
        return { outcome: 'cancelled', error: why };
    };

    try {
        if (!supportChecked) {
            const support = await action.check();
            if (support.available === false) {
                const msg = `Cannot hibernate: ${support.detail}.${support.hint ? ' ' + support.hint : ''}`;
                addEvent('hibernate_failed', rule, msg, enforcement);
                return { outcome: 'failed', error: msg };
            }
        }

        if (p.cancelled) return cancelled(`cancelled by ${p.cancelledBy}`);   // cancelled before the countdown even started

        const secs = Math.round(countdownMs / 1000);
        addEvent('hibernate_countdown', rule,
            `Hibernating in ${secs} seconds${manual ? ' (manual test by ' + startedBy + ')' : ': ' + reason}. An admin can cancel.`,
            enforcement, { secondsLeft: secs, manual, startedBy });
        await sleepInterruptible(countdownMs, p);

        if (p.cancelled) return cancelled(`cancelled by ${p.cancelledBy}`);
        if (Date.now() - p.startedAt > countdownMs + SLEPT_DURING_COUNTDOWN_MS) {
            return cancelled('the computer was asleep during the countdown');
        }

        // Last-moment re-check (not for a manual test: the admin asked for it)
        if (!manual) {
            const policy = store.readPolicy();
            if (!policy.enabled || policy.enforcement !== 'enforce') return cancelled('the policy was switched off or changed to Dry Run');
            if (policy.conditions.skipWhenVisitorActive) {
                const last = await getLastVisitorActivity();
                const idleMinutes = last ? (Date.now() - last.getTime()) / 60000 : null;
                if (last === null || idleMinutes < ACTIVE_WINDOW_MINUTES) {
                    return cancelled(last === null ? 'visitor activity could not be checked' : 'a visitor became active');
                }
            }
        }

        addEvent('hibernating', rule, 'Hibernating now. This page reconnects by itself when the server wakes up.', enforcement, { manual });
        await plainSleep(handoffMs);                       // let the message reach the pages
        if (p.cancelled) return cancelled(`cancelled by ${p.cancelledBy}`);

        const previous = lastHibernateAt;
        lastHibernateAt = Date.now();
        const result = await action.hibernate();
        if (!result.ok) {
            lastHibernateAt = previous;
            const msg = `The hibernate command failed: ${result.error}`;
            addEvent('hibernate_failed', rule, msg, enforcement);
            return { outcome: 'failed', error: msg };
        }
        return { outcome: 'hibernated', command: result.command };
    } finally {
        clearTimeout(p.timer);
        if (pending === p) pending = null;
    }
}

// "Test hibernate now" for the admin page. Resolves as soon as the countdown has started.
async function hibernateNow({ username = 'admin', seconds = COUNTDOWN_SECONDS, handoffMs } = {}) {
    if (pending) return { started: false, error: 'A hibernation is already counting down' };
    if (lastHibernateAt && Date.now() - lastHibernateAt < MIN_BETWEEN_HIBERNATES_MS) {
        return { started: false, error: 'The computer hibernated less than 10 minutes ago' };
    }
    const support = await action.check();
    if (support.available === false) {
        return { started: false, error: `${support.detail}.${support.hint ? ' ' + support.hint : ''}` };
    }
    if (pending) return { started: false, error: 'A hibernation is already counting down' };

    const sequence = executeHibernationSequence({
        reason: 'manual test', rule: 'manual', manual: true, startedBy: username,
        countdownMs: seconds * 1000, handoffMs, supportChecked: true
    }).catch(err => ({ outcome: 'failed', error: err.message }));
    return { started: true, seconds, sequence };
}

// ---------- Acting on the decision ----------
function performHibernation(policy, result) {
    if (policy.enforcement === 'enforce') {
        return executeHibernationSequence({ reason: result.reason, rule: result.rule })
            .catch(err => {
                console.error('🛌 Hibernation sequence failed:', err);
                addEvent('hibernate_failed', result.rule, `Hibernation failed: ${err.message}`, 'enforce');
                return { outcome: 'failed', error: err.message };
            });
    }
    const msg = `[DRY RUN] Would hibernate now: ${result.reason}`;
    console.log(`🛌 Hibernation: ${msg}`);
    addEvent('would_hibernate', result.rule, msg, 'dry_run');
    return null;
}

async function tick(now = new Date()) {
    try {
        // Did the computer just wake up? (no check has run for a long time)
        const wall = Date.now();
        if (lastTickWall && wall - lastTickWall > RESUME_GAP_MS) onResume(wall - lastTickWall, wall);
        lastTickWall = wall;

        if (graceUntilWall && wall < graceUntilWall) {
            return { action: 'none', reason: 'grace period after waking up' };
        }

        const policy = store.readPolicy();
        let lastActivity = await getLastVisitorActivity();
        // After waking up, "no visitor activity" is counted from the moment the computer woke
        if (resumedAtWall && lastActivity && lastActivity.getTime() < resumedAtWall) {
            lastActivity = new Date(resumedAtWall);
        }

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
            addEvent('warning', result.rule, `Warning: ${result.reason}`, policy.enforcement, { minutesLeft: result.minutesLeft });
        } else if (result.action === 'hibernate') {
            const sequence = performHibernation(policy, result);   // runs on its own; the countdown can take a while
            return sequence ? { ...result, sequence } : result;
        }
        return result;
    } catch (err) {
        console.error('🛌 Hibernation check failed:', err);
        return { action: 'error', reason: err.message };
    }
}

function start() {
    if (timer) return;
    console.log(`🛌 Hibernation policy checker started (checks every minute; Dry Run only logs, Enforce hibernates after a ${COUNTDOWN_SECONDS}s cancellable countdown)`);
    realtime.setSnapshotProvider(() => ({ events: events.slice(0, 20), pending: getPending() }));
    firstTimer = setTimeout(() => { firstTimer = null; tick(); }, 5000);   // first check shortly after startup
    timer = setInterval(tick, CHECK_EVERY_MS);
}

function stop() {
    if (firstTimer) { clearTimeout(firstTimer); firstTimer = null; }
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
        pending: getPending(),
        countdownSeconds: COUNTDOWN_SECONDS,
        wakeGraceMinutes: WAKE_GRACE_MS / 60000,
        graceUntil: graceUntilWall && graceUntilWall > Date.now() ? new Date(graceUntilWall).toISOString() : null,
        lastHibernateAt: lastHibernateAt ? new Date(lastHibernateAt).toISOString() : null,
        events
    };
}

// For tests only
function _reset() {
    stop();
    if (pending) { pending.cancelled = true; pending.cancelledBy = 'reset'; clearTimeout(pending.timer); if (pending.wake) pending.wake(); }
    pending = null; lastHibernateAt = 0; lastTickWall = 0; resumedAtWall = 0; graceUntilWall = 0;
    events.length = 0; doneKeys.clear(); loggedBlocks.clear(); lastCheck = null; lastActivityChecked = null;
}

module.exports = { start, stop, tick, getStatus, evaluatePolicy, hibernateNow, cancelPending, getPending, _reset };
