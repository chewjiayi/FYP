// ============================================================
// XY CHANGE SUMMARY (DONE BY XY)
// ============================================================
//
// 1. LIVE PULSE ROUTING
//    const pulseRoutes                - Live Pulse API routes for kiosk server mode (DONE BY XY)
//    app.use('/api/pulse')            - Public Pulse API route wiring (DONE BY XY)
//    app.get('/pulse')                - Public Pulse dashboard page route (DONE BY XY)
//
// 2. ACCESS CONTROL
//    Pulse dashboard                  - Public live-display route; no admin login required (DONE BY XY)
//
// FIND COMMAND
//    rg -n "XY CHANGE SUMMARY|DONE BY XY" frontend backend
//
// CAEDEN CHANGE SUMMARY (DONE BY CAEDEN)
// ============================================================
//
// 1. PUBLIC PARAMETER CONFIG ROUTE
//    const parametersConfigStore      - Read shared kiosk parameter configuration (DONE BY CAEDEN)
//    GET /api/parameters              - Expose saved feedback/tree visual parameters to kiosk pages (DONE BY CAEDEN)
//
// FIND COMMAND
//    rg -n "DONE BY CAEDEN|CAEDEN CHANGE SUMMARY" frontend backend
// ============================================================

// ============================================================
// KIOSKSERVER.JS - TABLE OF CONTENTS (CTRL+F SEARCHABLE)
// ============================================================
// 
// 1. DEPENDENCIES & CONFIGURATION
//    require('dotenv').config()       - Load environment variables (DONE BY PRETI)
//    const express                    - Express framework import (DONE BY PRETI)
//    const https                      - HTTPS server module (DONE BY PRETI)
//    const fs                         - File system operations (DONE BY PRETI)
//    const path                       - Path utilities (DONE BY PRETI)
//    const session                    - Express session middleware (DONE BY PRETI)
//    const os                         - Operating system utilities (DONE BY PRETI)
//    const db                         - Database connection (DONE BY PRETI)
//    const feedbackRoutes             - Feedback routes module (DONE BY PRETI)
//    const pledgeboardRoutes          - Pledgeboard routes module (DONE BY PRETI)
//    const emailService               - Email service utilities (DONE BY PRETI)
//    const treeRoutes                 - Tree routes module (DONE BY PRETI)
//    const dataRetentionCleanup       - Data retention cleanup module (DONE BY PRETI)
//    const QRCode                     - QR code generation library (DONE BY PRETI)
//    const app                        - Express application instance (DONE BY PRETI)
//    const PORT                       - Server port number (3003, behind gateway on 3001) (DONE BY PRETI)
//
// 2. NETWORK INTERFACE FUNCTIONS
//    function getAllNetworkIPs()      - Get all available network IP addresses (DONE BY PRETI)
//    function getSelectedIP()         - Determine which IP address to use for server (DONE BY PRETI)
//    function getInterfaceForIP()     - Get network interface name for given IP (DONE BY PRETI)
//    const localIP                    - Selected local IP address (DONE BY PRETI)
//    const interfaceName              - Network interface name (DONE BY PRETI)
//
// 3. SSL CERTIFICATE CONFIGURATION
//    const certsDir                   - SSL certificates directory path (DONE BY PRETI)
//    const certPath                   - SSL certificate file path (DONE BY PRETI)
//    const keyPath                    - SSL private key file path (DONE BY PRETI)
//    let sslOptions                   - SSL configuration options (DONE BY PRETI)
//
// 4. MIDDLEWARE CONFIGURATION
//    app.use(express.json())          - JSON body parser middleware (DONE BY PRETI)
//    app.use(express.urlencoded())    - URL-encoded body parser middleware (DONE BY PRETI)
//    app.use(session())               - Session middleware configuration (DONE BY PRETI)
//    app.use(express.static())        - Static file serving for frontend (DONE BY PRETI)
//    app.use('/uploads'               - Static file serving for uploads (DONE BY PRETI)
//    app.use('/assets'                - Static file serving for assets (DONE BY PRETI)
//
// 5. API ROUTES (KIOSK)
//    app.use('/api/feedback'          - Feedback submission and management routes (DONE BY PRETI)
//    app.use('/api/pledgeboard'       - Pledgeboard data routes (DONE BY PRETI)
//    app.use('/api/tree'              - Tree data fetching routes (DONE BY PRETI)
//    app.get('/api/network-interfaces' - Get network interface information (DONE BY PRETI)
//    app.get('/api/server-info'       - Get server configuration information (DONE BY PRETI)
//    app.get('/api/generate-qr'       - Generate QR code for gateway URL (port 3001) (DONE BY PRETI)
//    app.get('/api/test-db'           - Test database connection endpoint (DONE BY PRETI)
//    app.get('/api/test-email-service' - Test email service endpoint (DONE BY PRETI)
//    app.get('/api/status'            - Server status for offline.html auto-refresh (DONE BY PRETI)
//
// 6. PAGE ROUTES (KIOSK)
//    app.get('/feedback'              - Serve feedback HTML page (DONE BY PRETI)
//    app.get('/pledgeboard'           - Serve pledgeboard HTML page (DONE BY PRETI)
//    app.get('/tree'                  - Serve tree HTML page (DONE BY PRETI)
//    app.get('/3dTree'                - Serve 3D tree HTML page (DONE BY Yu Kang)
//    app.get('/'                      - Redirect root to /feedback (DONE BY PRETI)
//
// 7. SERVER STARTUP FUNCTIONS
//    function printServerInfo()       - Display server information on startup (DONE BY PRETI)
//    function startServer()           - Start HTTP server on localhost:3003 (DONE BY PRETI)
//    const emailInitialized           - Email service initialization status (DONE BY PRETI)

