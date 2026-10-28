#!/bin/bash
set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No color

echo "=================================================="
echo "  Complete Kiosk System Setup"
echo "  Schedule System + Gateway with Offline Page"
echo "=================================================="
echo ""

# ==================== AUTO-DETECT PATHS ====================

CURRENT_USER=$(whoami)
HOME_DIR="$HOME"

echo -e "${YELLOW}Current user:${NC} $CURRENT_USER"
echo -e "${YELLOW}Home directory:${NC} $HOME_DIR"
echo ""

# Detect script directory (where this script is located - /backend/config)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Script location: $SCRIPT_DIR"
echo ""

BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="$(dirname "$BACKEND_DIR")"

echo "🔍 Auto-detected paths from script location..."
echo "   Script directory: $SCRIPT_DIR"
echo "   Backend directory: $BACKEND_DIR"
echo "   Project directory: $PROJECT_DIR"
echo ""

# Verify directories exist
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}Error: Project directory not found: $PROJECT_DIR${NC}"
    exit 1
fi

if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}Error: Backend directory not found: $BACKEND_DIR${NC}"
    exit 1
fi

# Verify we have the right backend by checking for key files
if [ ! -f "$BACKEND_DIR/db.js" ] || [ ! -f "$BACKEND_DIR/adminRoutes.js" ]; then
    echo -e "${RED}Error: Backend directory doesn't contain expected files${NC}"
    echo "Expected to find db.js and adminRoutes.js in: $BACKEND_DIR"
    exit 1
fi

