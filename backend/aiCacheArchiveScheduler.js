// aiCacheArchiveScheduler.js
// Runs the AI cache archive job automatically, using the schedule saved by the admin.
//
// Once a minute it asks: "has a scheduled time passed since the last run (or since the
// schedule was last saved)?" If yes, it runs the job once.
//   - Server was off at the scheduled time -> it catches up on the next start.
//   - Schedule just turned on or changed    -> it waits for the NEXT scheduled time.
//   - A run (even a failed one) counts as handled, so it never repeats every minute.
// Times use the SERVER's clock and time zone.
// BY ZHI RUO

const service = require('./aiCacheArchiveService');

const CHECK_EVERY_MS = 60 * 1000;   // how often the schedule is checked
const START_DELAY_MS = 30 * 1000;   // wait a little after startup before the first check

let timer = null;
let startTimer = null;

// Pure decision (easy to test): should the job run right now?
function shouldRun(settings, state, now, isRunning) {
    if (!settings.enabled) return { run: false, reason: 'schedule is off' };
    if (isRunning) return { run: false, reason: 'a run is already in progress' };

    const dueAt = service.lastDueTime(settings, now);

    // "Already handled" = the later of: the last run, and the moment the schedule was last saved
    const marks = [state.lastAttemptAt, settings.last_updated]
        .filter(Boolean)
        .map(value => new Date(value).getTime())
        .filter(ms => !isNaN(ms));
    const handledUpTo = marks.length ? Math.max(...marks) : 0;

    if (dueAt.getTime() > handledUpTo) {
        return { run: true, reason: `scheduled time ${dueAt.toISOString()} has passed`, dueAt };
    }
    return { run: false, reason: 'already handled' };
}

async function tick(now = new Date()) {
    try {
        const decision = shouldRun(service.readSettings(), service.readState(), now, service.isRunning());
        if (!decision.run) return decision;

        console.log(`🗄️ AI cache archive: starting scheduled run (${decision.reason})`);
        const result = await service.runArchive({ trigger: 'schedule', now });
        return { ...decision, result };
    } catch (err) {
        // e.g. a manual run started at the same moment; the next check will look again
        console.error('🗄️ AI cache archive scheduler:', err.message);
        return { run: false, error: err.message };
    }
}

function start() {
    if (timer || startTimer) return;
    const status = service.getStatus();
    console.log('🗄️ AI cache archive scheduler started' +
        (status.nextRunAt ? ` (next run ${new Date(status.nextRunAt).toLocaleString()})` : ' (schedule is off)'));

    startTimer = setTimeout(() => {
        startTimer = null;
        tick();
        timer = setInterval(tick, CHECK_EVERY_MS);
        if (timer.unref) timer.unref();
    }, START_DELAY_MS);
    if (startTimer.unref) startTimer.unref();
}

function stop() {
    if (startTimer) { clearTimeout(startTimer); startTimer = null; }
    if (timer) { clearInterval(timer); timer = null; }
}

module.exports = { start, stop, tick, shouldRun };