// DONE BY PRETI
// Modified: Now runs on port 3003 (behind gateway on 3001)

require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const os = require('os');

const db = require('./db');
const feedbackRoutes = require('./feedbackRoutes');
const pledgeboardRoutes = require('./pledgeboardRoutes');
const pulseRoutes = require('./pulseRoutes');
const emailService = require('./emailService');
const parametersConfigStore = require('./parametersConfigStore');

const { router: treeRoutes, setDatabase: setTreeDatabase } = require('./treeRoutes');
const dataRetentionCleanup = require('./dataRetentionCleanup');
const QRCode = require('qrcode');

const app = express();
const PORT = 3003; // CHANGED: Now runs on 3003 (behind gateway on 3001)

// ==================== NETWORK INTERFACE FUNCTIONS ====================

function getAllNetworkIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];

  for (const ifaceName in interfaces) {
    for (const iface of interfaces[ifaceName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({
          interface: ifaceName,
          address: iface.address,
          mac: iface.mac,
          cidr: iface.cidr,
        });
      }
    }
  }
  return ips;
}

function getSelectedIP() {
  let selectedIP = null;

  const args = process.argv.slice(2);
  for (const arg of args) {
    if (arg.startsWith('--ip=')) {
      selectedIP = arg.split('=')[1];
      break;
    }
  }

  if (!selectedIP && process.env.SERVER_IP) {
    selectedIP = process.env.SERVER_IP;
  }

  if (selectedIP) {
    const availableIPs = getAllNetworkIPs();
    const isValidIP = availableIPs.some((ip) => ip.address === selectedIP);

    if (!isValidIP) {
      console.warn(`⚠️ Selected IP "${selectedIP}" is not available. Using first available IP instead.`);
      selectedIP = null;
    }
  }

  if (!selectedIP) {
    const availableIPs = getAllNetworkIPs();
    if (availableIPs.length > 0) {
      selectedIP = availableIPs[0].address;
      console.log(`📡 Using first available IP: ${selectedIP} (${availableIPs[0].interface})`);
    } else {
      selectedIP = 'localhost';
      console.log('⚠️ No network interfaces found. Using localhost');
    }
  }

  return selectedIP;
}

function getInterfaceForIP(ipAddress) {
  const interfaces = os.networkInterfaces();
  for (const ifaceName in interfaces) {
    for (const iface of interfaces[ifaceName]) {
      if (iface.family === 'IPv4' && iface.address === ipAddress) {
        return ifaceName;
      }
    }
  }
  return 'Unknown';
}

const localIP = getSelectedIP();
const interfaceName = getInterfaceForIP(localIP);

// ==================== SSL CERTIFICATE CONFIGURATION ====================

// NOTE: SSL is handled by gateway server, but we keep this for direct access if needed
const certsDir = path.join(__dirname, 'certs');
const certPath = path.join(certsDir, 'selfsigned.pem');
const keyPath = path.join(certsDir, 'selfsigned.key');

let sslOptions = null;

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  console.log('🔒 Using existing SSL certificates from certs/ folder');
  sslOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
} else {
  console.log('🔒 Generating new SSL certificates...');
  try {
    const selfsigned = require('selfsigned');
    const attrs = [{ name: 'commonName', value: 'localhost' }];
    const pems = selfsigned.generate(attrs, { days: 365, keySize: 2048 });

    if (!fs.existsSync(certsDir)) {
      fs.mkdirSync(certsDir, { recursive: true });
      console.log('✅ Created certs/ directory');
    }

    fs.writeFileSync(certPath, pems.cert);
    fs.writeFileSync(keyPath, pems.private);

    sslOptions = { key: pems.private, cert: pems.cert };
    console.log('✅ SSL certificates generated in certs/ folder');
  } catch (error) {
    console.warn('⚠️ Could not generate SSL certificates. Running in HTTP mode.');
  }
}

