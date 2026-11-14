// hardwareMonitor.js
// Records CPU, memory, GPU and storage usage on the server so the System Status page can draw
// history graphs (and, in the next step, forecasts) instead of only what the browser has seen.
//
// Two layers of history:
//   raw      one point per sample, kept for the last 24 hours (sample every 10s / 30s / 1 min / 5 min)
//   buckets  5-minute averages (plus peaks), kept for the retention period (default 30 days)
// Buckets are saved to cache/hardware-history.json, so history survives a server restart.
// BY ZHI RUO

const fs = require('fs');
const path = require('path');
const si = require('systeminformation');

const DATA_DIR = path.join(__dirname, 'cache');
const SETTINGS_FILE = path.join(DATA_DIR, 'hardware-monitor-settings.json');
const HISTORY_FILE = path.join(DATA_DIR, 'hardware-history.json');

const BUCKET_MS = 5 * 60 * 1000;
const RAW_WINDOW_MS = 24 * 60 * 60 * 1000;
const STORAGE_EVERY_MS = 60 * 1000;         // storage changes slowly, so it is read once a minute at most
const SAMPLE_TIMEOUT_MS = 20 * 1000;        // a sample that takes longer than this is abandoned
const MAX_POINTS = 240;                     // a graph never gets more points than this
const INTERVAL_OPTIONS = [10, 30, 60, 300]; // seconds between samples

const RANGES = {
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
};

const DEFAULT_SETTINGS = {
    enabled: true,
    sampleIntervalSeconds: 30,
    retentionDays: 30,
    updated_by: 'system',
    last_updated: null
};

class MonitorError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// ---------- State (in memory) ----------
let settings = { ...DEFAULT_SETTINGS };
let raw = [];            // { t, cpu, mem, gpu, st, stTotal }
let buckets = [];        // { t, cpu, cpuMax, mem, memMax, gpu, gpuMax, st, stTotal }
let open = null;         // the 5-minute bucket currently being filled
let latest = null;
let timer = null;
let firstTimer = null;
let sampling = false;
let lastSampleAt = null;
let lastError = null;
let gpuName = null;
let storageCache = null; // { t, mount, usedGB, totalGB }

const round1 = n => Math.round(n * 10) / 10;

// ---------- Settings ----------
function readSettings() {
    try {
        if (!fs.existsSync(SETTINGS_FILE)) return { ...DEFAULT_SETTINGS };
        const saved = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        const s = { ...DEFAULT_SETTINGS };
        if (typeof saved.enabled === 'boolean') s.enabled = saved.enabled;
        if (INTERVAL_OPTIONS.includes(saved.sampleIntervalSeconds)) s.sampleIntervalSeconds = saved.sampleIntervalSeconds;
        if (Number.isInteger(saved.retentionDays) && saved.retentionDays >= 1 && saved.retentionDays <= 90) {
            s.retentionDays = saved.retentionDays;
        }
        if (typeof saved.updated_by === 'string') s.updated_by = saved.updated_by;
        if (typeof saved.last_updated === 'string') s.last_updated = saved.last_updated;
        return s;
    } catch (err) {
        console.error('Hardware monitor: could not read settings, using defaults:', err.message);
        return { ...DEFAULT_SETTINGS };
    }
}

function validateSettings(input) {
    const errors = [];
    if (!input || typeof input !== 'object') return { ok: false, errors: ['Settings must be an object'] };

    if (typeof input.enabled !== 'boolean') errors.push('enabled must be true or false');
    const interval = Number(input.sampleIntervalSeconds);
    if (!INTERVAL_OPTIONS.includes(interval)) {
        errors.push(`sampleIntervalSeconds must be one of: ${INTERVAL_OPTIONS.join(', ')}`);
    }
    const days = Number(input.retentionDays);
    if (!Number.isInteger(days) || days < 1 || days > 90) errors.push('retentionDays must be a whole number from 1 to 90');

    if (errors.length) return { ok: false, errors };
    return { ok: true, errors: [], settings: { enabled: input.enabled, sampleIntervalSeconds: interval, retentionDays: days } };
}

