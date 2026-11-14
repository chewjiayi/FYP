// hardwareForecast.js
// Simple, honest forecasts from the recorded hardware history (5-minute points).
//
//   storage : how fast it is filling up, and about when it will be full
//   cpu / memory / gpu : which way usage is trending, and when it might pass a threshold (default 90%)
//
// Method: average the history into hourly bins (or daily bins once there are 3+ days), then draw a
// straight line through the bins (least squares). Averaging first removes the normal daily up-and-down
// pattern, so the line shows the real direction. Each forecast says how reliable it is (R squared).
// This is a trend line, not a prediction of sudden spikes.
// BY ZHI RUO

const monitor = require('./hardwareMonitor');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const BUCKET_MS = monitor.BUCKET_MS;
const MIN_HISTORY_HOURS = 12;          // below this we do not forecast at all
const STABLE_PERCENT_PER_DAY = 0.5;    // usage moving less than this per day counts as stable
const STABLE_GB_PER_DAY = 0.05;        // storage growing less than this per day counts as stable

class ForecastError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

const round1 = n => Math.round(n * 10) / 10;
const round2 = n => Math.round(n * 100) / 100;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---------- Maths ----------
// Least-squares straight line through (x, y). Returns { slope, intercept, r2 }.
function regress(xs, ys) {
    const n = xs.length;
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    let sxx = 0, sxy = 0, syy = 0;
    for (let i = 0; i < n; i++) {
        sxx += (xs[i] - mx) ** 2;
        sxy += (xs[i] - mx) * (ys[i] - my);
        syy += (ys[i] - my) ** 2;
    }
    const slope = sxx === 0 ? 0 : sxy / sxx;
    const intercept = my - slope * mx;
    // R squared = how much of the movement the line explains. A perfectly flat series is a perfect fit.
    const r2 = syy < 1e-9 ? 1 : clamp((sxy * sxy) / (sxx * syy), 0, 1);
    return { slope, intercept, r2 };
}

// Average a metric into bins counted backwards from the newest point.
// x = bin centre in days relative to the newest point (so x = 0 means "now").
function binMetric(points, key, last, binMs, expectedPerBin) {
    const bins = new Map();
    points.forEach(p => {
        const v = p[key];
        if (!Number.isFinite(v)) return;
        const i = Math.floor((last - p.t) / binMs);
        if (!bins.has(i)) bins.set(i, []);
        bins.get(i).push(v);
    });
    const minCount = Math.ceil(expectedPerBin * 0.5);   // skip bins that are mostly empty (monitor was off)
    return [...bins.entries()]
        .filter(([, vals]) => vals.length >= minCount)
        .map(([i, vals]) => ({ x: -((i + 0.5) * binMs) / DAY, y: vals.reduce((a, b) => a + b, 0) / vals.length, n: vals.length }))
        .sort((a, b) => a.x - b.x);
}

function confidenceOf(r2, binCount, spanHours) {
    let level = r2 >= 0.7 && binCount >= 6 ? 'high' : r2 >= 0.4 ? 'medium' : 'low';
    // Under a day of history we cannot see the normal daily pattern, so never claim more than "low".
    // Under three days, at most "medium".
    if (spanHours < 24) level = 'low';
    else if (spanHours < 72 && level === 'high') level = 'medium';
    return level;
}

function lineValue(fit, xDays) {
    return fit.intercept + fit.slope * xDays;
}

