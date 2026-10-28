const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config', 'bluetoothAssets.json');

const DEFAULT_ASSETS = [];

function ensureConfigFile() {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_ASSETS, null, 2), 'utf8');
  }
}

function normalizeAsset(asset = {}, fallbackIndex = 0) {
  const bluetoothId = String(asset.bluetoothId || asset.bluetooth_id || asset.id || '').trim().toUpperCase();
  const name = String(asset.name || asset.assetName || '').trim();
  const category = String(asset.category || asset.type || '').trim();
  const location = String(asset.location || '').trim();
  const notes = String(asset.notes || '').trim();
  const addedAt = asset.addedAt || asset.createdAt || new Date().toISOString();

  return {
    id: Number(asset.id ?? fallbackIndex + 1),
    bluetoothId,
    name: name || bluetoothId || `Asset ${fallbackIndex + 1}`,
    category,
    location,
    notes,
    active: asset.active !== false,
    addedAt
  };
}

function readBluetoothAssets() {
  ensureConfigFile();
  try {
    const stored = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const list = Array.isArray(stored) ? stored : (stored.assets || []);
    return list.map((asset, index) => normalizeAsset(asset, index)).filter(asset => asset.bluetoothId);
  } catch (error) {
    console.error('Failed to read bluetooth assets:', error);
    return [];
  }
}

function writeBluetoothAssets(assets) {
  ensureConfigFile();
  const normalized = (Array.isArray(assets) ? assets : []).map((asset, index) => normalizeAsset(asset, index));
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(normalized, null, 2), 'utf8');
  return normalized;
}

function addBluetoothAsset(asset) {
  const assets = readBluetoothAssets();
  const normalized = normalizeAsset(asset, assets.length);
  if (!normalized.bluetoothId) {
    throw new Error('Bluetooth ID is required');
  }

  const existingIndex = assets.findIndex((item) => item.bluetoothId === normalized.bluetoothId);
  if (existingIndex >= 0) {
    assets[existingIndex] = { ...assets[existingIndex], ...normalized, id: assets[existingIndex].id };
  } else {
    assets.push({ ...normalized, id: assets.length ? Math.max(...assets.map((item) => Number(item.id) || 0)) + 1 : 1 });
  }

  return writeBluetoothAssets(assets);
}

function removeBluetoothAsset(bluetoothId) {
  const key = String(bluetoothId || '').trim().toUpperCase();
  const filtered = readBluetoothAssets().filter((asset) => asset.bluetoothId !== key);
  writeBluetoothAssets(filtered);
  return filtered;
}

module.exports = {
  readBluetoothAssets,
  writeBluetoothAssets,
  addBluetoothAsset,
  removeBluetoothAsset
};