// Save new settings and apply them straight away (new interval, new retention)
function updateSettings(newSettings, username) {
    settings = {
        ...DEFAULT_SETTINGS,
        ...newSettings,
        updated_by: username || 'unknown',
        last_updated: new Date().toISOString()
    };
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = SETTINGS_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(settings, null, 2), 'utf8');
    fs.renameSync(tmp, SETTINGS_FILE);

    pruneBuckets(latest ? latest.t : Date.now());
    trimRaw();
    schedule();
    return { ...settings };
}

// ---------- History file ----------
function loadHistory() {
    buckets = [];
    try {
        if (!fs.existsSync(HISTORY_FILE)) return;
        const saved = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
        if (!saved || !Array.isArray(saved.buckets)) return;
        buckets = saved.buckets
            .filter(b => b && Number.isFinite(b.t) && Number.isFinite(b.cpu) && Number.isFinite(b.mem))
            .sort((a, b) => a.t - b.t);
        pruneBuckets(Date.now());
    } catch (err) {
        console.error('Hardware monitor: history file unreadable, starting with empty history:', err.message);
        buckets = [];
    }
}

function saveHistory() {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        const tmp = HISTORY_FILE + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify({ version: 1, bucketSeconds: BUCKET_MS / 1000, savedAt: new Date().toISOString(), buckets }), 'utf8');
        fs.renameSync(tmp, HISTORY_FILE);
    } catch (err) {
        console.error('Hardware monitor: could not save history:', err.message);
    }
}

// ---------- Taking in samples ----------
function trimRaw() {
    const maxRaw = Math.ceil(RAW_WINDOW_MS / (settings.sampleIntervalSeconds * 1000)) + 10;
    const newest = raw.length ? raw[raw.length - 1].t : Date.now();
    const cutoff = newest - RAW_WINDOW_MS;
    while (raw.length && (raw[0].t < cutoff || raw.length > maxRaw)) raw.shift();
}

function pruneBuckets(now) {
    const cutoff = now - settings.retentionDays * 24 * 60 * 60 * 1000;
    while (buckets.length && buckets[0].t < cutoff) buckets.shift();
}

function newOpen(start) {
    return { start, n: 0, cpuSum: 0, cpuMax: 0, memSum: 0, memMax: 0, gpuSum: 0, gpuN: 0, gpuMax: 0, st: null, stTotal: null };
}

function openToBucket(o) {
    return {
        t: o.start,
        cpu: round1(o.cpuSum / o.n), cpuMax: round1(o.cpuMax),
        mem: round1(o.memSum / o.n), memMax: round1(o.memMax),
        gpu: o.gpuN ? round1(o.gpuSum / o.gpuN) : null,
        gpuMax: o.gpuN ? round1(o.gpuMax) : null,
        st: o.st, stTotal: o.stTotal
    };
}

function closeOpenBucket() {
    if (!open || open.n === 0) { open = null; return; }
    buckets.push(openToBucket(open));
    open = null;
    pruneBuckets(latest ? latest.t : Date.now());
    saveHistory();
}

// sample = { t, cpu, mem, gpu (or null), st, stTotal }. Returns false if it was ignored.
function ingestSample(s) {
    if (!s || !Number.isFinite(s.t) || !Number.isFinite(s.cpu) || !Number.isFinite(s.mem)) return false;
    if (raw.length && s.t <= raw[raw.length - 1].t) return false;   // clock went backwards or duplicate

    raw.push(s);
    latest = s;
    trimRaw();

    const start = Math.floor(s.t / BUCKET_MS) * BUCKET_MS;
    if (open && open.start !== start) closeOpenBucket();
    if (!open) open = newOpen(start);

    open.n++;
    open.cpuSum += s.cpu; open.cpuMax = Math.max(open.cpuMax, s.cpu);
    open.memSum += s.mem; open.memMax = Math.max(open.memMax, s.mem);
    if (Number.isFinite(s.gpu)) { open.gpuSum += s.gpu; open.gpuN++; open.gpuMax = Math.max(open.gpuMax, s.gpu); }
    if (Number.isFinite(s.st)) { open.st = s.st; open.stTotal = s.stTotal; }
    return true;
}

