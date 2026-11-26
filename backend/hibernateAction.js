// hibernateAction.js
// The part that really puts this computer into hibernation, and the check for whether it can.
//   Windows : "shutdown /h"          (needs hibernation turned on: powercfg /hibernate on)
//   Linux   : "systemctl hibernate"  (needs permission and a swap area big enough)
// Anything else is reported as not supported. Nothing here decides WHEN to hibernate.
// BY ZHI RUO

const { execFile } = require('child_process');

let exec = execFile;                 // replaced in tests so they can never hibernate the test machine
let platform = process.platform;     // replaced in tests

function run(file, args, timeoutMs = 8000) {
    return new Promise(resolve => {
        exec(file, args, { timeout: timeoutMs, windowsHide: true }, (error, stdout, stderr) => {
            resolve({ error, stdout: String(stdout || ''), stderr: String(stderr || '') });
        });
    });
}

// Is hibernation available on this machine right now?
// available: true / false, or null when we cannot tell (the command's text could not be understood)
async function check() {
    if (platform === 'win32') {
        const r = await run('powercfg', ['/a']);
        if (r.error && !r.stdout) {
            return { platform, supported: true, available: null, detail: 'Could not run powercfg: ' + r.error.message, hint: null };
        }
        // powercfg lists "available" sleep states first, then "not available" ones with a reason
        const text = r.stdout;
        const notIdx = text.search(/not available/i);
        const availIdx = text.search(/are available|is available/i);
        if (availIdx === -1 && notIdx === -1) {
            return { platform, supported: true, available: null, detail: 'Could not read the powercfg result (non-English Windows?)', hint: null };
        }
        const availablePart = notIdx === -1 ? text : text.slice(0, notIdx);
        const available = /hibernate/i.test(availablePart);
        return {
            platform, supported: true, available,
            detail: available ? 'Hibernate is available' : 'Hibernate is not available on this computer',
            hint: available ? null : 'Open Command Prompt as administrator and run: powercfg /hibernate on'
        };
    }

    if (platform === 'linux') {
        const r = await run('systemctl', ['can-hibernate']);
        if (r.error && !r.stdout) {
            return { platform, supported: true, available: null, detail: 'Could not run systemctl: ' + r.error.message, hint: null };
        }
        const answer = r.stdout.trim().toLowerCase();
        const available = answer === 'yes' || answer === 'challenge';
        return {
            platform, supported: true, available,
            detail: available ? 'Hibernate is available' : `systemctl says: ${answer || 'no'}`,
            hint: available ? null : 'Hibernation needs a swap partition or file at least as big as the RAM, and the resume option set.'
        };
    }

    return { platform, supported: false, available: false, detail: `Hibernation from this server is not supported on ${platform}`, hint: null };
}

// Send the command. The computer usually freezes a moment after this returns.
async function hibernate() {
    let file, args;
    if (platform === 'win32') { file = 'shutdown'; args = ['/h']; }
    else if (platform === 'linux') { file = 'systemctl'; args = ['hibernate']; }
    else return { ok: false, error: `Hibernation is not supported on ${platform}`, command: null };

    const command = `${file} ${args.join(' ')}`;
    const r = await run(file, args, 15000);
    if (r.error) {
        const msg = (r.stderr || r.stdout || r.error.message || '').trim();
        return { ok: false, error: msg || 'The hibernate command failed', command };
    }
    return { ok: true, error: null, command };
}

// For tests only
function _setExec(fn) { exec = fn; }
function _setPlatform(p) { platform = p; }
function _reset() { exec = execFile; platform = process.platform; }

module.exports = { check, hibernate, _setExec, _setPlatform, _reset };
