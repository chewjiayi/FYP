#!/usr/bin/env node

const DEFAULT_URLS = ['https://localhost:3000', 'http://localhost:3000'];
const baseUrlFromEnv = process.env.PULSE_TEST_BASE_URL || process.env.BASE_URL;
const username = process.env.PULSE_TEST_USERNAME || process.env.ADMIN_USERNAME;
const password = process.env.PULSE_TEST_PASSWORD || process.env.ADMIN_PASSWORD;

if (process.env.PULSE_TEST_ALLOW_INSECURE_TLS !== '0') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

function ok(message) {
    console.log(`[PASS] ${message}`);
}

function warn(message) {
    console.warn(`[WARN] ${message}`);
}

function fail(message) {
    throw new Error(message);
}

function requireFields(object, fields, label) {
    for (const field of fields) {
        if (!(field in object)) {
            fail(`${label} is missing "${field}"`);
        }
    }
}

async function readJson(response, label) {
    const text = await response.text();
    try {
        return text ? JSON.parse(text) : {};
    } catch (error) {
        fail(`${label} did not return valid JSON. Body: ${text.slice(0, 200)}`);
    }
}

async function request(baseUrl, path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
        redirect: 'manual',
        ...options,
        headers: {
            ...(options.headers || {})
        }
    });

    return response;
}

async function findRunningBaseUrl() {
    const candidates = baseUrlFromEnv ? [baseUrlFromEnv] : DEFAULT_URLS;
    const errors = [];

    for (const candidate of candidates) {
        try {
            const response = await request(candidate, '/api/status');
            if (response.ok) {
                ok(`Backend is reachable at ${candidate}`);
                return candidate;
            }
            errors.push(`${candidate} returned HTTP ${response.status}`);
        } catch (error) {
            errors.push(`${candidate} failed: ${error.message}`);
        }
    }

    fail(`Could not reach the backend. Start it with "node backend/server.js" first.\n${errors.join('\n')}`);
}

function extractCookie(response) {
    const getSetCookie = response.headers.getSetCookie;
    const setCookies = typeof getSetCookie === 'function'
        ? getSetCookie.call(response.headers)
        : [response.headers.get('set-cookie')].filter(Boolean);

    return setCookies
        .map(cookie => cookie.split(';')[0])
        .filter(Boolean)
        .join('; ');
}

async function checkStatus(baseUrl) {
    const response = await request(baseUrl, '/api/status');
    const body = await readJson(response, '/api/status');

    if (!response.ok) {
        fail(`/api/status returned HTTP ${response.status}`);
    }

    requireFields(body, ['online', 'mode', 'server', 'timestamp'], '/api/status');

    if (body.online !== true) {
        fail('/api/status did not report online: true');
    }

    ok('/api/status reports the backend is online');
}

async function checkDatabase(baseUrl) {
    const response = await request(baseUrl, '/api/test-db');
    const body = await readJson(response, '/api/test-db');

    if (!response.ok) {
        fail(`/api/test-db returned HTTP ${response.status}: ${body.error || 'unknown error'}`);
    }

    requireFields(body, ['message', 'tables', 'database'], '/api/test-db');
    ok(`/api/test-db connected to database "${body.database}"`);
}

async function checkPulsePublicSummary(baseUrl) {
    const response = await request(baseUrl, '/api/pulse/summary');
    const body = await readJson(response, '/api/pulse/summary');

    if (!response.ok || body.success !== true) {
        fail(`/api/pulse/summary failed with HTTP ${response.status}: ${body.error || 'unknown error'}`);
    }

    requireFields(body, [
        'success',
        'generatedAt',
        'stats',
        'newestPledges',
        'topBadgeEarners',
        'badgeBreakdown',
        'treeVisitors'
    ], '/api/pulse/summary');

    requireFields(body.stats, [
        'pledgesToday',
        'pledgesThisMonth',
        'totalPledges',
        'campaignGoal',
        'progressPercent',
        'treeLeaves'
    ], '/api/pulse/summary stats');

    checkArray(body.newestPledges, 'newestPledges');
    checkArray(body.topBadgeEarners, 'topBadgeEarners');
    checkArray(body.badgeBreakdown, 'badgeBreakdown');
    checkArray(body.treeVisitors, 'treeVisitors');

    ok('/api/pulse/summary is public and returned the expected dashboard payload');
}

async function login(baseUrl) {
    if (!username || !password) {
        warn('Skipping authenticated Pulse summary check. Set PULSE_TEST_USERNAME and PULSE_TEST_PASSWORD to enable it.');
        return null;
    }

    const response = await request(baseUrl, '/api/admin/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });
    const body = await readJson(response, '/api/admin/login');

    if (!response.ok || body.success !== true) {
        fail(`/api/admin/login failed with HTTP ${response.status}: ${body.error || body.message || 'unknown error'}`);
    }

    const cookie = extractCookie(response);
    if (!cookie) {
        fail('/api/admin/login succeeded but did not return a session cookie');
    }

    ok(`/api/admin/login created a session for "${username}"`);
    return cookie;
}

function checkArray(value, label) {
    if (!Array.isArray(value)) {
        fail(`${label} should be an array`);
    }
}

async function checkPulseSummary(baseUrl, cookie) {
    if (!cookie) return;

    const response = await request(baseUrl, '/api/pulse/summary', {
        headers: {
            Cookie: cookie
        }
    });
    const body = await readJson(response, '/api/pulse/summary with login');

    if (!response.ok || body.success !== true) {
        fail(`/api/pulse/summary with login failed with HTTP ${response.status}: ${body.error || 'unknown error'}`);
    }

    ok('/api/pulse/summary also works with an admin session');
}

async function main() {
    const baseUrl = await findRunningBaseUrl();

    await checkStatus(baseUrl);
    await checkDatabase(baseUrl);
    await checkPulsePublicSummary(baseUrl);

    const cookie = await login(baseUrl);
    await checkPulseSummary(baseUrl, cookie);

    console.log('\nPulse backend check completed.');
}

main().catch((error) => {
    console.error(`\n[FAIL] ${error.message}`);
    process.exit(1);
});