// ---------- Reading the hardware ----------
async function readStorage(now) {
    if (storageCache && now - storageCache.t < STORAGE_EVERY_MS) return storageCache;

    const fsSize = await si.fsSize();
    const appPath = path.resolve(process.cwd()).toLowerCase();
    const drive = fsSize
        .filter(d => appPath.startsWith(String(d.mount).toLowerCase()))
        .sort((a, b) => b.mount.length - a.mount.length)[0] || fsSize[0];

    storageCache = drive
        ? { t: now, mount: drive.mount, usedGB: round1(drive.used / 1073741824), totalGB: round1(drive.size / 1073741824) }
        : { t: now, mount: null, usedGB: null, totalGB: null };
    return storageCache;
}

async function collectSample(now = Date.now()) {
    const [load, mem, graphics] = await Promise.all([si.currentLoad(), si.mem(), si.graphics()]);

    // Prefer the GPU that reports usage (e.g. NVIDIA over integrated graphics)
    const gpus = (graphics && graphics.controllers) || [];
    const gpu = gpus.find(g => g.utilizationGpu !== null && g.utilizationGpu !== undefined) || gpus[0] || null;
    if (gpu) gpuName = gpu.model || gpuName;

    const storage = await readStorage(now);
    const usedMem = mem.total - mem.available;

    return {
        t: now,
        cpu: round1(load.currentLoad),
        mem: round1((usedMem / mem.total) * 100),
        gpu: gpu && Number.isFinite(gpu.utilizationGpu) ? round1(gpu.utilizationGpu) : null,
        st: storage.usedGB,
        stTotal: storage.totalGB
    };
}

function withTimeout(promise, ms) {
    let t;
    const timeout = new Promise((_, reject) => { t = setTimeout(() => reject(new Error('sample timed out')), ms); });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

async function tick(now = Date.now()) {
    if (!settings.enabled) return { skipped: 'monitoring is off' };
    if (sampling) return { skipped: 'previous sample still running' };

    sampling = true;
    try {
        const sample = await withTimeout(collectSample(now), SAMPLE_TIMEOUT_MS);
        ingestSample(sample);
        lastSampleAt = new Date(sample.t).toISOString();
        lastError = null;
        return { sample };
    } catch (err) {
        lastError = err.message;
        console.error('Hardware monitor: sample failed:', err.message);
        return { error: err.message };
    } finally {
        sampling = false;
    }
}

// ---------- Timer ----------
function schedule() {
    if (timer) { clearInterval(timer); timer = null; }
    if (firstTimer) { clearTimeout(firstTimer); firstTimer = null; }
    if (!settings.enabled) return;

    timer = setInterval(() => tick(), settings.sampleIntervalSeconds * 1000);
    if (timer.unref) timer.unref();
    firstTimer = setTimeout(() => { firstTimer = null; tick(); }, 2000);
    if (firstTimer.unref) firstTimer.unref();
}

function start() {
    settings = readSettings();
    loadHistory();
    // The first CPU reading after startup covers the time since the machine booted, so take one
    // reading now and ignore it. The first real sample then measures the last couple of seconds.
    if (settings.enabled) si.currentLoad().catch(() => {});
    schedule();
    console.log(`📈 Hardware monitor started (${settings.enabled ? `sampling every ${settings.sampleIntervalSeconds}s, keeping ${settings.retentionDays} days` : 'monitoring is off'})`);
}

function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    if (firstTimer) { clearTimeout(firstTimer); firstTimer = null; }
    if (open && open.n > 0) closeOpenBucket();   // do not lose the bucket being filled
}