FRONTEND_DIR="$PROJECT_DIR/frontend"
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}Error: Frontend directory not found: $FRONTEND_DIR${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Project directory confirmed: $PROJECT_DIR${NC}"
echo -e "${GREEN}✓ Backend directory confirmed: $BACKEND_DIR${NC}"
echo -e "${GREEN}✓ Frontend directory confirmed: $FRONTEND_DIR${NC}"
echo ""

# Find Node.js path
NODE_PATH=$(which node)
if [ -z "$NODE_PATH" ]; then
    echo -e "${RED}Error: Node.js not found. Please install Node.js first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js found: $NODE_PATH${NC}"
echo ""

# Function to print section headers
print_section() {
    echo ""
    echo "=================================================="
    echo "  $1"
    echo "=================================================="
    echo ""
}

# Confirm with user
print_section "Configuration Summary"

echo "User: $CURRENT_USER"
echo "Project Directory: $PROJECT_DIR"
echo "Backend Directory: $BACKEND_DIR"
echo "Frontend Directory: $FRONTEND_DIR"
echo "Script Directory: $SCRIPT_DIR"
echo "Node.js: $NODE_PATH"
echo ""
echo -e "${BLUE}IMPORTANT:${NC} This script expects server files to already be in:"
echo "  $BACKEND_DIR"
echo ""
echo "The following files should already exist:"
echo "  ✓ $BACKEND_DIR/gatewayServer.js"
echo "  ✓ $BACKEND_DIR/kioskServer.js"
echo "  ✓ $BACKEND_DIR/adminServer.js"
echo "  ✓ $BACKEND_DIR/scheduleRunner.js"
echo ""
echo "This script will:"
echo "  ✅ Install npm packages (http-proxy-middleware)"
echo "  ✅ Create systemd service files"
echo "  ✅ Set up cron job for schedule runner"
echo "  ✅ Create offline page"
echo "  ✅ Configure sudo permissions"
echo "  ✅ Start gateway and admin services"
echo ""
read -p "Continue with installation? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 1
fi

# Verify required files exist
print_section "Verifying Required Files"

MISSING_FILES=()

if [ ! -f "$BACKEND_DIR/gatewayServer.js" ]; then
    MISSING_FILES+=("gatewayServer.js")
fi

if [ ! -f "$BACKEND_DIR/kioskServer.js" ]; then
    MISSING_FILES+=("kioskServer.js")
fi

if [ ! -f "$BACKEND_DIR/adminServer.js" ]; then
    MISSING_FILES+=("adminServer.js")
fi

if [ ! -f "$BACKEND_DIR/scheduleRunner.js" ]; then
    MISSING_FILES+=("scheduleRunner.js")
fi

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    echo -e "${RED}Error: Missing required files in $BACKEND_DIR:${NC}"
    for file in "${MISSING_FILES[@]}"; do
        echo "  ✗ $file"
    done
    echo ""
    echo "Please make sure these files are in the backend directory before running this script."
    exit 1
fi

echo -e "${GREEN}✓ All required server files found${NC}"

# Step 1: Install npm packages
print_section "Step 1: Installing npm packages"

cd "$BACKEND_DIR"

echo "Installing http-proxy-middleware..."
if npm install http-proxy-middleware; then
    echo -e "${GREEN}✓ Package installed successfully${NC}"
else
    echo -e "${RED}✗ Failed to install package${NC}"
    exit 1
fi

# Step 2: Stop existing services
print_section "Step 2: Stopping existing services (if any)"

sudo systemctl stop gateway.service 2>/dev/null || echo "gateway.service not running"
sudo systemctl stop kiosk.service 2>/dev/null || echo "kiosk.service not running"
sudo systemctl stop admin.service 2>/dev/null || echo "admin.service not running"

echo -e "${GREEN}✓ Services stopped${NC}"

# Step 3: Create offline page
print_section "Step 3: Creating offline page"

OFFLINE_DIR="$FRONTEND_DIR/offline"
mkdir -p "$OFFLINE_DIR"
echo -e "${GREEN}✓ Created offline directory${NC}"

# Check if offline.html exists in script directory first
if [ -f "$SCRIPT_DIR/offline.html" ]; then
    cp "$SCRIPT_DIR/offline.html" "$OFFLINE_DIR/"
    echo -e "${GREEN}✓ Copied offline.html from config directory${NC}"
elif [ -f "$BACKEND_DIR/offline.html" ]; then
    cp "$BACKEND_DIR/offline.html" "$OFFLINE_DIR/"
    echo -e "${GREEN}✓ Copied offline.html from backend directory${NC}"
else
    echo -e "${YELLOW}⚠️ offline.html not found, creating default${NC}"
    
    cat > "$OFFLINE_DIR/offline.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Server Offline</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #000000;
            color: #ffffff;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            overflow: hidden;
        }

        .offline-container {
            text-align: center;
            padding: 40px;
            max-width: 600px;
        }

        .offline-title {
            font-size: 48px;
            font-weight: 600;
            margin-bottom: 20px;
            letter-spacing: -0.5px;
        }

        .offline-subtitle {
            font-size: 24px;
            font-weight: 400;
            margin-bottom: 30px;
            color: #cccccc;
        }

        .offline-message {
            font-size: 16px;
            color: #999999;
            line-height: 1.6;
        }

        @media (max-width: 768px) {
            .offline-title {
                font-size: 36px;
            }

            .offline-subtitle {
                font-size: 20px;
            }

            .offline-message {
                font-size: 14px;
            }
        }
    </style>
</head>
<body>
    <div class="offline-container">
        <h1 class="offline-title">Server Offline</h1>
        <p class="offline-subtitle">Reconnecting...</p>
        <p class="offline-message">This page will refresh automatically when the server is back.</p>
    </div>

    <script>
        const CHECK_INTERVAL = 5000; // 5 seconds

        async function checkServerStatus() {
            try {
                const response = await fetch('/api/status', {
                    method: 'GET',
                    cache: 'no-cache'
                });
                
                const data = await response.json();
                
                if (data.online) {
                    console.log('Server is back online! Reloading...');
                    window.location.reload();
                }
            } catch (error) {
                console.log('Server still offline, checking again in 5 seconds...');
            }
        }

        checkServerStatus();
        setInterval(checkServerStatus, CHECK_INTERVAL);

        console.log('Waiting for server to come back online...');
        console.log('This page will automatically refresh when the scheduled time begins.');
    </script>
