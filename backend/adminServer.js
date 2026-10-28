// ============================================================
// XY CHANGE SUMMARY (DONE BY XY)
// ============================================================
//
// 1. LIVE PULSE ROUTING
//    const pulseRoutes                - Live Pulse API routes for admin server mode (DONE BY XY)
//    app.use('/api/pulse')            - Public Pulse API route wiring (DONE BY XY)
//    app.get('/pulse')                - Public Pulse dashboard page route (DONE BY XY)
//
// 2. ACCESS CONTROL
//    Pulse dashboard                  - Public live-display route; no admin login required (DONE BY XY)
//
// FIND COMMAND
//    rg -n "XY CHANGE SUMMARY|DONE BY XY" frontend backend
// ============================================================

// ============================================================
// ADMINSERVER.JS - TABLE OF CONTENTS (CTRL+F SEARCHABLE)
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
//    const adminRoutes                - Admin routes module (DONE BY PRETI)
//    const dataExportRoutes           - Data export routes module (DONE BY PRETI)
//    const emailService               - Email service utilities (DONE BY PRETI)
//    const pledgeboardRoutes          - Pledgeboard routes module (DONE BY PRETI)
//    const treeRoutes                 - Tree routes module (DONE BY PRETI)
//    const app                        - Express application instance (DONE BY PRETI)
//    const PORT                       - Server port number (3002) (DONE BY PRETI)
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
// 5. API ROUTES (ADMIN)
//    app.use('/api/admin'             - Admin API routes (DONE BY PRETI)
//    app.use('/api/admin/data-export' - Data export API routes (DONE BY PRETI)
//    app.use('/api/tree'              - Tree data fetching routes (DONE BY PRETI)
//    app.use('/api/pledgeboard'       - Pledgeboard data fetching routes (DONE BY PRETI)
//    app.get('/api/test-db'           - Test database connection endpoint (DONE BY PRETI)
//    app.get('/api/test-email-service' - Test email service endpoint (DONE BY PRETI)
//
// 6. PAGE ROUTES (ADMIN)
//    app.get('/admin'                 - Serve admin HTML page (DONE BY PRETI)
//    app.get('/'                      - Redirect root to /admin (DONE BY PRETI)
//
// 7. SERVER STARTUP FUNCTIONS
//    function printServerInfo()       - Display server information on startup (DONE BY PRETI)
//    function startServer()           - Start HTTPS or HTTP server (DONE BY PRETI)
//    const emailInitialized           - Email service initialization status (DONE BY PRETI)

// adminServer.js - Admin server (Admin UI + Admin API) on PORT 3002

require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const session = require('express-session');
const os = require('os');

const db = require('./db');
const adminRoutes = require('./adminRoutes');
const dataExportRoutes = require('./dataExportRoutes');
const emailService = require('./emailService');
const auth = require('./auth');
const pulseRoutes = require('./pulseRoutes');
const parametersConfigStore = require('./parametersConfigStore');

// Data fetching for Tree + Pledgeboard routes
const pledgeboardRoutes = require('./pledgeboardRoutes');
const { router: treeRoutes, setDatabase: setTreeDatabase } = require('./treeRoutes');

const app = express();
const PORT = 3002; 

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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Admin must have sessions (auth middleware relies on req.session)
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

// Pulse screen is public so it can be displayed without an admin session.

// Static files (admin html/css/js from frontend)
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/assets', express.static(path.join(__dirname, '../assets')));

// Wire DB into treeRoutes 
setTreeDatabase(db);

// ==================== API ROUTES (ADMIN) ====================

app.use('/api/admin', adminRoutes);
app.use('/api/admin/data-export', dataExportRoutes);
app.use('/api/pulse', pulseRoutes);

// Tree data fetching for Digital Tree tab
app.use('/api/tree', treeRoutes);

// Pledgeboard data fetching for Pledgeboard tab
app.use('/api/pledgeboard', pledgeboardRoutes);

app.get('/api/parameters', (req, res) => {
  try {
    res.json({ success: true, parameters: parametersConfigStore.readParametersConfig() });
  } catch (error) {
    console.error('Error loading public parameters:', error);
    res.status(500).json({ success: false, error: 'Failed to load parameters' });
  }
});

// Optional test route 
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

// Email test 
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

// ==================== PAGE ROUTES (ADMIN) ====================

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin/admin.html'));
});

app.get(['/tree-demo', '/tree-demo/'], auth.requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/tree/tree.html'));
});

app.get('/pulse', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pulse/pulse.html'));
});

app.get('/', (req, res) => {
  res.redirect('/admin');
});

// ==================== START SERVER ====================

function printServerInfo(isHttps) {
  console.log('\n🌐 ============================================');
  console.log('   ADMIN SERVER (Admin UI + Admin API)');
  console.log('============================================');
  console.log(`📡 Interface: ${interfaceName}`);
  console.log(`📡 IP: ${localIP}`);
  console.log(`🚀 URL: ${isHttps ? 'https' : 'http'}://${localIP}:${PORT}`);
  console.log(`⚙️ Admin: ${isHttps ? 'https' : 'http'}://${localIP}:${PORT}/admin`);
  console.log(`📦 Data Export: ${isHttps ? 'https' : 'http'}://${localIP}:${PORT}/api/admin/data-export`);
  console.log(`📅 Started: ${new Date().toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}`);
  console.log('============================================\n');
}

function startServer() {
  if (sslOptions) {
    const server = https.createServer(sslOptions, app);
    server.listen(PORT, localIP, () => printServerInfo(true));
  } else {
    app.listen(PORT, localIP, () => printServerInfo(false));
  }
}

// Initialize email service at startup 
const emailInitialized = emailService.initEmailService();
console.log(emailInitialized ? '📧 Email service initialized successfully' : '⚠️ Email service not initialized');

startServer();