// ---------- One percentage metric (cpu / memory / gpu) ----------
function trendMetric(points, key, maxKey, ctx, label) {
    const bins = binMetric(points, key, ctx.last, ctx.binMs, ctx.expectedPerBin);
    if (bins.length < ctx.minBins) {
        return { available: false, message: `${label}: not enough complete data to forecast yet` };
    }

    const values = points.map(p => p[key]).filter(Number.isFinite);
    const peaks = points.map(p => p[maxKey] ?? p[key]).filter(Number.isFinite);
    const recent = points.filter(p => p.t > ctx.last - 15 * 60 * 1000).map(p => p[key]).filter(Number.isFinite);

    const fit = regress(bins.map(b => b.x), bins.map(b => b.y));
    const confidence = confidenceOf(fit.r2, bins.length, ctx.spanHours);
    const nowTrend = clamp(lineValue(fit, 0), 0, 100);
    const trend = Math.abs(fit.slope) < STABLE_PERCENT_PER_DAY ? 'stable' : fit.slope > 0 ? 'rising' : 'falling';

    // days until the trend line reaches the threshold (only when rising and the fit is trustworthy)
    let daysToThreshold = null;
    if (trend === 'rising' && confidence !== 'low') {
        daysToThreshold = nowTrend >= ctx.threshold ? 0 : round1((ctx.threshold - nowTrend) / fit.slope);
        if (daysToThreshold > 365) daysToThreshold = null;
    }

    const horizonDays = 7;
    const result = {
        available: true,
        current: round1(recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : values[values.length - 1]),
        average: round1(values.reduce((a, b) => a + b, 0) / values.length),
        peak: round1(Math.max(...peaks)),
        trend,
        changePerDay: round2(fit.slope),
        projected7d: round1(clamp(lineValue(fit, horizonDays), 0, 100)),
        daysToThreshold,
        thresholdPercent: ctx.threshold,
        confidence,
        r2: round2(fit.r2),
        // two points to draw the dashed trend line: from now out to the horizon
        projection: [
            { t: ctx.last, v: round1(nowTrend) },
            { t: ctx.last + horizonDays * DAY, v: round1(clamp(lineValue(fit, horizonDays), 0, 100)) }
        ]
    };
    result.headline = describeTrend(label, result);
    return result;
}

function describeTrend(label, r) {
    const rough = r.confidence === 'low' ? ' (rough estimate, not enough history yet)' : '';
    if (r.trend === 'stable') {
        return `${label} usage is steady around ${r.average}%${rough}.`;
    }
    const dir = r.trend === 'rising' ? 'rising' : 'falling';
    let text = `${label} usage is ${dir} by about ${Math.abs(r.changePerDay)} points per day`;
    if (r.daysToThreshold === 0) text += `, and is already at or above ${r.thresholdPercent}%`;
    else if (r.daysToThreshold !== null) text += `, and could reach ${r.thresholdPercent}% in about ${r.daysToThreshold} days`;
    return text + '.' + rough;
}

// ---------- Storage ----------
function storageForecast(points, ctx) {
    const withSt = points.filter(p => Number.isFinite(p.st) && Number.isFinite(p.stTotal));
    if (withSt.length === 0) return { available: false, message: 'Storage information is not available' };

    const newest = withSt[withSt.length - 1];
    const usedGB = newest.st;
    const totalGB = newest.stTotal;

    const bins = binMetric(withSt, 'st', ctx.last, ctx.binMs, ctx.expectedPerBin);
    const base = {
        available: true,
        usedGB: round1(usedGB),
        totalGB: round1(totalGB),
        freeGB: round1(Math.max(totalGB - usedGB, 0)),
        usagePercent: round1((usedGB / totalGB) * 100)
    };
    if (bins.length < ctx.minBins) {
        return { ...base, trend: 'unknown', growthGBPerDay: null, daysUntilFull: null, fullDate: null, severity: base.usagePercent >= 90 ? 'warning' : 'ok',
            confidence: 'low', r2: null, projection: null, headline: `Storage is ${base.usagePercent}% full. Not enough history to forecast yet.` };
    }

    const fit = regress(bins.map(b => b.x), bins.map(b => b.y));
    const confidence = confidenceOf(fit.r2, bins.length, ctx.spanHours);
    const growth = fit.slope;                                   // GB per day
    const trend = Math.abs(growth) < STABLE_GB_PER_DAY ? 'stable' : growth > 0 ? 'growing' : 'shrinking';

    let daysUntilFull = null;
    let fullDate = null;
    if (trend === 'growing') {
        const remaining = Math.max(totalGB - usedGB, 0);
        daysUntilFull = remaining === 0 ? 0 : round1(remaining / growth);
        if (daysUntilFull > 3650) daysUntilFull = null;          // more than ten years: not meaningful
        else fullDate = new Date(ctx.last + daysUntilFull * DAY).toISOString();
    }

    let severity = 'ok';
    if (daysUntilFull !== null && daysUntilFull <= 7) severity = 'critical';
    else if ((daysUntilFull !== null && daysUntilFull <= 30) || base.usagePercent >= 90) severity = 'warning';
    if (base.usagePercent >= 97) severity = 'critical';

    const horizon = clamp(daysUntilFull !== null ? Math.ceil(daysUntilFull * 1.1) : 30, 7, 90);
    const rough = confidence === 'low' ? ' (rough estimate, not enough history yet)' : '';
    let headline;
    if (trend === 'stable') headline = `Storage is ${base.usagePercent}% full and holding steady.${rough}`;
    else if (trend === 'shrinking') headline = `Storage is ${base.usagePercent}% full and shrinking by about ${round1(Math.abs(growth))} GB per day.${rough}`;
    else if (daysUntilFull === null) headline = `Storage is ${base.usagePercent}% full and growing slowly (about ${round2(growth)} GB per day).${rough}`;
    else if (daysUntilFull === 0) headline = `Storage is full.`;
    else headline = `Storage is growing about ${round1(growth)} GB per day and could be full in about ${daysUntilFull} days (${new Date(fullDate).toLocaleDateString('en-GB')}).${rough}`;

    return {
        ...base,
        trend,
        growthGBPerDay: round2(growth),
        daysUntilFull,
        fullDate,
        severity,
        confidence,
        r2: round2(fit.r2),
        projection: [
            { t: ctx.last, v: round1(clamp(lineValue(fit, 0), 0, totalGB)) },
            { t: ctx.last + horizon * DAY, v: round1(clamp(lineValue(fit, horizon), 0, totalGB)) }
        ],
        headline
    };
}

