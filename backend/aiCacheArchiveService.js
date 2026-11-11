// aiCacheArchiveService.js
// Archives OLD entries of the AI analysis cache to local disk, then removes them from the live cache.
//
//   settings : when to run (weekly by default) + how old an entry must be     -> cache/ai-cache-archive-schedule.json
//   state    : when it last ran + a short history                             -> cache/ai-cache-archive-state.json
//   archives : <ARCHIVE_DIR>/ai-cache/ai-cache-YYYYMMDD-HHMMSS.json (+ .sha256 checksum file)
//
// "Old" = not used for N days (default 30). Recently used entries stay in the live cache so
// repeated feedback is still answered quickly. Entries are only removed AFTER the archive file
// has been written, re-read and checked.
// BY ZHI RUO

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cacheStore = require('./feedbackAnalysisCacheStore');

const DATA_DIR = path.join(__dirname, 'cache');
const SETTINGS_FILE = path.join(DATA_DIR, 'ai-cache-archive-schedule.json');
const STATE_FILE = path.join(DATA_DIR, 'ai-cache-archive-state.json');
const ARCHIVE_ROOT = process.env.ARCHIVE_DIR || path.join(__dirname, '..', 'archives');
const AI_ARCHIVE_DIR = path.join(ARCHIVE_ROOT, 'ai-cache');
const FILE_PATTERN = /^ai-cache-\d{8}-\d{6}\.json$/;
const MAX_HISTORY = 20;

const FREQUENCIES = ['daily', 'weekly', 'monthly'];

const DEFAULT_SETTINGS = {
    enabled: false,              // opt-in: nothing runs until an admin turns it on
    frequency: 'weekly',
    dayOfWeek: 0,                // weekly: 0 = Sunday ... 6 = Saturday
    dayOfMonth: 1,               // monthly: 1 to 28
    time: '02:00',               // 24h HH:MM, server local time
    unusedForDays: 30,           // archive entries not used for this many days
    keepArchives: 12,            // keep this many archive files, delete older ones
    updated_by: 'system',
    last_updated: null
};

let running = false;

class ArchiveJobError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// ---------- Small helpers ----------
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function sha256(text) { return crypto.createHash('sha256').update(text).digest('hex'); }
function pad(n) { return String(n).padStart(2, '0'); }

function stamp(d) {
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function readJson(file, fallback) {
    try {
        return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
    } catch (err) {
        console.error(`AI cache archive: could not read ${path.basename(file)}:`, err.message);
        return fallback;
    }
}

function writeJsonAtomic(file, data) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, file);
}

// ---------- Settings ----------
function readSettings() {
    const saved = readJson(SETTINGS_FILE, null);
    const s = clone(DEFAULT_SETTINGS);
    if (!saved || typeof saved !== 'object') return s;
    if (typeof saved.enabled === 'boolean') s.enabled = saved.enabled;
    if (FREQUENCIES.includes(saved.frequency)) s.frequency = saved.frequency;
    ['dayOfWeek', 'dayOfMonth', 'unusedForDays', 'keepArchives'].forEach(k => {
        if (Number.isInteger(saved[k])) s[k] = saved[k];
    });
    if (typeof saved.time === 'string') s.time = saved.time;
    if (typeof saved.updated_by === 'string') s.updated_by = saved.updated_by;
    if (typeof saved.last_updated === 'string') s.last_updated = saved.last_updated;
    return s;
}

function validateSettings(input) {
    const errors = [];
    if (!input || typeof input !== 'object') return { ok: false, errors: ['Settings must be an object'] };

    if (typeof input.enabled !== 'boolean') errors.push('enabled must be true or false');
    if (!FREQUENCIES.includes(input.frequency)) errors.push(`frequency must be one of: ${FREQUENCIES.join(', ')}`);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(input.time))) errors.push('time must be HH:MM (24-hour)');

    const range = (key, min, max, label) => {
        const v = Number(input[key]);
        if (!Number.isInteger(v) || v < min || v > max) errors.push(`${label} must be a whole number from ${min} to ${max}`);
    };
    range('dayOfWeek', 0, 6, 'dayOfWeek');
    range('dayOfMonth', 1, 28, 'dayOfMonth');
    range('unusedForDays', 1, 365, 'unusedForDays');
    range('keepArchives', 1, 104, 'keepArchives');

    if (errors.length) return { ok: false, errors };

    return {
        ok: true,
        errors: [],
        settings: {
            ...clone(DEFAULT_SETTINGS),
            enabled: input.enabled,
            frequency: input.frequency,
            dayOfWeek: Number(input.dayOfWeek),
            dayOfMonth: Number(input.dayOfMonth),
            time: input.time,
            unusedForDays: Number(input.unusedForDays),
            keepArchives: Number(input.keepArchives)
        }
    };
}

