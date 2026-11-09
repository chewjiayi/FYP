// visitorArchiveService.js
// Visitor data archiving to LOCAL DISK.
//
// An archive is a folder: <ARCHIVE_DIR>/visitor-YYYYMMDD-HHMMSS/
//   visitor-data.json  every record in full (feedback + visitor + answers + pledge likes)
//   feedback.csv       one row per feedback (easy to open in Excel)
//   answers.csv        one row per answer
//   photos/            copies of the photo files (same sub-folders as in /uploads)
//   manifest.json      counts, the record ids, and a SHA-256 checksum for every file
//
// Creating an archive only READS the database. Records are removed later, and only by
// deleteFromDatabase(), which needs a verified archive on disk.
// Emails stay ENCRYPTED in the archive (exactly as stored in the users table).
// BY ZHI RUO

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const ARCHIVE_DIR = process.env.ARCHIVE_DIR || path.join(__dirname, '..', 'archives');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');   // same folder adminRoutes.js uses for photos
const ARCHIVE_ID_PATTERN = /^visitor-\d{8}-\d{6}$/;
const CHUNK = 500;                                           // ids per "IN (...)" query

let busy = false;                                            // only one create/delete runs at a time

// ---------- Errors the routes can turn into HTTP codes ----------
class ArchiveError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

// ---------- Database helpers (same db.all style as dataExportRoutes.js) ----------
function queryAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
    });
}

function chunk(list, size) {
    const out = [];
    for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
    return out;
}

// ---------- Input checks ----------
function validateFilter(before, scope) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(before))) {
        throw new ArchiveError('Choose a date (YYYY-MM-DD)');
    }
    const d = new Date(before + 'T00:00:00');
    if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== before) {
        throw new ArchiveError('That is not a real date');
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d > today) {
        throw new ArchiveError('The date cannot be in the future');
    }
    if (!['archived', 'all'].includes(scope)) {
        throw new ArchiveError('scope must be "archived" or "all"');
    }
}

// ---------- Reading the records ----------
async function fetchVisitorData(before, scope) {
    let sql = `
        SELECT
            f.id AS feedback_id,
            f.user_id,
            u.name AS user_name,
            u.email_encrypted,
            u.visit_count,
            u.created_at AS user_created,
            u.last_visit AS user_last_visit,
            f.comment,
            f.metadata,
            f.photo_path,
            f.processed_photo_path,
            f.data_retention,
            f.email_sent,
            f.email_sent_at,
            f.admin_notes,
            f.is_active,
            f.archive_status,
            f.created_at AS feedback_created
        FROM feedback f
        JOIN users u ON f.user_id = u.id
        WHERE f.created_at < ?`;
    if (scope === 'archived') sql += ` AND f.archive_status = 'archived'`;
    sql += ' ORDER BY f.created_at ASC';

    const feedback = await queryAll(sql, [before]);
    const ids = feedback.map(f => f.feedback_id);

    const answers = [];
    const likes = [];
    for (const part of chunk(ids, CHUNK)) {
        const marks = part.map(() => '?').join(',');
        answers.push(...await queryAll(
            `SELECT fa.feedback_id, fa.question_id, q.question_text, q.question_type, fa.answer_value, fa.created_at
             FROM feedback_answers fa
             JOIN questions q ON fa.question_id = q.id
             WHERE fa.feedback_id IN (${marks})
             ORDER BY fa.feedback_id, fa.question_id`, part));
        likes.push(...await queryAll(
            `SELECT feedback_id, user_identifier, created_at
             FROM pledge_likes
             WHERE feedback_id IN (${marks})`, part));
    }
    return { feedback, answers, likes };
}

// ---------- Photos ----------
// Only files that really sit inside /uploads are touched (blocks "../" tricks in photo_path)
function resolvePhoto(relPath) {
    if (!relPath || typeof relPath !== 'string') return null;
    const abs = path.resolve(UPLOADS_DIR, relPath);
    const root = path.resolve(UPLOADS_DIR) + path.sep;
    return abs.startsWith(root) ? abs : null;
}

