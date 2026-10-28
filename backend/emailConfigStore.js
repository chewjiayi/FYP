const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config', 'emailConfig.json');

function ensureConfigFile() {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(CONFIG_PATH)) {
    const defaultConfig = {
      provider: 'gmail',
      senderEmail: '',
      gmail: { user: '', pass: '' },
      outlook: { user: '', pass: '' },
      custom: { host: '', port: 587, secure: false, user: '', pass: '' }
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2), 'utf8');
  }
}

function getEmailConfig() {
  ensureConfigFile();
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function saveEmailConfig(cfg) {
  ensureConfigFile();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

function getSafeEmailConfig() {
  const cfg = getEmailConfig();
  const mask = (v) => (v ? '********' : '');

  return {
    provider: cfg.provider,
    senderEmail: cfg.senderEmail,
    gmail: { user: cfg.gmail?.user || '', pass: mask(cfg.gmail?.pass) },
    outlook: { user: cfg.outlook?.user || '', pass: mask(cfg.outlook?.pass) },
    custom: {
      host: cfg.custom?.host || '',
      port: cfg.custom?.port ?? 587,
      secure: !!cfg.custom?.secure,
      user: cfg.custom?.user || '',
      pass: mask(cfg.custom?.pass)
    }
  };
}

module.exports = { getEmailConfig, saveEmailConfig, getSafeEmailConfig };