function writeSettings(settings, username) {
    const toSave = { ...settings, updated_by: username || 'unknown', last_updated: new Date().toISOString() };
    writeJsonAtomic(SETTINGS_FILE, toSave);
    return toSave;
}

// ---------- When is it due? ----------
function parseTime(hhmm) {
    const [h, m] = String(hhmm).split(':').map(Number);
    return { h, m };
}

// The most recent scheduled moment that is NOT in the future
function lastDueTime(s, now) {
    const { h, m } = parseTime(s.time);
    const y = now.getFullYear(), mo = now.getMonth(), d = now.getDate();

    if (s.frequency === 'daily') {
        let c = new Date(y, mo, d, h, m, 0, 0);
        if (c > now) c = new Date(y, mo, d - 1, h, m, 0, 0);
        return c;
    }
    if (s.frequency === 'weekly') {
        const back = (now.getDay() - s.dayOfWeek + 7) % 7;
        let c = new Date(y, mo, d - back, h, m, 0, 0);
        if (c > now) c = new Date(y, mo, d - back - 7, h, m, 0, 0);
        return c;
    }
    let c = new Date(y, mo, s.dayOfMonth, h, m, 0, 0);
    if (c > now) c = new Date(y, mo - 1, s.dayOfMonth, h, m, 0, 0);
    return c;
}

// The next scheduled moment after the last one
function nextDueTime(s, now) {
    const last = lastDueTime(s, now);
    const { h, m } = parseTime(s.time);
    const y = last.getFullYear(), mo = last.getMonth(), d = last.getDate();
    if (s.frequency === 'daily') return new Date(y, mo, d + 1, h, m, 0, 0);
    if (s.frequency === 'weekly') return new Date(y, mo, d + 7, h, m, 0, 0);
    return new Date(y, mo + 1, s.dayOfMonth, h, m, 0, 0);
}

// ---------- State (last run + history) ----------
function readState() {
    const st = readJson(STATE_FILE, null);
    return {
        lastAttemptAt: st && st.lastAttemptAt ? st.lastAttemptAt : null,
        history: st && Array.isArray(st.history) ? st.history : []
    };
}

function recordRun(result) {
    const st = readState();
    st.lastAttemptAt = result.finishedAt;
    st.history.unshift(result);
    st.history = st.history.slice(0, MAX_HISTORY);
    writeJsonAtomic(STATE_FILE, st);
}

function isRunning() { return running; }

function getStatus(now = new Date()) {
    const settings = readSettings();
    const st = readState();
    return {
        running,
        archiveDir: AI_ARCHIVE_DIR,
        lastRun: st.history[0] || null,
        history: st.history,
        nextRunAt: settings.enabled ? nextDueTime(settings, now).toISOString() : null
    };
}

// ---------- Archive files ----------
function listArchiveFiles() {
    if (!fs.existsSync(AI_ARCHIVE_DIR)) return [];
    return fs.readdirSync(AI_ARCHIVE_DIR)
        .filter(name => FILE_PATTERN.test(name))
        .sort()
        .reverse()
        .map(name => {
            const st = fs.statSync(path.join(AI_ARCHIVE_DIR, name));
            return { name, sizeBytes: st.size, modifiedAt: st.mtime.toISOString(), hasChecksum: fs.existsSync(path.join(AI_ARCHIVE_DIR, name + '.sha256')) };
        });
}

function getArchiveFilePath(name) {
    if (!FILE_PATTERN.test(String(name))) throw new ArchiveJobError('Invalid archive name');
    const file = path.join(AI_ARCHIVE_DIR, name);
    if (!fs.existsSync(file)) throw new ArchiveJobError('Archive not found', 404);
    return file;
}

// Write the archive, read it back, and only then move it into place
function writeVerifiedArchive(finalPath, payload) {
    const text = JSON.stringify(payload, null, 2);
    const hash = sha256(text);
    fs.mkdirSync(path.dirname(finalPath), { recursive: true });

    const tmp = finalPath + '.tmp';
    const tmpSum = finalPath + '.sha256.tmp';
    try {
        fs.writeFileSync(tmp, text, 'utf8');

        const back = fs.readFileSync(tmp, 'utf8');
        if (sha256(back) !== hash) throw new Error('checksum of the written file does not match');
        const parsed = JSON.parse(back);
        if (!Array.isArray(parsed.entries) || parsed.entries.length !== payload.entries.length) {
            throw new Error('entry count of the written file does not match');
        }

        fs.writeFileSync(tmpSum, `${hash}  ${path.basename(finalPath)}\n`, 'utf8');
        fs.renameSync(tmp, finalPath);
        fs.renameSync(tmpSum, finalPath + '.sha256');
    } finally {
        [tmp, tmpSum].forEach(f => { if (fs.existsSync(f)) fs.rmSync(f, { force: true }); });
    }
    return { bytes: Buffer.byteLength(text), sha256: hash };
}