// ---------- Everything together ----------
// points: 5-minute points (oldest first). Pure function, so it is easy to test.
function buildForecast(points, now = Date.now(), { thresholdPercent = 90 } = {}) {
    const generatedAt = new Date(now).toISOString();
    if (!points || points.length < 2) {
        return { generatedAt, status: 'insufficient_data', hoursOfHistory: 0, minHours: MIN_HISTORY_HOURS,
            message: `Collecting data. At least ${MIN_HISTORY_HOURS} hours of history are needed before forecasting.` };
    }

    const first = points[0].t;
    const last = points[points.length - 1].t;
    const spanHours = (last - first) / HOUR;
    if (spanHours < MIN_HISTORY_HOURS) {
        return { generatedAt, status: 'insufficient_data', hoursOfHistory: round1(spanHours), minHours: MIN_HISTORY_HOURS,
            message: `Collecting data: ${round1(spanHours)} of the ${MIN_HISTORY_HOURS} hours needed before forecasting.` };
    }

    const dayMode = spanHours >= 72;
    const ctx = {
        last,
        spanHours,
        threshold: thresholdPercent,
        binMs: dayMode ? DAY : HOUR,
        expectedPerBin: (dayMode ? DAY : HOUR) / BUCKET_MS,
        minBins: dayMode ? 3 : 6
    };

    return {
        generatedAt,
        status: 'ok',
        basedOn: { from: new Date(first).toISOString(), to: new Date(last).toISOString(), hours: round1(spanHours), points: points.length, averagedBy: dayMode ? 'day' : 'hour' },
        storage: storageForecast(points, ctx),
        cpu: trendMetric(points, 'cpu', 'cpuMax', ctx, 'CPU'),
        memory: trendMetric(points, 'mem', 'memMax', ctx, 'Memory'),
        gpu: trendMetric(points, 'gpu', 'gpuMax', ctx, 'GPU')
    };
}

// Reads the recorded history and builds the forecast
function getForecast({ lookbackDays = 7, thresholdPercent = 90 } = {}, now = Date.now()) {
    const lb = Number(lookbackDays);
    const th = Number(thresholdPercent);
    if (!Number.isInteger(lb) || lb < 1 || lb > 30) throw new ForecastError('lookbackDays must be a whole number from 1 to 30');
    if (!Number.isInteger(th) || th < 50 || th > 99) throw new ForecastError('threshold must be a whole number from 50 to 99');

    const points = monitor.getBucketPoints(now - lb * DAY, now);
    return { lookbackDays: lb, ...buildForecast(points, now, { thresholdPercent: th }) };
}

module.exports = { ForecastError, buildForecast, getForecast, regress, MIN_HISTORY_HOURS };