</body>
</html>
EOF
    echo -e "${GREEN}✓ Created default offline.html${NC}"
fi

echo "Offline page location: $OFFLINE_DIR/offline.html"

# Step 4: Create systemd service files
print_section "Step 4: Creating systemd service files"

# Gateway service
cat > /tmp/gateway.service << EOF
[Unit]
Description=Kiosk Gateway Server (Always Running)
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$BACKEND_DIR
ExecStart=$NODE_PATH $BACKEND_DIR/gatewayServer.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=gateway

[Install]
WantedBy=multi-user.target
EOF

sudo cp /tmp/gateway.service /etc/systemd/system/
rm /tmp/gateway.service
echo -e "${GREEN}✓ Created gateway.service${NC}"

# Admin service
cat > /tmp/admin.service << EOF
[Unit]
Description=Kiosk Admin Server (Always Running)
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$BACKEND_DIR
ExecStart=$NODE_PATH $BACKEND_DIR/adminServer.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=admin

[Install]
WantedBy=multi-user.target
EOF

sudo cp /tmp/admin.service /etc/systemd/system/
rm /tmp/admin.service
echo -e "${GREEN}✓ Created admin.service${NC}"

# Kiosk service (schedule-controlled)
cat > /tmp/kiosk.service << EOF
[Unit]
Description=Kiosk Server (Schedule-Controlled)
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$BACKEND_DIR
ExecStart=$NODE_PATH $BACKEND_DIR/kioskServer.js
Restart=no
StandardOutput=journal
StandardError=journal
SyslogIdentifier=kiosk

[Install]
WantedBy=multi-user.target
EOF

sudo cp /tmp/kiosk.service /etc/systemd/system/
rm /tmp/kiosk.service
echo -e "${GREEN}✓ Created kiosk.service${NC}"

# Step 5: Configure sudo permissions
print_section "Step 5: Configuring sudo permissions"

SUDOERS_FILE="/etc/sudoers.d/kiosk-schedule"

cat > /tmp/kiosk-sudoers << EOF
# Allow $CURRENT_USER to start/stop kiosk service without password
$CURRENT_USER ALL=(ALL) NOPASSWD: /bin/systemctl start kiosk.service
$CURRENT_USER ALL=(ALL) NOPASSWD: /bin/systemctl stop kiosk.service
$CURRENT_USER ALL=(ALL) NOPASSWD: /bin/systemctl restart kiosk.service
$CURRENT_USER ALL=(ALL) NOPASSWD: /bin/systemctl status kiosk.service
$CURRENT_USER ALL=(ALL) NOPASSWD: /bin/systemctl is-active kiosk.service
$CURRENT_USER ALL=(ALL) NOPASSWD: /bin/systemctl is-failed kiosk.service
$CURRENT_USER ALL=(ALL) NOPASSWD: /bin/journalctl -u kiosk.service *
EOF

sudo cp /tmp/kiosk-sudoers $SUDOERS_FILE
sudo chmod 0440 $SUDOERS_FILE
sudo chown root:root $SUDOERS_FILE
rm /tmp/kiosk-sudoers

sudo visudo -c -f $SUDOERS_FILE

echo -e "${GREEN}✓ Sudo permissions configured${NC}"

# Step 6: Set up cron job
print_section "Step 6: Setting up cron job"

# Remove any existing scheduleRunner cron jobs
crontab -l 2>/dev/null | grep -v "scheduleRunner.js" | crontab - 2>/dev/null || true

