// hibernationMonitorPage.js
// A small stand-alone page for the SECOND LAPTOP. It shows, live, whether the kiosk server is reachable,
// warns when the server is about to hibernate, and logs every message the server pushes.
// Served at: /api/admin/hibernation/monitor  (login required)
// BY ZHI RUO

const PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kiosk Server Monitor</title>
<style>
  body { margin: 0; font-family: Segoe UI, Arial, sans-serif; background: #0f172a; color: #e2e8f0; }
  main { max-width: 820px; margin: 0 auto; padding: 24px 16px; }
  h1 { font-size: 20px; margin: 0 0 4px 0; }
  .sub { color: #94a3b8; font-size: 13px; margin-bottom: 20px; }
  #status { padding: 28px 20px; border-radius: 14px; text-align: center; background: #334155; }
  #status.connected { background: #166534; }
  #status.warning { background: #b45309; }
  #status.down { background: #991b1b; }
  #status-text { font-size: 28px; font-weight: 700; }
  #status-detail { margin-top: 8px; font-size: 15px; opacity: .95; min-height: 20px; }
  .facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 16px 0; }
  .fact { background: #1e293b; border-radius: 10px; padding: 12px 14px; }
  .fact span { display: block; font-size: 12px; color: #94a3b8; margin-bottom: 4px; }
  .fact strong { font-size: 15px; }
  h2 { font-size: 15px; margin: 22px 0 8px 0; }
  #log { list-style: none; margin: 0; padding: 0; background: #1e293b; border-radius: 10px; max-height: 340px; overflow-y: auto; }
  #log li { padding: 8px 14px; border-bottom: 1px solid #334155; font-size: 13px; }
  #log li:last-child { border-bottom: none; }
  #log time { color: #94a3b8; margin-right: 8px; font-family: Consolas, monospace; }
  .tag { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 11px; margin-right: 6px; background: #475569; }
  .tag.warning { background: #b45309; } .tag.down { background: #991b1b; } .tag.up { background: #166534; }
</style>
</head>
<body>
<main>
  <h1>Kiosk Server Monitor</h1>
  <div class="sub">Keep this page open on another laptop while the kiosk server hibernates and wakes up.</div>

  <div id="status"><div id="status-text">Connecting...</div><div id="status-detail"></div></div>

  <div class="facts">
    <div class="fact"><span>Admin pages connected</span><strong id="f-pages">-</strong></div>
    <div class="fact"><span>Server clock (last message)</span><strong id="f-clock">-</strong></div>
    <div class="fact"><span>Last message received</span><strong id="f-last">-</strong></div>
    <div class="fact"><span>Times the server went away</span><strong id="f-drops">0</strong></div>
  </div>

  <h2>What happened</h2>
  <ul id="log"></ul>
</main>

<script src="/socket.io/socket.io.js"></script>
<script>
(function () {
  var statusBox = document.getElementById('status');
  var statusText = document.getElementById('status-text');
  var statusDetail = document.getElementById('status-detail');
  var logList = document.getElementById('log');
  var drops = 0;
  var downSince = null;       // when the connection was lost
  var warnUntil = null;       // when the server said it would hibernate
  var warnRule = '';
  var warnKind = 'warning';   // 'warning' (minutes ahead) or 'countdown' (seconds to go)
  var timer = null;

  function pad(n) { return String(n).padStart(2, '0'); }
  function clock(d) { d = d || new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); }
  function span(ms) {
    var s = Math.max(0, Math.round(ms / 1000)), m = Math.floor(s / 60);
    return m > 0 ? m + 'm ' + pad(s % 60) + 's' : s + 's';
  }

  function setStatus(kind, text, detail) {
    statusBox.className = kind;
    statusText.textContent = text;
    statusDetail.textContent = detail || '';
  }

  function log(tagKind, tagText, message) {
    var li = document.createElement('li');
    var t = document.createElement('time'); t.textContent = clock();
    var tag = document.createElement('span'); tag.className = 'tag ' + tagKind; tag.textContent = tagText;
    li.appendChild(t); li.appendChild(tag); li.appendChild(document.createTextNode(message));
    logList.insertBefore(li, logList.firstChild);
    while (logList.children.length > 100) logList.removeChild(logList.lastChild);
  }

  function touch() { document.getElementById('f-last').textContent = clock(); }

  // Updates the big status box every second (countdowns)
  function render() {
    if (downSince) {
      setStatus('down', 'SERVER UNREACHABLE', 'Down for ' + span(Date.now() - downSince) + '. Trying to reconnect automatically...');
    } else if (warnUntil) {
      var left = warnUntil - Date.now();
      if (warnKind === 'countdown') {
        setStatus('warning', 'HIBERNATING IN ' + span(left), 'An admin can still cancel from the admin page' + (warnRule ? ' (' + warnRule + ')' : ''));
      } else {
        setStatus('warning', 'SERVER WILL HIBERNATE SOON',
          (left > 0 ? 'In about ' + span(left) : 'Any moment now') + (warnRule ? ' (' + warnRule + ' rule)' : ''));
      }
    }
  }

  var socket = io({ reconnectionDelay: 500, reconnectionDelayMax: 3000 });

  socket.on('connect', function () {
    if (downSince) {
      log('up', 'BACK', 'Server is back after ' + span(Date.now() - downSince));
    } else {
      log('up', 'CONNECTED', 'Connected to the kiosk server');
    }
    downSince = null;
    warnUntil = null;
    setStatus('connected', 'SERVER ONLINE', 'Connected');
    touch();
  });

  socket.on('disconnect', function (reason) {
    drops++;
    document.getElementById('f-drops').textContent = String(drops);
    downSince = Date.now();
    warnUntil = null;     // the warning has played out: the server is gone now
    log('down', 'LOST', 'Connection to the server was lost (' + reason + ')');
    render();
  });

  socket.on('connect_error', function (err) {
    if (err && err.message === 'unauthorized') {
      setStatus('down', 'PLEASE LOG IN', 'Open the admin page on this laptop, log in, then reload this page.');
    } else if (!downSince) {
      downSince = Date.now();
      render();
    }
  });

  socket.on('server:hello', function (info) {
    document.getElementById('f-pages').textContent = String(info.connectedPages);
    document.getElementById('f-clock').textContent = clock(new Date(info.serverTime));
    touch();
  });

  socket.on('hibernation:snapshot', function (snap) {
    touch();
    var events = (snap && snap.events) || [];
    if (events.length) log('', 'INFO', 'Server reports ' + events.length + ' recent hibernation event(s)');
  });

  socket.on('hibernation:policy-updated', function (p) {
    touch();
    log('', 'POLICY', 'Hibernation policy saved by ' + p.updated_by + ': ' + (p.enabled ? 'ON' : 'OFF') + ', ' + p.enforcement);
  });

  socket.on('hibernation:event', function (e) {
    touch();
    var kind = (e.type === 'warning' || e.type === 'hibernate_countdown') ? 'warning'
      : (e.type === 'hibernating' || e.type === 'hibernate_failed') ? 'down'
      : (e.type === 'resumed' ? 'up' : '');
    log(kind, String(e.type).toUpperCase(), e.message);
    if (e.type === 'warning' && typeof e.minutesLeft === 'number') {
      warnUntil = Date.now() + e.minutesLeft * 60000;
      warnRule = e.rule || '';
      warnKind = 'warning';
      render();
    } else if (e.type === 'hibernate_countdown' && typeof e.secondsLeft === 'number') {
      warnUntil = Date.now() + e.secondsLeft * 1000;
      warnRule = e.manual ? 'manual test' : (e.rule || '');
      warnKind = 'countdown';
      render();
    } else if (e.type === 'hibernate_cancelled' || e.type === 'hibernate_failed') {
      warnUntil = null;
      if (!downSince) setStatus('connected', 'SERVER ONLINE', e.message);
    } else if (e.type === 'resumed') {
      warnUntil = null;
      if (!downSince) setStatus('connected', 'SERVER ONLINE', e.message);
    } else if (e.type === 'hibernating') {
      warnUntil = null;
      setStatus('warning', 'SERVER IS HIBERNATING NOW', e.message);
    } else if (e.type === 'would_hibernate' || e.type === 'blocked') {
      warnUntil = null;
      if (!downSince) setStatus('connected', 'SERVER ONLINE', e.message);
    }
  });

  timer = setInterval(render, 1000);
})();
</script>
</body>
</html>`;

module.exports = { PAGE };
