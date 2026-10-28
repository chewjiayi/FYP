//===============================================================
// Done by Yu Kang
// Bluetooth proximity manager (accepts reports from browsers using Web Bluetooth)
// - Browsers can use navigator.bluetooth APIs and post reports to the server
// - Server stores recent device reports (id or mac) with RSSI and lastSeen
// - Keeps compatibility with existing code that checks for 'mac' by accepting either
//===============================================================

const nearbyDevices = new Map();

// RSSI threshold for proximity (adjust as needed)
const RSSI_THRESHOLD = -10;

// How long to keep a device without being re-reported (ms)
const DEVICE_TIMEOUT = 20000;

function startBluetoothScanner() {
    // No-op for server-side now: scanning happens in browser clients
    console.log('Bluetooth scanning moved to client (Web Bluetooth). Start endpoint is ready to accept reports.');
}

/**
 * Report a device seen by a client.
 * payload should include at least one identifier: { id, mac }
 * optional: name, rssi, source
 */
function reportDevice({ id, mac, name, rssi, source }) {
    const key = (mac || id || '').toString().toUpperCase();
    if (!key) return false;

    const device = {
        id: id || null,
        mac: mac || null,
        name: name || null,
        rssi: typeof rssi === 'number' ? rssi : null,
        source: source || 'client',
        lastSeen: Date.now()
    };

    nearbyDevices.set(key, device);
    
    // Debug logging
    console.log(`✅ Device reported: MAC=${device.mac} ID=${device.id} Name=${device.name} RSSI=${device.rssi} dBm`);

    return true;
}

function isDeviceNearby(identifier) {
    if (!identifier) return false;
    const key = identifier.toString().toUpperCase();
    const device = nearbyDevices.get(key);
    if (!device) return false;
    // If RSSI exists, apply threshold
    if (device.rssi !== null && device.rssi !== undefined) {
        return device.rssi >= RSSI_THRESHOLD;
    }
    // If no RSSI provided, treat presence as nearby
    return true;
}

function getDeviceRSSI(identifier) {
    if (!identifier) return null;
    const key = identifier.toString().toUpperCase();
    const device = nearbyDevices.get(key);
    return device ? device.rssi : null;
}

function getNearbyDevicesList() {
    cleanupOldDevices();
    return Array.from(nearbyDevices.entries()).map(([key, data]) => ({ key, ...data }));
}

function cleanupOldDevices() {
    const now = Date.now();
    for (const [key, device] of nearbyDevices.entries()) {
        if (now - device.lastSeen > DEVICE_TIMEOUT) {
            nearbyDevices.delete(key);
        }
    }
}

// Periodic cleanup
setInterval(cleanupOldDevices, 5000);

function logNearbyDevices() {
    cleanupOldDevices();
    const devices = getNearbyDevicesList();
    
    if (devices.length === 0) {
        console.log('📡 [Bluetooth] No devices detected nearby');
        return;
    }
    
    console.log(`📡 [Bluetooth] ${devices.length} device(s) detected nearby:`);
    devices.forEach((device, idx) => {
        const mac = device.mac ? device.mac.toUpperCase() : 'N/A';
        const id = device.id || 'N/A';
        const name = device.name ? `"${device.name}"` : '(unnamed)';
        const rssi = device.rssi !== null ? `${device.rssi} dBm` : 'N/A';
        const age = Math.round((Date.now() - device.lastSeen) / 1000);
        
        console.log(`   [${idx + 1}] MAC: ${mac} | ID: ${id} | Name: ${name} | RSSI: ${rssi} | Age: ${age}s`);
    });
}

module.exports = {
    startBluetoothScanner,
    reportDevice,
    isDeviceNearby,
    getDeviceRSSI,
    getNearbyDevicesList,
    logNearbyDevices,
    nearbyDevices,
    RSSI_THRESHOLD
};