// ==================== MIDDLEWARE CONFIGURATION ====================

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: true,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      secure: sslOptions !== null,
      httpOnly: true,
      maxAge: 1800000,
      sameSite: 'lax',
    },
  })
);

// Static files
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// Wire DB into tree routes
setTreeDatabase(db);

// ==================== API ROUTES (KIOSK) ====================

app.use('/api/feedback', feedbackRoutes);
app.use('/api/pledgeboard', pledgeboardRoutes);
app.use('/api/pulse', pulseRoutes);
app.use('/api/tree', treeRoutes);

app.get('/api/parameters', (req, res) => {
  try {
    res.json({ success: true, parameters: parametersConfigStore.readParametersConfig() });
  } catch (error) {
    console.error('Error loading public parameters:', error);
    res.status(500).json({ success: false, error: 'Failed to load parameters' });
  }
});

// Network info
app.get('/api/network-interfaces', (req, res) => {
  res.json({
    interfaces: getAllNetworkIPs(),
    current: { ip: localIP, interface: interfaceName, port: PORT },
  });
});

// Server info
app.get('/api/server-info', (req, res) => {
  const protocol = sslOptions ? 'https' : 'http';
  const url = `${protocol}://${localIP}:${PORT}/feedback`;

  res.json({
    ip: localIP,
    interface: interfaceName,
    port: PORT,
    protocol,
    url,
    httpsAvailable: sslOptions !== null,
    networkInterfaces: getAllNetworkIPs(),
    certsPath: sslOptions ? certsDir : null,
  });
});

// QR code (for feedback URL) - Now generates for gateway port 3001
app.get('/api/generate-qr', async (req, res) => {
  try {
    const protocol = sslOptions ? 'https' : 'http';
    // CHANGED: Generate QR for gateway port 3001
    const url = `${protocol}://${localIP}:3001/feedback`;

    const qrSvg = await QRCode.toString(url, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 200,
      color: { dark: '#000000', light: '#ffffff' },
    });

    res.json({ success: true, qrSvg, url, ip: localIP, interface: interfaceName, port: 3001 });
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ success: false, error: 'Failed to generate QR code' });
  }
});

// Test database connection
app.get('/api/test-db', (req, res) => {
  db.query(
    'SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ?',
    [process.env.DB_NAME || 'dp_kiosk_db'],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error: ' + err.message });
      res.json({
        message: 'MySQL database is working!',
        tables: results.length > 0 ? results.map((r) => r.TABLE_NAME) : 'No tables found',
        database: process.env.DB_NAME || 'dp_kiosk_db',
      });
    }
  );
});

// Email test endpoint
app.get('/api/test-email-service', (req, res) => {
  const emailInitialized = emailService.initEmailService();
  if (emailInitialized) {
    res.json({
      success: true,
      message: 'Email service initialized',
      smtpUser: process.env.SMTP_USER || 'Using default',
    });
  } else {
    res.json({
      success: false,
      message: 'Email service failed to initialize',
      error: 'Check SMTP credentials',
    });
  }
});

// ==================== Offline Auto Refresh ===================
// Status endpoint - for offline.html to detect when server is back online
app.get('/api/status', (req, res) => {
  res.json({
    online: true,
    status: 'running',
    message: 'Kiosk server is online',
    timestamp: new Date().toISOString()
  });
});

// ==================== PAGE ROUTES (KIOSK) ====================

app.get('/feedback', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/feedback/feedback.html'));
});

app.get('/pledgeboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/Pledgeboard/Pledgeboard.html'));
});

app.get('/tree', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/tree/tree.html'));
});

app.get('/3dTree', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/3dTree/3dTree.html'));
});

app.get('/pulse', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pulse/pulse.html'));
});

app.get('/', (req, res) => {
  res.redirect('/feedback');
});

// ==================== START SERVER ====================

function printServerInfo(isHttps) {
  console.log('\n🌐 ============================================');
  console.log('   KIOSK SERVER (Schedule-Controlled)');
  console.log('============================================');
  console.log(`📡 Interface: ${interfaceName}`);
  console.log(`📡 IP: ${localIP}`);
  console.log(`🔌 Internal Port: ${PORT} (proxied through gateway on 3001)`);
  console.log(`📊 Direct Access: http://localhost:${PORT}/feedback`);
  console.log(`📅 Started: ${new Date().toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}`);
  console.log('============================================');
  console.log('💡 Users access via gateway: https://${localIP}:3001');
  console.log('============================================\n');

  dataRetentionCleanup.initializeCleanup();
}

function startServer() {
  // For simplicity, run kiosk server on HTTP (gateway handles SSL)
  app.listen(PORT, 'localhost', () => printServerInfo(false));
}

// Initialize email service at startup
const emailInitialized = emailService.initEmailService();
console.log(emailInitialized ? '📧 Email service initialized successfully' : '⚠️ Email service not initialized');

startServer();
