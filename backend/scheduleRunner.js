// scheduleRunner.js - Auto-path detection version with manual mode support
// Runs every minute via cron to check if kiosk should be running

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

// ==================== AUTO-DETECT PATHS ====================

// Get the directory where this script is located
const SCRIPT_DIR = __dirname;

// Config file is in the same directory as this script
const CONFIG_PATH = path.join(SCRIPT_DIR, 'kiosk-schedules.json');
const MODE_FILE = path.join(SCRIPT_DIR, 'server-control-mode.json');

// Log file in user's home directory
const HOME_DIR = os.homedir();
const LOG_PATH = path.join(HOME_DIR, 'schedule-runner.log');

const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB

// Log the paths on startup (for debugging)
console.log('=== Auto-detected Paths ===');
console.log('Script directory:', SCRIPT_DIR);
console.log('Config file:', CONFIG_PATH);
console.log('Mode file:', MODE_FILE);
console.log('Log file:', LOG_PATH);
console.log('Home directory:', HOME_DIR);
console.log('Current user:', os.userInfo().username);
console.log('===========================\n');

// ==================== FUNCTIONS ====================

// Rotate log file if it gets too large
function rotateLogIfNeeded() {
  try {
    if (fs.existsSync(LOG_PATH)) {
      const stats = fs.statSync(LOG_PATH);
      if (stats.size > MAX_LOG_SIZE) {
        const backupPath = LOG_PATH + '.old';
        fs.renameSync(LOG_PATH, backupPath);
        log('📋 Log file rotated (exceeded 5MB)');
      }
    }
  } catch (err) {
    console.error('Failed to rotate log:', err.message);
  }
}

// Enhanced logging function
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const localTime = new Date().toLocaleString('en-SG', { timeZone: 'Asia/Singapore' });
  const logMsg = `[${timestamp}] [${level}] ${message}\n`;
  
  console.log(logMsg.trim());
  
  try {
    fs.appendFileSync(LOG_PATH, logMsg);
  } catch (err) {
    console.error('Failed to write log:', err.message);
  }
}

// Check if manual mode is active
// Returns true if schedule runner should continue, false if it should skip
function shouldRunScheduleCheck() {
  try {
    if (fs.existsSync(MODE_FILE)) {
      const data = fs.readFileSync(MODE_FILE, 'utf8');
      const config = JSON.parse(data);
      
      if (config.mode === 'manual') {
        log('✋ MANUAL MODE ACTIVE - Skipping schedule check', 'INFO');
        log('Schedules are temporarily disabled for manual control', 'INFO');
        return false;
      }
    }
  } catch (err) {
    log(`⚠️  Error reading mode file: ${err.message}`, 'WARN');
    log('Defaulting to AUTO mode', 'WARN');
  }
  
  return true; // Default to auto mode if file doesn't exist or can't be read
}

// Execute command with error handling
function execCmd(cmd) {
  return new Promise((resolve, reject) => {
    log(`Executing: ${cmd}`, 'DEBUG');
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        log(`Command failed: ${cmd}`, 'ERROR');
        log(`Error: ${stderr || err.message}`, 'ERROR');
        return reject(stderr || err.message);
      }
      const output = stdout.trim();
      if (output) {
        log(`Command output: ${output}`, 'DEBUG');
      }
      resolve(output);
    });
  });
}

// Load schedules from JSON config file
function loadSchedules() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      log('Config file not found, creating empty schedules', 'WARN');
      log(`Expected location: ${CONFIG_PATH}`, 'WARN');
      
      const emptyConfig = { 
        schedules: [], 
        last_updated: new Date().toISOString() 
      };
      
      // Create directory if it doesn't exist
      const configDir = path.dirname(CONFIG_PATH);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
        log(`Created config directory: ${configDir}`, 'INFO');
      }
      
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(emptyConfig, null, 2));
      log(`Created empty config file at: ${CONFIG_PATH}`, 'INFO');
      return emptyConfig;
    }
    
    const data = fs.readFileSync(CONFIG_PATH, 'utf8');
    const config = JSON.parse(data);
    
    if (!config.schedules || !Array.isArray(config.schedules)) {
      log('Invalid config structure, using empty schedules', 'WARN');
      return { schedules: [] };
    }
    
    log(`Loaded ${config.schedules.length} schedules from config`, 'INFO');
    return config;
    
  } catch (err) {
    log(`Error loading config: ${err.message}`, 'ERROR');
    log(`Stack trace: ${err.stack}`, 'DEBUG');
    return { schedules: [] };
  }
}