function collectPhotoPaths(feedbackRows) {
    const set = new Set();
    feedbackRows.forEach(f => {
        if (f.photo_path) set.add(f.photo_path);
        if (f.processed_photo_path) set.add(f.processed_photo_path);
    });
    return [...set];
}

async function previewArchive(before, scope) {
    validateFilter(before, scope);
    const { feedback, answers, likes } = await fetchVisitorData(before, scope);

    let photosOnDisk = 0;
    let photoBytes = 0;
    const photoPaths = collectPhotoPaths(feedback);
    for (const rel of photoPaths) {
        const abs = resolvePhoto(rel);
        if (abs && fs.existsSync(abs)) {
            photosOnDisk++;
            photoBytes += fs.statSync(abs).size;
        }
    }

    return {
        before,
        scope,
        feedback: feedback.length,
        visitors: new Set(feedback.map(f => f.user_id)).size,
        answers: answers.length,
        pledgeLikes: likes.length,
        photosReferenced: photoPaths.length,
        photosOnDisk,
        photoBytes,
        oldest: feedback.length ? feedback[0].feedback_created : null,
        newest: feedback.length ? feedback[feedback.length - 1].feedback_created : null
    };
}

// ---------- Files ----------
function csvCell(value) {
    if (value === null || value === undefined) return '';
    let text = value instanceof Date ? value.toISOString() : String(value);
    // Stop Excel treating visitor text such as "=1+1" as a formula (the JSON file keeps the original)
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function toCsv(rows, columns) {
    const lines = [columns.join(',')];
    rows.forEach(r => lines.push(columns.map(c => csvCell(r[c])).join(',')));
    return lines.join('\r\n') + '\r\n';
}

function hashFile(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        fs.createReadStream(filePath)
            .on('error', reject)
            .on('data', d => hash.update(d))
            .on('end', () => resolve(hash.digest('hex')));
    });
}

function archiveStamp(now) {
    const p = n => String(n).padStart(2, '0');
    return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
}

function listFilesRecursive(dir, base = dir) {
    const out = [];
    fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...listFilesRecursive(full, base));
        else out.push(path.relative(base, full).split(path.sep).join('/'));
    });
    return out;
}

// ---------- Verify (re-reads everything from disk) ----------
async function verifyFolder(dir) {
    const problems = [];
    let manifest;
    try {
        manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
    } catch (err) {
        return { ok: false, problems: ['manifest.json is missing or unreadable'], manifest: null };
    }

    // 1. every file exists with the same size and checksum
    for (const f of manifest.files) {
        const abs = path.join(dir, f.path);
        if (!fs.existsSync(abs)) { problems.push(`Missing file: ${f.path}`); continue; }
        if (fs.statSync(abs).size !== f.size) { problems.push(`Size changed: ${f.path}`); continue; }
        if (await hashFile(abs) !== f.sha256) problems.push(`Checksum mismatch: ${f.path}`);
    }

    // 2. no extra files appeared
    const expected = new Set(manifest.files.map(f => f.path).concat('manifest.json'));
    listFilesRecursive(dir).forEach(p => {
        if (!expected.has(p)) problems.push(`Unexpected file: ${p}`);
    });

    // 3. the JSON really holds the number of records the manifest promises
    try {
        const data = JSON.parse(fs.readFileSync(path.join(dir, 'visitor-data.json'), 'utf8'));
        const fb = data.feedback || [];
        const answerCount = fb.reduce((n, f) => n + f.answers.length, 0);
        const likeCount = fb.reduce((n, f) => n + f.pledgeLikes.length, 0);
        if (fb.length !== manifest.counts.feedback) problems.push('Feedback count does not match the manifest');
        if (answerCount !== manifest.counts.answers) problems.push('Answer count does not match the manifest');
        if (likeCount !== manifest.counts.pledgeLikes) problems.push('Pledge like count does not match the manifest');
        const ids = new Set(fb.map(f => f.feedback_id));
        if (!manifest.feedbackIds.every(id => ids.has(id)) || ids.size !== manifest.feedbackIds.length) {
            problems.push('Record ids do not match the manifest');
        }
    } catch (err) {
        problems.push('visitor-data.json is missing or unreadable');
    }

    return { ok: problems.length === 0, problems, manifest };
}

