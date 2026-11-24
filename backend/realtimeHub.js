// realtimeHub.js
// Live (WebSocket) connection between the server and the admin pages, using Socket.IO.
//
//   - Only logged-in admins can connect (it uses the same login session as the website).
//   - The server can PUSH messages to every connected admin page instantly, for example
//     "hibernating in 5 minutes".
//   - If the server goes away (hibernates, crashes), the pages notice the dropped connection
//     within seconds, and reconnect by themselves when it is back.
//
// Messages sent to the pages (events):
//   server:hello                 right after connecting: server time + how many pages are connected
//   hibernation:snapshot         the recent hibernation events, so a page that just opened has context
//   hibernation:event            one new hibernation event (warning, would-hibernate, blocked, ...)
//   hibernation:policy-updated   someone saved the hibernation policy (so other pages can refresh)
// BY ZHI RUO

const { Server } = require('socket.io');

const ROOM = 'admins';
let io = null;
let snapshotProvider = null;
const clients = new Map();   // socket.id -> { username, role, ip, connectedAt }

// A WebSocket handshake is not covered by the browser's same-origin rule, so check it ourselves:
// if the request says it comes from another website, refuse it.
function sameOriginOnly(req, callback) {
    const origin = req.headers.origin;
    if (!origin) return callback(null, true);        // not from a browser page (e.g. a script)
    try {
        callback(null, new URL(origin).host === req.headers.host);
    } catch (err) {
        callback(null, false);
    }
}

// httpServer: the server created in server.js. sessionMiddleware: the express-session middleware.
function attach(httpServer, sessionMiddleware, options = {}) {
    if (io) return io;

    io = new Server(httpServer, {
        // Check the connection often, so a missing server is noticed in about 10 seconds (default is ~45)
        pingInterval: options.pingInterval || 5000,
        pingTimeout: options.pingTimeout || 5000,
        allowRequest: sameOriginOnly
    });

    io.engine.use(sessionMiddleware);   // gives each connection the same login session as the website

    io.use((socket, next) => {
        const user = socket.request.session && socket.request.session.user;
        if (!user) return next(new Error('unauthorized'));
        socket.data.user = { username: user.username, role: user.role };
        next();
    });

    io.on('connection', socket => {
        const user = socket.data.user;
        clients.set(socket.id, {
            username: user.username,
            role: user.role,
            ip: socket.handshake.address,
            connectedAt: new Date().toISOString()
        });
        socket.join(ROOM);

        socket.emit('server:hello', { serverTime: new Date().toISOString(), connectedPages: clients.size });
        if (snapshotProvider) {
            try { socket.emit('hibernation:snapshot', snapshotProvider()); } catch (err) { /* snapshot is optional */ }
        }

        socket.on('disconnect', () => clients.delete(socket.id));
    });

    console.log('🔌 Live connection (WebSocket) enabled for admin pages');
    return io;
}

// Lets another module supply the "recent events" sent to a page when it connects
function setSnapshotProvider(fn) {
    snapshotProvider = fn;
}

// Push a message to every connected admin page. Does nothing if the hub is not attached.
function broadcast(event, payload) {
    if (!io) return 0;
    io.to(ROOM).emit(event, payload);
    return clients.size;
}

function connectionCount() {
    return clients.size;
}

function connectionList() {
    return [...clients.values()].sort((a, b) => a.connectedAt.localeCompare(b.connectedAt));
}

// Mainly for tests
function close() {
    if (io) { io.close(); io = null; }
    clients.clear();
    snapshotProvider = null;
}

module.exports = { attach, setSnapshotProvider, broadcast, connectionCount, connectionList, close };