// ---------- Reading history back ----------
function averageBin(points) {
    const avg = key => {
        const vals = points.map(p => p[key]).filter(Number.isFinite);
        return vals.length ? round1(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    };
    const max = key => {
        const vals = points.map(p => p[key]).filter(Number.isFinite);
        return vals.length ? Math.max(...vals) : null;
    };
    const last = key => {
        for (let i = points.length - 1; i >= 0; i--) if (Number.isFinite(points[i][key])) return points[i][key];
        return null;
    };
    const out = { cpu: avg('cpu'), mem: avg('mem'), gpu: avg('gpu'), st: last('st'), stTotal: last('stTotal') };
    if (points.some(p => 'cpuMax' in p || 'memMax' in p)) {
        out.cpuMax = max('cpuMax'); out.memMax = max('memMax'); out.gpuMax = max('gpuMax');
    }
    return out;
}

// Reduce to at most maxPoints by averaging points that fall in the same time slice
function downsample(points, from, to, maxPoints = MAX_POINTS) {
    if (points.length <= maxPoints) return points;
    const width = (to - from) / maxPoints;
    const bins = new Map();
    points.forEach(p => {
        const idx = Math.min(maxPoints - 1, Math.max(0, Math.floor((p.t - from) / width)));
        if (!bins.has(idx)) bins.set(idx, []);
        bins.get(idx).push(p);
    });
    return [...bins.keys()].sort((a, b) => a - b).map(idx => ({
        t: Math.round(from + (idx + 0.5) * width),
        ...averageBin(bins.get(idx))
    }));
}

function allBucketPoints() {
    const list = buckets.slice();
    if (open && open.n > 0) list.push(openToBucket(open));   // include the bucket still being filled
    return list;
}

function getHistory(range, now = Date.now()) {
    const span = RANGES[range];
    if (!span) throw new MonitorError(`range must be one of: ${Object.keys(RANGES).join(', ')}`);
    const from = now - span;

    let points;
    let resolution;
    if (span <= RANGES['1h'] && raw.length >= 2) {
        points = raw.filter(p => p.t >= from && p.t <= now);
        resolution = `${settings.sampleIntervalSeconds}s`;
    } else {
        points = allBucketPoints().filter(p => p.t + BUCKET_MS > from && p.t <= now);
        resolution = '5min';
    }

    const reduced = downsample(points, from, now);
    return { range, from, to: now, resolution, count: reduced.length, points: reduced };
}

// ---------- Status for the page ----------
function getStatus() {
    const first = allBucketPoints()[0];
    return {
        enabled: settings.enabled,
        running: !!timer,
        sampleIntervalSeconds: settings.sampleIntervalSeconds,
        retentionDays: settings.retentionDays,
        lastSampleAt,
        lastError,
        gpuName,
        gpuAvailable: !!(latest && Number.isFinite(latest.gpu)),
        rawPoints: raw.length,
        bucketPoints: buckets.length,
        historySince: first ? new Date(first.t).toISOString() : (raw[0] ? new Date(raw[0].t).toISOString() : null)
    };
}

function getCurrent() {
    return { sample: latest, status: getStatus() };
}

// For tests only
function _reset() {
    settings = { ...DEFAULT_SETTINGS };
    raw = []; buckets = []; open = null; latest = null; sampling = false;
    lastSampleAt = null; lastError = null; gpuName = null; storageCache = null;
    stop();
}

module.exports = {
    MonitorError, INTERVAL_OPTIONS, RANGES, BUCKET_MS, DEFAULT_SETTINGS,
    start, stop, tick, ingestSample, collectSample, getHistory, getStatus, getCurrent,
    readSettings, validateSettings, updateSettings, loadHistory, downsample,
    _reset, _state: () => ({ raw, buckets, open, settings })
};