// ---------- Create ----------
async function createArchive(before, scope, username) {
    validateFilter(before, scope);
    if (busy) throw new ArchiveError('Another archive operation is running. Try again in a moment.', 409);
    busy = true;

    let tmpDir = null;
    try {
        const { feedback, answers, likes } = await fetchVisitorData(before, scope);
        if (feedback.length === 0) throw new ArchiveError('No records match that date and scope', 404);

        const now = new Date();
        const id = `visitor-${archiveStamp(now)}`;
        const finalDir = path.join(ARCHIVE_DIR, id);
        tmpDir = path.join(ARCHIVE_DIR, `.tmp-${id}`);
        if (fs.existsSync(finalDir)) throw new ArchiveError('An archive with this name already exists. Try again in a second.', 409);
        fs.mkdirSync(tmpDir, { recursive: true });

        // 1. data files
        const answersBy = new Map();
        answers.forEach(a => {
            if (!answersBy.has(a.feedback_id)) answersBy.set(a.feedback_id, []);
            answersBy.get(a.feedback_id).push(a);
        });
        const likesBy = new Map();
        likes.forEach(l => {
            if (!likesBy.has(l.feedback_id)) likesBy.set(l.feedback_id, []);
            likesBy.get(l.feedback_id).push(l);
        });

        const full = feedback.map(f => ({
            ...f,
            answers: answersBy.get(f.feedback_id) || [],
            pledgeLikes: likesBy.get(f.feedback_id) || []
        }));

        fs.writeFileSync(path.join(tmpDir, 'visitor-data.json'),
            JSON.stringify({ archiveId: id, createdAt: now.toISOString(), filter: { before, scope }, feedback: full }, null, 2));

        fs.writeFileSync(path.join(tmpDir, 'feedback.csv'), '\uFEFF' + toCsv(feedback, [
            'feedback_id', 'user_id', 'user_name', 'email_encrypted', 'visit_count', 'user_created', 'user_last_visit',
            'comment', 'metadata', 'photo_path', 'processed_photo_path', 'data_retention', 'email_sent',
            'email_sent_at', 'admin_notes', 'is_active', 'archive_status', 'feedback_created'
        ]));

        fs.writeFileSync(path.join(tmpDir, 'answers.csv'), '\uFEFF' + toCsv(answers, [
            'feedback_id', 'question_id', 'question_text', 'question_type', 'answer_value', 'created_at'
        ]));

        // 2. photos (copied with the same sub-folders they have in /uploads)
        const photosMissing = [];
        let photosCopied = 0;
        for (const rel of collectPhotoPaths(feedback)) {
            const abs = resolvePhoto(rel);
            if (!abs || !fs.existsSync(abs)) { photosMissing.push(rel); continue; }
            const dest = path.join(tmpDir, 'photos', rel);
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            await fs.promises.copyFile(abs, dest);
            photosCopied++;
        }

        // 3. manifest with a checksum for every file
        const files = [];
        for (const rel of listFilesRecursive(tmpDir)) {
            const abs = path.join(tmpDir, rel);
            files.push({ path: rel, size: fs.statSync(abs).size, sha256: await hashFile(abs) });
        }

        const manifest = {
            id,
            createdAt: now.toISOString(),
            createdBy: username || 'unknown',
            filter: { before, scope },
            counts: {
                feedback: feedback.length,
                visitors: new Set(feedback.map(f => f.user_id)).size,
                answers: answers.length,
                pledgeLikes: likes.length,
                photosCopied,
                photosMissing: photosMissing.length
            },
            photosMissing,
            feedbackIds: feedback.map(f => f.feedback_id),
            files,
            status: 'created',
            verifiedAt: null,
            dbDeleted: false,
            dbDeletedAt: null
        };
        fs.writeFileSync(path.join(tmpDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

        // 4. verify BEFORE the archive becomes visible
        const check = await verifyFolder(tmpDir);
        if (!check.ok) throw new ArchiveError('Archive failed verification: ' + check.problems.join('; '), 500);

        manifest.status = 'verified';
        manifest.verifiedAt = new Date().toISOString();
        fs.writeFileSync(path.join(tmpDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

        fs.renameSync(tmpDir, finalDir);   // appears all at once, never half-written
        tmpDir = null;

        return summarizeManifest(manifest);
    } finally {
        if (tmpDir && fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
        busy = false;
    }
}

// ---------- List / re-verify ----------
function summarizeManifest(m) {
    return {
        id: m.id,
        createdAt: m.createdAt,
        createdBy: m.createdBy,
        filter: m.filter,
        counts: m.counts,
        sizeBytes: m.files.reduce((sum, f) => sum + f.size, 0),
        status: m.status,
        verifiedAt: m.verifiedAt,
        dbDeleted: m.dbDeleted,
        dbDeletedAt: m.dbDeletedAt
    };
}

function listArchives() {
    if (!fs.existsSync(ARCHIVE_DIR)) return [];
    const out = [];
    fs.readdirSync(ARCHIVE_DIR, { withFileTypes: true }).forEach(entry => {
        if (!entry.isDirectory() || !ARCHIVE_ID_PATTERN.test(entry.name)) return;
        try {
            const m = JSON.parse(fs.readFileSync(path.join(ARCHIVE_DIR, entry.name, 'manifest.json'), 'utf8'));
            out.push(summarizeManifest(m));
        } catch (err) {
            out.push({ id: entry.name, status: 'damaged', counts: {}, sizeBytes: 0 });
        }
    });
    return out.sort((a, b) => (a.id < b.id ? 1 : -1));
}

async function verifyArchive(id) {
    if (!ARCHIVE_ID_PATTERN.test(String(id))) throw new ArchiveError('Invalid archive id');
    const dir = path.join(ARCHIVE_DIR, id);
    if (!fs.existsSync(dir)) throw new ArchiveError('Archive not found', 404);

    const check = await verifyFolder(dir);
    if (check.manifest) {
        check.manifest.status = check.ok ? 'verified' : 'failed';
        if (check.ok) check.manifest.verifiedAt = new Date().toISOString();
        fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(check.manifest, null, 2));
    }
    return { ok: check.ok, problems: check.problems, archive: check.manifest ? summarizeManifest(check.manifest) : null };
}


// ---------- Helpers for the delete step ----------
function getArchiveDir(id) {
    if (!ARCHIVE_ID_PATTERN.test(String(id))) throw new ArchiveError('Invalid archive id');
    const dir = path.join(ARCHIVE_DIR, id);
    if (!fs.existsSync(dir)) throw new ArchiveError('Archive not found', 404);
    return dir;
}

function writeManifest(dir, manifest) {
    const tmp = path.join(dir, 'manifest.json.tmp');
    fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2));
    fs.renameSync(tmp, path.join(dir, 'manifest.json'));
}

// A transaction needs ONE connection for all its statements. db.beginTransaction()/commit() in db.js
// send each statement through the pool, which can pick different connections, so we use our own.
function getConnection() {
    return new Promise((resolve, reject) => {
        db.pool.getConnection((err, conn) => (err ? reject(err) : resolve(conn)));
    });
}

function connQuery(conn, sql, params = []) {
    return new Promise((resolve, reject) => {
        conn.query(sql, params, (err, result) => (err ? reject(err) : resolve(result)));
    });
}

async function countWhereIn(sql, ids) {
    let total = 0;
    for (const part of chunk(ids, CHUNK)) {
        const rows = await queryAll(sql.replace('(?)', `(${part.map(() => '?').join(',')})`), part);
        total += Number(rows[0].c);
    }
    return total;
}

// ---------- Delete from the database (needs a verified archive) ----------
// Deletes EXACTLY the feedback ids saved in the archive, their answers and pledge likes, visitors
// left with no feedback, and the photo files that were copied into the archive.
async function deleteFromDatabase(id, username) {
    const dir = getArchiveDir(id);
    if (busy) throw new ArchiveError('Another archive operation is running. Try again in a moment.', 409);
    busy = true;

    try {
        // 1. the archive must pass verification right now
        const check = await verifyFolder(dir);
        if (!check.ok) {
            throw new ArchiveError('Archive failed verification, nothing was deleted: ' + check.problems.join('; '), 409);
        }
        const manifest = check.manifest;
        if (manifest.dbDeleted) throw new ArchiveError('These records were already deleted from the database', 409);

        const data = JSON.parse(fs.readFileSync(path.join(dir, 'visitor-data.json'), 'utf8'));
        const ids = manifest.feedbackIds;
        const userIds = [...new Set(data.feedback.map(f => f.user_id))];
        const photoPaths = collectPhotoPaths(data.feedback);
        const archivedFiles = new Set(manifest.files.map(f => f.path));

        // 2. the database must not hold MORE than the archive saved (e.g. answers or likes added since)
        const answersNow = await countWhereIn('SELECT COUNT(*) AS c FROM feedback_answers WHERE feedback_id IN (?)', ids);
        const likesNow = await countWhereIn('SELECT COUNT(*) AS c FROM pledge_likes WHERE feedback_id IN (?)', ids);
        if (answersNow > manifest.counts.answers || likesNow > manifest.counts.pledgeLikes) {
            throw new ArchiveError('These records changed after the archive was made (new answers or likes). ' +
                'Nothing was deleted. Create a new archive first.', 409);
        }

        // 3. delete everything in ONE transaction: all of it, or none of it
        const result = { feedbackDeleted: 0, answersDeleted: 0, likesDeleted: 0, usersDeleted: 0 };
        const conn = await getConnection();
        try {
            await connQuery(conn, 'START TRANSACTION');
            for (const part of chunk(ids, CHUNK)) {
                const marks = part.map(() => '?').join(',');
                result.likesDeleted += (await connQuery(conn, `DELETE FROM pledge_likes WHERE feedback_id IN (${marks})`, part)).affectedRows;
                result.answersDeleted += (await connQuery(conn, `DELETE FROM feedback_answers WHERE feedback_id IN (${marks})`, part)).affectedRows;
                result.feedbackDeleted += (await connQuery(conn, `DELETE FROM feedback WHERE id IN (${marks})`, part)).affectedRows;
            }
            for (const part of chunk(userIds, CHUNK)) {
                const marks = part.map(() => '?').join(',');
                result.usersDeleted += (await connQuery(conn,
                    `DELETE FROM users WHERE id IN (${marks})
                     AND NOT EXISTS (SELECT 1 FROM feedback WHERE feedback.user_id = users.id)`, part)).affectedRows;
            }
            await connQuery(conn, 'COMMIT');
        } catch (err) {
            try { await connQuery(conn, 'ROLLBACK'); } catch (e) { /* connection already gone */ }
            throw new ArchiveError('Database error, nothing was deleted: ' + err.message, 500);
        } finally {
            conn.release();
        }

        // 4. photo files (the database is already clean, so a problem here cannot undo it)
        const photos = { deleted: 0, missing: 0, keptStillUsed: 0, keptNoCopy: 0, failed: [] };
        for (const rel of photoPaths) {
            const abs = resolvePhoto(rel);
            if (!abs || !fs.existsSync(abs)) { photos.missing++; continue; }
            if (!archivedFiles.has('photos/' + rel)) { photos.keptNoCopy++; continue; }   // never delete a file the archive doesn't hold
            const stillUsed = await queryAll('SELECT id FROM feedback WHERE photo_path = ? OR processed_photo_path = ? LIMIT 1', [rel, rel]);
            if (stillUsed.length > 0) { photos.keptStillUsed++; continue; }
            try { fs.unlinkSync(abs); photos.deleted++; } catch (err) { photos.failed.push(rel); }
        }

        // 5. record it in the archive's manifest
        manifest.dbDeleted = true;
        manifest.dbDeletedAt = new Date().toISOString();
        manifest.dbDeletedBy = username || 'unknown';
        manifest.deleteResult = { ...result, photos };
        writeManifest(dir, manifest);

        return { archive: summarizeManifest(manifest), ...result, photos };
    } finally {
        busy = false;
    }
}

module.exports = {
    ARCHIVE_DIR, ArchiveError,
    previewArchive, createArchive, listArchives, verifyArchive,
    getArchiveDir, deleteFromDatabase
};
