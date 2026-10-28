// gatewayServer.js - Always running gateway on port 3001
// Routes traffic based on schedule status OR manual mode + actual kiosk status
// CRITICAL FIX: Conditional body parsing - DON'T parse bodies that will be proxied

require('dotenv').config();
const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { exec } = require('child_process');

// Import schedule checking logic
const { shouldKioskRunNow, loadSchedules } = require('./scheduleRunner');

const app = express();
const PORT = 3001;

// Mode file path
const MODE_FILE = path.join(__dirname, 'server-control-mode.json');

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
  console.log('🔐 Using existing SSL certificates from certs/ folder');
  sslOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
} else {
  console.log('🔐 Generating new SSL certificates...');
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

// ==================== MIDDLEWARE ====================

// CRITICAL FIX: DO NOT USE express.json() or express.urlencoded()
// These consume the request body, making it impossible to proxy
// The body will be parsed by the backend (kiosk) server instead

// Serve static files for offline page
app.use('/offline-assets', express.static(path.join(__dirname, '../frontend/offline')));

// ==================== HELPER FUNCTIONS ====================

// Read server control mode
function readModeConfig() {
  try {
    if (fs.existsSync(MODE_FILE)) {
      const data = fs.readFileSync(MODE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading mode file:', err);
  }
  
  return { mode: 'auto' };
}

// Check if kiosk service is actually running
function isKioskActuallyRunning() {
  return new Promise((resolve) => {
    exec('systemctl is-active kiosk.service', (err, stdout, stderr) => {
      const status = stdout.trim();
      resolve(status === 'active');
    });
  });
}

// Determine if kiosk should be accessible
// Returns true if kiosk should be available to users
async function shouldKioskBeAccessible() {
  const modeConfig = readModeConfig();
  
  if (modeConfig.mode === 'manual') {
    // MANUAL MODE: Check if kiosk is actually running
    const isRunning = await isKioskActuallyRunning();
    console.log(`[MANUAL MODE] Kiosk actually running: ${isRunning}`);
    return isRunning;
  } else {
    // AUTO MODE: Check schedules
    const shouldRun = shouldKioskRunNow();
    console.log(`[AUTO MODE] Schedule says kiosk should run: ${shouldRun}`);
    return shouldRun;
  }
}

// ==================== PROXY CONFIGURATION ====================

const KIOSK_SERVER_URL = 'http://localhost:3003'; // Kiosk server on port 3003

// Proxy options - stream the body without parsing
const proxyOptions = {
  target: KIOSK_SERVER_URL,
  changeOrigin: true,
  ws: true, // proxy websockets
  logLevel: 'warn',
  
  // CRITICAL: Set this to false to prevent body parsing in proxy
  // This allows the raw request stream to be forwarded
  selfHandleResponse: false,
  
  // CRITICAL: Increase timeouts for large file uploads (base64 photos can be 10MB+)
  timeout: 120000, // 2 minutes timeout
  proxyTimeout: 120000, // 2 minutes for backend response
  
  onError: (err, req, res) => {
    console.error('❌ Proxy Error:', err.message);
    // If proxy fails, show offline page
    if (!res.headersSent) {
      res.status(502).sendFile(path.join(__dirname, '../frontend/offline/offline.html'));
    }
  },
  
  onProxyReq: (proxyReq, req, res) => {
    // Log large uploads for debugging
    const contentLength = req.headers['content-length'];
    if (contentLength && parseInt(contentLength) > 1000000) {
      console.log(`📤 Large upload: ${req.method} ${req.path} (${(parseInt(contentLength) / 1024 / 1024).toFixed(2)} MB)`);
    }
  },
  
  onProxyRes: (proxyRes, req, res) => {
    // Log successful proxy responses for debugging
    console.log(`✅ Proxied ${req.method} ${req.path} → Status: ${proxyRes.statusCode}`);
  }
};

// ==================== SCHEDULE-BASED ROUTING ====================

// Middleware to check schedule/manual mode and route accordingly
app.use(async (req, res, next) => {
  // Check if kiosk should be accessible
  const shouldBeAccessible = await shouldKioskBeAccessible();
  
  const modeConfig = readModeConfig();
  const mode = modeConfig.mode || 'auto';
  
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path} - Mode: ${mode.toUpperCase()}, Accessible: ${shouldBeAccessible}`);
  
  if (shouldBeAccessible) {
    // Kiosk should be accessible - proxy to kiosk server
    // IMPORTANT: Don't parse the body before proxying
    createProxyMiddleware(proxyOptions)(req, res, next);
  } else {
    // Kiosk should not be accessible - show offline page
    if (req.path === '/api/status') {
      // API endpoint to check status
      return res.json({
        online: false,
        mode: mode,
        message: mode === 'manual' ? 'Server is manually stopped' : 'Server is offline',
        schedules: loadSchedules().schedules.filter(s => s.is_active),
      });
    }
    
    // Serve offline page for all other requests
    res.sendFile(path.join(__dirname, '../frontend/offline/offline.html'));
  }
});

// ==================== START SERVER ====================

function printServerInfo(isHttps) {
  console.log('\n🌐 ============================================');
  console.log('   GATEWAY SERVER (Always Running)');
  console.log('============================================');
  console.log(`📡 Interface: ${interfaceName}`);
  console.log(`📡 IP: ${localIP}`);
  console.log(`🚀 URL: ${isHttps ? 'https' : 'http'}://${localIP}:${PORT}`);
  console.log(`🔄 Proxy Target: ${KIOSK_SERVER_URL} (when accessible)`);
  console.log(`✅ Body Handling: RAW STREAM (no parsing at gateway)`);
  console.log(`📦 Body Size Limit: Handled by backend (kiosk: 50MB)`);
  console.log(`⏱️ Proxy Timeout: 120 seconds`);
  console.log(`📅 Started: ${new Date().toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}`);
  console.log('============================================\n');
  console.log('💡 This gateway routes traffic based on:');
  console.log('   - AUTO MODE → Schedule determines accessibility');
  console.log('   - MANUAL MODE → Actual kiosk status determines accessibility');
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

startServer();