# Add new cron job - runs every minute
CRON_CMD="* * * * * $NODE_PATH $BACKEND_DIR/scheduleRunner.js >> $HOME_DIR/schedule-runner.log 2>&1"
(crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -

echo "Cron job added:"
crontab -l | grep "scheduleRunner.js"

echo -e "${GREEN}✓ Cron job installed${NC}"

# Step 7: Create log files
print_section "Step 7: Creating log files"

LOG_FILE="$HOME_DIR/schedule-runner.log"
touch "$LOG_FILE"
chmod 644 "$LOG_FILE"

echo "Log file created: $LOG_FILE"
echo -e "${GREEN}✓ Log files created${NC}"

# Step 8: Reload systemd and enable services
print_section "Step 8: Configuring systemd"

sudo systemctl daemon-reload
echo "✓ Daemon reloaded"

sudo systemctl enable gateway.service
echo "✓ Gateway service enabled (will start on boot)"

sudo systemctl enable admin.service
echo "✓ Admin service enabled (will start on boot)"

sudo systemctl disable kiosk.service 2>/dev/null || true
echo "✓ Kiosk service disabled (controlled by schedule)"

# Step 9: Create/verify schedules file
print_section "Step 9: Setting up schedules file"

SCHEDULES_FILE="$BACKEND_DIR/kiosk-schedules.json"

if [ ! -f "$SCHEDULES_FILE" ]; then
    echo "Creating empty schedules file..."
    cat > "$SCHEDULES_FILE" << EOF
{
  "schedules": [],
  "last_updated": "$(date -Iseconds)"
}
EOF
    chmod 644 "$SCHEDULES_FILE"
    echo -e "${GREEN}✓ Schedules file created${NC}"
else
    echo -e "${GREEN}✓ Schedules file already exists${NC}"
fi

# Step 10: Start services
print_section "Step 10: Starting services"

echo "Starting gateway service..."
sudo systemctl start gateway.service
sleep 2

echo "Starting admin service..."
sudo systemctl start admin.service
sleep 2

# Step 11: Test schedule runner
print_section "Step 11: Testing schedule runner"

if [ -f "$BACKEND_DIR/scheduleRunner.js" ]; then
    echo "Running schedule runner once to verify..."
    echo ""
    $NODE_PATH "$BACKEND_DIR/scheduleRunner.js"
    
    echo ""
    if [ -f "$LOG_FILE" ]; then
        echo "Schedule runner log (last 10 lines):"
        tail -n 10 "$LOG_FILE"
    fi
    echo ""
    echo -e "${GREEN}✓ Schedule runner test complete${NC}"
else
    echo -e "${RED}✗ scheduleRunner.js not found in $BACKEND_DIR${NC}"
    exit 1
fi

# Step 12: Verification
print_section "Step 12: Verification"

echo "Checking service status..."
echo ""

if systemctl is-active --quiet gateway.service; then
    echo -e "${GREEN}✓ Gateway service is running${NC}"
else
    echo -e "${RED}✗ Gateway service is not running${NC}"
    echo "Check logs: sudo journalctl -u gateway.service -n 50"
fi

if systemctl is-active --quiet admin.service; then
    echo -e "${GREEN}✓ Admin service is running${NC}"
else
    echo -e "${RED}✗ Admin service is not running${NC}"
    echo "Check logs: sudo journalctl -u admin.service -n 50"
fi

KIOSK_STATUS=$(systemctl is-active kiosk.service 2>/dev/null || echo "inactive")
if [ "$KIOSK_STATUS" = "active" ]; then
    echo -e "${YELLOW}⚠️ Kiosk service is running (will be controlled by schedule)${NC}"
else
    echo -e "${GREEN}✓ Kiosk service is inactive (as expected)${NC}"
fi

echo ""
echo "Checking ports..."
if netstat -tuln 2>/dev/null | grep -q ":3001 "; then
    echo -e "${GREEN}✓ Port 3001 (Gateway) is listening${NC}"
else
    echo -e "${YELLOW}⚠️ Port 3001 not listening yet (wait a moment)${NC}"
fi

if netstat -tuln 2>/dev/null | grep -q ":3002 "; then
    echo -e "${GREEN}✓ Port 3002 (Admin) is listening${NC}"
else
    echo -e "${YELLOW}⚠️ Port 3002 not listening yet (wait a moment)${NC}"
fi

# Get IP address
IP=$(hostname -I | awk '{print $1}')

# Step 13: Save configuration
print_section "Step 13: Saving configuration"

CONFIG_FILE="$HOME_DIR/complete-kiosk-config.txt"

cat > "$CONFIG_FILE" << EOF
Complete Kiosk System Configuration
Generated: $(date)

User: $CURRENT_USER
Project: $PROJECT_DIR
Backend: $BACKEND_DIR
Frontend: $FRONTEND_DIR
Script Directory: $SCRIPT_DIR
Node: $NODE_PATH

Offline Page: $OFFLINE_DIR/offline.html
Schedules: $SCHEDULES_FILE
Log: $LOG_FILE

IP: $IP
Gateway (Users): https://$IP:3001
Admin: https://$IP:3002/admin
Kiosk (Internal): http://localhost:3003

Services:
- gateway.service (always running on port 3001)
- admin.service (always running on port 3002)
- kiosk.service (schedule-controlled on port 3003)

Cron Job: $CRON_CMD
EOF

echo "Configuration saved to: $CONFIG_FILE"
echo -e "${GREEN}✓ Configuration saved${NC}"

# Final summary
print_section "Installation Complete! 🎉"

echo -e "${GREEN}✅ Gateway server configured and running${NC}"
echo -e "${GREEN}✅ Admin server configured and running${NC}"
echo -e "${GREEN}✅ Kiosk server configured for schedule control${NC}"
echo -e "${GREEN}✅ Offline page created${NC}"
echo -e "${GREEN}✅ Schedule system configured${NC}"
echo -e "${GREEN}✅ All services configured${NC}"
echo ""

echo "=================================================="
echo "  Access Your System"
echo "=================================================="
echo ""
echo -e "${BLUE}Users Access:${NC}    https://$IP:3001"
echo -e "${BLUE}Admin Panel:${NC}     https://$IP:3002/admin"
echo ""
echo "When NO schedule is active → Users see 'Server Offline' page"
echo "When schedule IS active    → Users see feedback form"
echo "Page auto-refreshes every 5 seconds"
echo ""

echo "=================================================="
echo "  Next Steps - Testing"
echo "=================================================="
echo ""
echo "1. Open browser: https://$IP:3001"
echo "   → Should see 'Server Offline' page"
echo ""
echo "2. Open admin panel: https://$IP:3002/admin"
echo "   → Log in"
echo "   → Go to Schedules tab"
echo "   → Create a schedule that starts NOW"
echo ""
echo "3. Wait 1 minute"
echo "   → Page should auto-refresh"
echo "   → Should now show feedback form"
echo ""
echo "4. Wait for schedule to end"
echo "   → Should show offline page again"
echo ""

echo "=================================================="
echo "  Useful Commands"
echo "=================================================="
echo ""
echo "View logs:"
echo "  tail -f $LOG_FILE"
echo "  sudo journalctl -u gateway.service -f"
echo "  sudo journalctl -u admin.service -f"
echo "  sudo journalctl -u kiosk.service -f"
echo ""
echo "Check status:"
echo "  systemctl status gateway.service"
echo "  systemctl status admin.service"
echo "  systemctl status kiosk.service"
echo ""
echo "View configuration:"
echo "  cat $CONFIG_FILE"
echo ""

echo "=================================================="
echo "  System Architecture"
echo "=================================================="
echo ""
echo "Port 3001 (Gateway)  → Always running"
echo "  ├─ No schedule → Shows offline page"
echo "  └─ Schedule active → Proxies to port 3003"
echo ""
echo "Port 3002 (Admin)    → Always running"
echo ""
echo "Port 3003 (Kiosk)    → Starts/stops with schedule"
echo "                        (Controlled by cron every minute)"
echo ""

echo "=================================================="
echo ""
echo -e "${GREEN}Installation complete!${NC}"
echo "Your complete kiosk system with schedule control and offline page is ready!"
echo ""