// Keep only the newest N archive files (and delete their checksum files too)
function pruneArchives(keep) {
    const all = listArchiveFiles();            // newest first
    const old = all.slice(keep);
    old.forEach(f => {
        fs.rmSync(path.join(AI_ARCHIVE_DIR, f.name), { force: true });
        fs.rmSync(path.join(AI_ARCHIVE_DIR, f.name + '.sha256'), { force: true });
    });
    return old.length;
}

// ---------- The job ----------
async function runArchive({ trigger = 'manual', username = 'system', now = new Date() } = {}) {
    if (running) throw new ArchiveJobError('An AI cache archive is already running. Try again in a moment.', 409);
    running = true;

    const startedAt = new Date();
    const result = {
        trigger,
        startedBy: trigger === 'schedule' ? 'schedule' : username,
        startedAt: startedAt.toISOString(),
        finishedAt: null,
        status: 'failed',
        archived: 0,
        removed: 0,
        keptBecauseUsedAgain: 0,
        file: null,
        sizeBytes: 0,
        deletedOldArchives: 0,
        message: ''
    };

    try {
        const settings = readSettings();
        const cutoff = new Date(now.getTime() - settings.unusedForDays * 86400000);

        const entries = await cacheStore.getAllEntries();
        // an entry with an unreadable date is treated as "not old" so it is never removed by mistake
        const stale = entries.filter(e => {
            const t = new Date(e.lastUsedAt).getTime();
            return !isNaN(t) && t < cutoff.getTime();
        });

        if (stale.length === 0) {
            result.status = 'nothing';
            result.message = `Nothing to archive: no entries unused for ${settings.unusedForDays} days (cache has ${entries.length}).`;
        } else {
            const count = (key) => stale.reduce((acc, e) => { acc[e[key]] = (acc[e[key]] || 0) + 1; return acc; }, {});
            const fileName = `ai-cache-${stamp(now)}.json`;
            const finalPath = path.join(AI_ARCHIVE_DIR, fileName);
            if (fs.existsSync(finalPath)) throw new ArchiveJobError('An archive with this name already exists', 409);

            const written = writeVerifiedArchive(finalPath, {
                archiveType: 'ai-analysis-cache',
                version: 1,
                createdAt: now.toISOString(),
                createdBy: result.startedBy,
                storageMode: cacheStore.getStorageMode(),
                criteria: { unusedForDays: settings.unusedForDays, cutoff: cutoff.toISOString() },
                counts: { entries: stale.length, bySentiment: count('sentiment'), byMode: count('mode') },
                entries: stale
            });

            result.archived = stale.length;
            result.file = fileName;
            result.sizeBytes = written.bytes;

            // The file is safe on disk, so now remove the entries from the live cache
            try {
                const removal = await cacheStore.removeEntries(stale.map(e => e.cacheKey), { notUsedSince: cutoff });
                result.removed = removal.removed;
                result.keptBecauseUsedAgain = removal.skippedRecentlyUsed;
                result.status = 'success';
                result.message = `Archived ${stale.length} entries to ${fileName} and removed ${removal.removed} from the live cache.`;
            } catch (err) {
                result.status = 'failed';
                result.message = `Archive ${fileName} was saved, but the live cache could not be cleaned: ${err.message}`;
            }
        }

        result.deletedOldArchives = pruneArchives(settings.keepArchives);
        if (result.deletedOldArchives > 0) result.message += ` Deleted ${result.deletedOldArchives} old archive file(s).`;
    } catch (err) {
        result.status = 'failed';
        result.message = 'Archive failed: ' + err.message;
        if (err instanceof ArchiveJobError && err.status === 409) {
            running = false;
            throw err;
        }
    } finally {
        result.finishedAt = new Date().toISOString();
        running = false;
        try { recordRun(result); } catch (err) { console.error('AI cache archive: could not save run history:', err.message); }
    }

    console.log(`🗄️ AI cache archive (${trigger}): ${result.status} - ${result.message}`);
    return result;
}

module.exports = {
    ArchiveJobError, DEFAULT_SETTINGS, AI_ARCHIVE_DIR,
    readSettings, validateSettings, writeSettings,
    lastDueTime, nextDueTime, readState, getStatus, isRunning,
    listArchiveFiles, getArchiveFilePath, runArchive
};