// Check if current time matches a schedule
function shouldKioskRunNow() {
  const config = loadSchedules();
  const now = new Date();
  
  // Get current time components
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute; // minutes since midnight
  
  const currentDayOfWeek = now.getDay() + 1; // 1=Sunday, 7=Saturday (MySQL format)
  const currentDate = now.toLocaleDateString('sv-SE'); // YYYY-MM-DD format
  const currentTimeStr = now.toLocaleTimeString('en-SG', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  
  log(`Checking schedules at ${currentTimeStr} on ${currentDate} (Day ${currentDayOfWeek})`, 'INFO');
  log(`Total schedules in config: ${config.schedules?.length || 0}`, 'INFO');
  
  // Check each active schedule
  let activeSchedulesChecked = 0;
  let inactiveSchedulesSkipped = 0;
  
  for (const schedule of config.schedules || []) {
    if (!schedule.is_active) {
      inactiveSchedulesSkipped++;
      log(`Skipping inactive schedule: "${schedule.schedule_name}"`, 'DEBUG');
      continue;
    }
    
    activeSchedulesChecked++;
    log(`Checking schedule #${activeSchedulesChecked}: "${schedule.schedule_name}" (${schedule.schedule_type})`, 'INFO');
    
    // Parse start and end times
    try {
      const [startHour, startMin] = schedule.start_time.split(':').map(Number);
      const [endHour, endMin] = schedule.end_time.split(':').map(Number);
      
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;
      
      log(`  Time window: ${schedule.start_time} - ${schedule.end_time}`, 'DEBUG');
      
      // Check if current time is within schedule window
      let inTimeWindow = false;
      
      if (endTime > startTime) {
        // Normal case: 09:00 - 17:00
        inTimeWindow = currentTime >= startTime && currentTime < endTime;
        log(`  Same-day schedule: current=${currentTime}, start=${startTime}, end=${endTime}, match=${inTimeWindow}`, 'DEBUG');
      } else {
        // Overnight case: 22:00 - 02:00
        inTimeWindow = currentTime >= startTime || currentTime < endTime;
        log(`  Overnight schedule: current=${currentTime}, start=${startTime}, end=${endTime}, match=${inTimeWindow}`, 'DEBUG');
      }
      
      if (!inTimeWindow) {
        log(`  Not in time window, skipping`, 'DEBUG');
        continue;
      }
      
      // Check schedule type
      let matchesSchedule = false;
      
      if (schedule.schedule_type === 'daily') {
        matchesSchedule = true;
        log(`  Daily schedule - MATCHES`, 'INFO');
        
      } else if (schedule.schedule_type === 'weekly') {
        // days_of_week is comma-separated: "1,3,5" for Sun,Tue,Thu
        const activeDays = schedule.days_of_week?.split(',').map(Number) || [];
        matchesSchedule = activeDays.includes(currentDayOfWeek);
        log(`  Weekly schedule - Active days: [${activeDays.join(',')}], Current: ${currentDayOfWeek}, Match: ${matchesSchedule}`, 'INFO');
        
      } else if (schedule.schedule_type === 'specific_date') {
        matchesSchedule = schedule.specific_date === currentDate;
        log(`  Specific date - Target: ${schedule.specific_date}, Current: ${currentDate}, Match: ${matchesSchedule}`, 'INFO');
      } else {
        log(`  Unknown schedule type: ${schedule.schedule_type}`, 'WARN');
      }
      
      if (matchesSchedule) {
        log(`✅ MATCH FOUND: "${schedule.schedule_name}" (${schedule.schedule_type})`, 'INFO');
        log(`Summary: Checked ${activeSchedulesChecked} active schedules, skipped ${inactiveSchedulesSkipped} inactive`, 'INFO');
        return true;
      }
      
    } catch (err) {
      log(`Error processing schedule "${schedule.schedule_name}": ${err.message}`, 'ERROR');
      continue;
    }
  }
  
  log(`No matching schedules. Checked ${activeSchedulesChecked} active, skipped ${inactiveSchedulesSkipped} inactive`, 'INFO');
  return false;
}

// Get service status with detailed error info
async function getServiceStatus(serviceName) {
  try {
    const status = await execCmd(`systemctl is-active ${serviceName}`);
    return status;
  } catch (err) {
    // If command fails, service is likely inactive or failed
    try {
      const failedStatus = await execCmd(`systemctl is-failed ${serviceName}`);
      return failedStatus === 'failed' ? 'failed' : 'inactive';
    } catch {
      return 'inactive';
    }
  }
}

// Wait for service to actually start
async function waitForServiceStart(serviceName, maxWaitSeconds = 10) {
  log(`Waiting for ${serviceName} to start (max ${maxWaitSeconds}s)...`, 'INFO');
  
  for (let i = 0; i < maxWaitSeconds; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const status = await getServiceStatus(serviceName);
    
    if (status === 'active') {
      log(`${serviceName} is now active (took ${i + 1}s)`, 'INFO');
      return true;
    } else if (status === 'failed') {
      log(`${serviceName} failed to start`, 'ERROR');
      return false;
    }
    
    log(`Waiting... (${i + 1}/${maxWaitSeconds})`, 'DEBUG');
  }
  
  log(`Timeout waiting for ${serviceName} to start`, 'WARN');
  return false;
}

// Main execution function
async function main() {
  try {
    rotateLogIfNeeded();
    
    log('='.repeat(80), 'INFO');
    log('Schedule Runner Started', 'INFO');
    log(`Running from: ${SCRIPT_DIR}`, 'INFO');
    log(`Config file: ${CONFIG_PATH}`, 'INFO');
    log('='.repeat(80), 'INFO');
    
    // Check if manual mode is active
    if (!shouldRunScheduleCheck()) {
      log('Manual mode is active - exiting without checking schedules', 'INFO');
      log('Kiosk will remain in its current state until AUTO mode is restored', 'INFO');
      log('='.repeat(80), 'INFO');
      return; // Exit early, don't check schedules or control kiosk
    }
    
    log('🤖 AUTO MODE - Proceeding with schedule check', 'INFO');
    
    // Check if kiosk should run
    const shouldRun = shouldKioskRunNow();
    
    // Check current kiosk service state
    let isActive = await getServiceStatus('kiosk.service');
    
    log(`Decision: shouldRun=${shouldRun}, currentState=${isActive}`, 'INFO');
    
    // Take action based on state
    if (shouldRun && isActive !== 'active') {
      log('ACTION: Starting kiosk service...', 'INFO');
      
      try {
        await execCmd('sudo systemctl start kiosk.service');
        log('Start command sent', 'INFO');
        
        // Wait and verify it started
        const startedSuccessfully = await waitForServiceStart('kiosk.service', 10);
        
        if (startedSuccessfully) {
          log('✅ Kiosk service started successfully', 'INFO');
          
          // Get and log service details
          try {
            const statusOutput = await execCmd('systemctl status kiosk.service --no-pager -l');
            log('Service status details:', 'DEBUG');
            log(statusOutput, 'DEBUG');
          } catch (err) {
            log(`Could not get service status details: ${err}`, 'DEBUG');
          }
        } else {
          log('❌ Kiosk service failed to start properly', 'ERROR');
          
          // Try to get error details from journalctl
          try {
            const logs = await execCmd('sudo journalctl -u kiosk.service -n 20 --no-pager');
            log('Recent kiosk service logs:', 'ERROR');
            log(logs, 'ERROR');
          } catch (err) {
            log(`Could not retrieve service logs: ${err}`, 'ERROR');
          }
        }
      } catch (err) {
        log(`Failed to start kiosk service: ${err}`, 'ERROR');
      }
      
    } else if (!shouldRun && isActive === 'active') {
      log('ACTION: Stopping kiosk service...', 'INFO');
      
      try {
        await execCmd('sudo systemctl stop kiosk.service');
        log('Stop command sent', 'INFO');
        
        // Wait and verify it stopped
        await new Promise(resolve => setTimeout(resolve, 2000));
        const newState = await getServiceStatus('kiosk.service');
        
        if (newState === 'inactive') {
          log('✅ Kiosk service stopped successfully', 'INFO');
        } else {
          log(`⚠️  Kiosk service state after stop: ${newState}`, 'WARN');
        }
      } catch (err) {
        log(`Failed to stop kiosk service: ${err}`, 'ERROR');
      }
      
    } else {
      log('ℹ️  No action needed (already in desired state)', 'INFO');
      
      if (shouldRun && isActive === 'active') {
        log('Kiosk is running as expected', 'INFO');
      } else {
        log('Kiosk is not running, and no schedules are active', 'INFO');
      }
    }
    
    log('='.repeat(80), 'INFO');
    log('Schedule Runner Complete', 'INFO');
    log('='.repeat(80), 'INFO');
    log('', 'INFO'); // Empty line for readability
    
  } catch (err) {
    log(`Critical Error: ${err.message}`, 'ERROR');
    log(`Stack trace: ${err.stack}`, 'ERROR');
  } finally {
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { shouldKioskRunNow, loadSchedules };