// ============================================================
// SERVER.JS - TABLE OF CONTENTS
// ============================================================
// 
// 1. IMPORTS & INITIALIZATION
//    require('dotenv').config()        - Load environment variables (DONE BY PRETI)
//    const express                     - Express framework (DONE BY PRETI)
//    const https                       - HTTPS module (DONE BY PRETI)
//    const fs                          - File system module (DONE BY PRETI)
//    const path                        - Path module (DONE BY PRETI)
//    const session                     - Session management (DONE BY PRETI)
//    const db                          - Database connection (DONE BY PRETI)
//    const feedbackRoutes              - Feedback API routes 
//    const adminRoutes                 - Admin API routes (DONE BY PRETI)
//    const dataExportRoutes            - Data export routes (DONE BY PRETI)
//    const os                          - OS utilities (DONE BY PRETI)
//    const emailService                - Email service
//    const { router: treeRoutes, setDatabase: setTreeDatabase } - Tree routes with DB setter
//    const dataRetentionCleanup        - Cleanup module (DONE BY PRETI)
//    const QRCode                      - QR code generation (DONE BY PRETI)
//    const app = express()             - Express app instance (DONE BY PRETI)
//    const PORT = 3000                 - Server port (DONE BY PRETI)
//
// 2. NETWORK INTERFACE FUNCTIONS
//    function getAllNetworkIPs()       - Get all available network IPs (DONE BY PRETI)
//    function getSelectedIP()          - Get selected IP with priority logic (DONE BY PRETI)
//    function getInterfaceForIP()      - Get interface name for IP address (DONE BY PRETI)
//    const localIP                     - Selected IP address (DONE BY PRETI)
//    const interfaceName               - Interface name for selected IP (DONE BY PRETI)
//
// 3. SSL CERTIFICATE CONFIGURATION
//    const certsDir                    - SSL certificates directory (DONE BY PRETI)
//    const certPath                    - Certificate file path (DONE BY PRETI)
//    const keyPath                     - Key file path (DONE BY PRETI)
//    let sslOptions                    - SSL options storage (DONE BY PRETI)
//
// 4. MIDDLEWARE CONFIGURATION
//    app.use(express.json())           - JSON body parser (DONE BY PRETI)
//    app.use(express.urlencoded())     - URL-encoded body parser (DONE BY PRETI)
//    app.use(session())                - Session middleware (DONE BY PRETI)
//    app.use(express.static())         - Static file serving (DONE BY PRETI)
//    setTreeDatabase(db)               - Wire shared DB into tree routes
//
// 5. API ROUTES
//    app.use('/api/feedback', feedbackRoutes) - Feedback API routes (DONE BY PRETI)
//    app.use('/api/admin', adminRoutes) - Admin API routes (DONE BY PRETI)
//    app.use('/api/admin/data-export', dataExportRoutes) - Data export routes (DONE BY PRETI)
//    app.use('/api/tree', treeRoutes)  - Tree API routes
//    app.get('/api/network-interfaces') - Get all network interfaces (DONE BY PRETI)
//    app.get('/api/server-info')       - Get server info (IP, protocol, QR) (DONE BY PRETI)
//    app.get('/api/generate-qr')       - Generate QR code endpoint (DONE BY PRETI)
//    app.get('/api/test-db')           - Test database connection (DONE BY PRETI)
//    app.get('/api/test-email-service') - Test email service
//
// 6. PAGE ROUTES
//    app.get('/feedback')              - Serve feedback page 
//    app.get('/admin')                 - Serve admin page (DONE BY PRETI)
//    app.get('/tree')                  - Serve tree page
//    app.get('/')                      - Default redirect to feedback 
//
// 7. CERTIFICATE & SERVER FUNCTIONS
//    function generateSelfSignedCertificate() - Generate self-signed certificate (DONE BY PRETI)
//    function startServer()            - Start HTTP/HTTPS server (DONE BY PRETI)
//    function printServerInfo()        - Print server startup information (DONE BY PRETI)
// 
// 8. SERVER STARTUP & INITIALIZATION
//    Email service initialization      - Initialize email service 
//    Help command check                - Display help if --help flag present (DONE BY PRETI)
//    startServer()                     - Start the server (DONE BY PRETI)
//
// server.js - Main server file with HTTPS and IP detection

/* ============================================================
TABLE OF CONTENTS FEEDBACK.CSS
============================================================

LANDING PAGE STYLES
  - Right section and QR panel (DONE BY PRETI)

QR CODE SECTION
  - QR header and icon (DONE BY PRETI)
  - QR code frame and image (DONE BY PRETI)
  - QR description text (DONE BY PRETI)

DATA RETENTION CONSENT PAGE
  - Consent card and header (DONE BY PRETI)
  - Retention options grid (DONE BY PRETI)
  - Privacy notice (DONE BY PRETI)

CHOOSE STYLE PAGE
  - Style card layout (DONE BY PRETI)
  - Theme preview frame (DONE BY PRETI)
  - Theme grid and selection state (DONE BY PRETI)
  - Selected theme display (DONE BY PRETI)

BUTTON COMPONENTS
  - Consent button (with disabled state) (DONE BY PRETI)

DEVICE DETECTION & OVERLAY STYLES
  - Desktop vs mobile preview sizing (DONE BY PRETI)
  - Overlay container and layering (DONE BY PRETI)
  - Unified preview background (DONE BY PRETI)

============================================================ */

FEEDBACK.HTML

<!-- (DONE BY PRETI) -->
<button>🏆 View Leaderboards</button>
                                
<!-- Dynamic QR code will be inserted here (DONE BY PRETI)-->
<!-- Fallback static QR (same as your original) (DONE BY PRETI)-->
<!-- Data Retention Consent Page (DONE BY PRETI)-->
<!-- ALL QUESTIONS COME FROM DATABASE (DONE BY PRETI)-->
<!-- Questions will be dynamically loaded here (DONE BY PRETI)-->
<!-- Choose Style Page (DONE BY PRETI)-->
<!-- Overlay options will be dynamically loaded here (DONE BY PRETI)-->

// ============================================================
// FEEDBACK.JS - TABLE OF CONTENTS
// ============================================================
// 
// 1. GLOBAL VARIABLES & CONSTANTS
//    let selectedRetention            - Selected retention option (DONE BY PRETI)
//    let selectedTheme                - Currently selected overlay theme (DONE BY PRETI)
//    let userData                     - Object storing user input and answers (DONE BY PRETI)
//    let photoData                    - Base64 encoded photo data (DONE BY PRETI)
//    let currentDevice                - 'desktop' or 'mobile' device type (DONE BY PRETI)
//    let inactivityTimer              - Timer for inactivity timeout (DONE BY PRETI)
//    const INACTIVITY_TIMEOUT         - 5 minutes timeout duration (DONE BY PRETI)
//
// 2. INITIALIZATION & SETUP FUNCTIONS
//    async function loadDynamicQRCode() - Load dynamic QR code from server (DONE BY PRETI)
//    function detectDeviceType()      - Detect mobile/desktop device (DONE BY PRETI)

//
// 3. INACTIVITY TIMER FUNCTIONS
//    function startInactivityTimer()  - Start 5-minute countdown (DONE BY PRETI)
//    function resetInactivityTimer()  - Reset on user interaction (DONE BY PRETI)
//    function returnToLandingPage()   - Return to start when timeout (DONE BY PRETI)
//    function showTimeoutNotification() - Show timeout message (DONE BY PRETI)
//
// 4. QUESTION MANAGEMENT FUNCTIONS
//    async function loadFeedbackQuestions() - Load questions from database (DONE BY PRETI)
//    function updateFeedbackForm()    - Update form with questions (DONE BY PRETI)
//    function createQuestionElement() - Create question UI (DONE BY PRETI)
//    function selectQuestionRating()  - Handle star rating (DONE BY PRETI)
//    function initializeQuestionEventListeners() - Setup question events (DONE BY PRETI)
//    function showNoQuestionsMessage() - Show message if no questions (DONE BY PRETI)
//    function getQuestionType()       - Determine question type (DONE BY PRETI)
//    function validateRequiredQuestions() - Validate required answers (DONE BY PRETI)
// 
// 5. FORM SUBMISSION FUNCTIONS
//    function submitFeedback()        - Submit feedback form (DONE BY PRETI)
//
// 6. PHOTO HANDLING FUNCTIONS
//    function continueToStyle()       - Go to style page after photo (DONE BY PRETI)
//    function saveOriginalPhoto()     - Save original to server (DONE BY PRETI)
//    function saveProcessedPhoto()    - Save processed photo to server (DONE BY PRETI)
//
// 7. OVERLAY & THEME FUNCTIONS
//    async function loadOverlayOptions() - Load overlays from database (DONE BY PRETI)
//    function loadDefaultOverlayOptions() - Fallback default overlays (DONE BY PRETI)
//    function generateColorFromThemeId() - Generate consistent colors (DONE BY PRETI)
//    function selectTheme()           - Select theme and update preview (DONE BY PRETI)
//    function updateThemePreview()    - Update theme preview image (DONE BY PRETI)
//    function updatePreviewWithCutout() - Update preview with positioning (DONE BY PRETI)
//    function processFinalPhoto()     - Process final photo with overlay (DONE BY PRETI)
//
// 8. PAGE NAVIGATION FUNCTIONS
//    function selectOption()          - Select retention option (DONE BY PRETI)
//    function retakePhotoFromStyle()  - Retake photo from style page (DONE BY PRETI)
//    function confirmStyle()          - Confirm and go to confirmation (DONE BY PRETI)
//    function finalSubmit()           - Final submission with saving (DONE BY PRETI)
//
// 9. BACK NAVIGATION FUNCTIONS
//    function goBackToLanding()       - Consent to Landing (DONE BY PRETI)
//    function goBackToPhoto()         - Style to Photo/Upload (DONE BY PRETI)
//
// 10. EVENT LISTENERS & CLEANUP
//     window.addEventListener('beforeunload') - Clean up camera and timers (DONE BY PRETI)
//     document.addEventListener('click') - Reset inactivity timer (DONE BY PRETI)
//     document.addEventListener('keypress') - Reset inactivity timer (DONE BY PRETI)
//     document.addEventListener('mousemove') - Reset inactivity timer (DONE BY PRETI)
//     document.addEventListener('touchstart') - Reset inactivity timer (DONE BY PRETI)
//
// 11. LEADERBOARD NAVIGATION
//     function viewLeaderboard()       - Navigate to leaderboard page (DONE BY PRETI)

// ============================================================
// FEEDBACKROUTES.JS - TABLE OF CONTENTS 
// ============================================================
// 
// 1. DIRECTORY SETUP
//    const uploadsDir                 - Upload directory for photos (DONE BY PRETI)
//    const processedDir               - Directory for processed photos (DONE BY PRETI)
//
// 2. QUESTION MANAGEMENT ROUTES
//    router.get('/questions'          - Get active questions for feedback form (DONE BY PRETI)
//
// 3. PHOTO UPLOAD ROUTES
//    router.post('/save-photo'        - Upload and save raw photo (DONE BY PRETI)
//    router.post('/save-processed-photo' - Save processed photo with overlay (DONE BY PRETI)
//
// 4. FEEDBACK SUBMISSION ROUTES
//    router.post('/submit-feedback'   - Submit complete feedback with retention and email (DONE BY PRETI)
//
// 5. DATABASE OPERATIONS
//    function isValidEmail()          - Validate email format (DONE BY PRETI)
//    function saveFeedbackToDatabase() - Save feedback to database with encrypted email (DONE BY PRETI)
//    function saveFeedbackRecord()    - Save feedback record (nested) (DONE BY PRETI)
//    function saveQuestionAnswers()   - Save question answers (nested) (DONE BY PRETI)
//
// 6. UTILITY ENDPOINTS
//    router.get('/test-db'            - Test database connection endpoint (DONE BY PRETI)
//    router.get('/'                   - Root endpoint for feedback routes (DONE BY PRETI)


/* admin.css - Admin Panel Styles */

/* ============================================================
TABLE OF CONTENTS admin.css
============================================================

GENERAL RESET & BASE STYLES
  - Box sizing and global reset (DONE BY PRETI)
  - Body and typography base styles (DONE BY PRETI)

CSS CUSTOM PROPERTIES (THEME VARIABLES) 
  - Global theme color variables (DONE BY PRETI)
  - Semantic color definitions (DONE BY PRETI)
  - Gradient definitions (DONE BY PRETI)

LOGIN PAGE STYLES
  - Login container, card and background (DONE BY PRETI)
  - Login form elements and buttons (DONE BY PRETI)
  - Test accounts display (DONE BY PRETI)

ADMIN HEADER & LAYOUT
  - Header container and branding (DONE BY PRETI)
  - User info and logout functionality (DONE BY PRETI)
  - Main content area structure (DONE BY PRETI)

SIDEBAR NAVIGATION
  - Sidebar container and sections (DONE BY PRETI)
  - Navigation items and active states (DONE BY PRETI)

PAGE CONTENT AREA
  - Page container and active state (DONE BY PRETI)
  - Page header styling (DONE BY PRETI)

DASHBOARD PAGE STYLES
  - Stats cards grid and variations (DONE BY PRETI)
  - Activity and status sections (DONE BY PRETI)
  - Section headers and refresh button (DONE BY PRETI)

FEEDBACK & ARCHIVE DATA PAGE STYLES
  - Toolbar with search and filters (DONE BY PRETI)
  - Advanced filter panel with animations (DONE BY PRETI)
  - Sortable table headers and results display (DONE BY PRETI)

DIGITAL TREE PAGE STYLES
  - Tree section and info display (DONE BY PRETI)

OVERLAY MANAGEMENT PAGE STYLES
  - Overlay cards grid and preview (DONE BY PRETI)
  - Add overlay modal form (DONE BY PRETI)

QUESTION MANAGEMENT PAGE STYLES
  - Question cards and metadata (DONE BY PRETI)
  - Question options and actions (DONE BY PRETI)
  - Add question modal form (DONE BY PRETI)

USER MANAGEMENT PAGE STYLES 
  - User section and edit modal (DONE BY PRETI)
  - User management tabs for Active/Deleted users (DONE BY PRETI)
  - Deleted users section styling (DONE BY PRETI)
  - Badge and button styles for soft delete (DONE BY PRETI)

AUDIT LOGS PAGE STYLES
  - Audit section and empty states (DONE BY PRETI)
  - Loading spinner (DONE BY PRETI)
 
DATA EXPORT PAGE STYLES
  - Password protection panel (DONE BY PRETI)
  - Export cards and warning banners (DONE BY PRETI)
 
THEME SETTINGS PAGE STYLES
  - Theme settings container layout (DONE BY PRETI)
  - Theme sidebar and panel (DONE BY PRETI)
  - Color pickers and preview (DONE BY PRETI)
  - Saved themes management (DONE BY PRETI)

ARCHIVE DELETION CONTROLS STYLING
  - Deletion controls container, header, and badge (DONE BY PRETI)
  - Control group layout, labels, and counters (DONE BY PRETI)
  - Date range inputs and select dropdowns (DONE BY PRETI)
  - Preview count and warning callouts (DONE BY PRETI)
  - Checkbox column styling for bulk select (DONE BY PRETI)
  - Warning and danger button variants (and disabled states) (DONE BY PRETI)
  - Deletion confirmation modal layout and close button (DONE BY PRETI)
  - Modal warning block, backup checkbox, and typed confirmation input (DONE BY PRETI)
  - Mobile layout adjustments for deletion controls (DONE BY PRETI)

LEADERBOARD PAGE STYLES
  - Leaderboard page container and layout (DONE BY PRETI)
  - Leaderboard info box styling (DONE BY PRETI)
 
BUTTON COMPONENTS
  - Primary, secondary, and warning buttons (DONE BY PRETI)
  - View, edit, and delete action buttons (DONE BY PRETI)

TABLE STYLES
  - Data tables and simple tables (DONE BY PRETI)
  - Table header and cell styling (DONE BY PRETI)

BADGE COMPONENTS
  - Status and category badges (DONE BY PRETI)
 
MODAL & POPUP STYLES
  - Photo, pledge, and QA popups (DONE BY PRETI)
  - Download and delete access modals (DONE BY PRETI)
  - Standard modal components (DONE BY PRETI)

UTILITY CLASSES FOR INLINE STYLE REPLACEMENT 
  - Text and background color utilities (DONE BY PRETI)
  - Typography and spacing utilities (DONE BY PRETI)
  - Border and display utilities (DONE BY PRETI)
  - Common modal component styles (DONE BY PRETI)

ANIMATIONS
  - Fade, scale, and slide animations (DONE BY PRETI)
  - Loading spinner animation (DONE BY PRETI)

RESPONSIVE DESIGN
  - Tablet and mobile breakpoints (DONE BY PRETI)
  - Layout adjustments for all components (DONE BY PRETI)

============================================================ */

ADMIN.HTML
<!-- Login Page (DONE BY PRETI)--> 
<!-- Admin Dashboard (DONE BY PRETI)-->
<!-- Main Content (DONE BY PRETI)-->
<!-- Page Content (DONE BY PRETI)-->
<!-- Dashboard Page (DONE BY PRETI)-->
<!-- Status items will be populated by JavaScript (DONE BY PRETI)-->
<!-- Status items will be populated by JavaScript (DONE BY PRETI)-->
<!-- Feedback Data Page (DONE BY PRETI)-->
<!-- Global Search (DONE BY PRETI)-->
<!-- Advanced Filter Panel (DONE BY PRETI)-->
<!-- Date Range Filter (DONE BY PRETI)-->
<!-- Email Filter (DONE BY PRETI)-->
<!-- Visits Filter (DONE BY PRETI)-->
<!-- Data Retention Filter (DONE BY PRETI)-->
<!-- Results Count (DONE BY PRETI)-->
<!-- Results Info Bar (DONE BY PRETI)-->
<!-- This will be populated dynamically by JavaScript (DONE BY PRETI)-->
<!-- Digital Tree Page (DONE BY PRETI)-->
<!-- This will be populated dynamically by JavaScript (DONE BY PRETI)-->
<!-- Leaderboard Page (DONE BY PRETI)-->
<!-- Overlay Management Page (DONE BY PRETI)-->
<!-- This is the container that will be populated by JavaScript (DONE BY PRETI)-->
<!-- Overlay cards will be dynamically inserted here (DONE BY PRETI)-->
<!-- Question Management Page (DONE BY PRETI)-->
<!-- Questions will be loaded here dynamically (DONE BY PRETI)-->
<!-- User Management Page (DONE BY PRETI)-->
<!-- Tab Navigation (DONE BY PRETI)-->
<!-- Active Users Section (DONE BY PRETI)-->
<!-- This will be populated dynamically by JavaScript (DONE BY PRETI)-->
<!-- Deleted Users Section (DONE BY PRETI)-->
<!-- This will be populated dynamically by JavaScript (DONE BY PRETI)-->
<!-- Archive Page (DONE BY PRETI)-->
<!-- DELETION CONTROLS (System Admin Only) (DONE BY PRETI)-->
<!-- Selected Items Deletion (DONE BY PRETI)-->
<!-- Date Range Deletion (DONE BY PRETI)-->
<!-- Warning Message (DONE BY PRETI)-->
<!-- Global Search (DONE BY PRETI)-->
<!-- Advanced Filter Panel (DONE BY PRETI)-->
<!-- Date Range Filter (DONE BY PRETI)-->
<!-- Email Filter (DONE BY PRETI)-->
<!-- Visits Filter (DONE BY PRETI)-->
<!-- Data Retention Filter (DONE BY PRETI)-->
<!-- Results Count (DONE BY PRETI)-->
<!-- Results Info Bar (DONE BY PRETI)-->
<!-- Audit Logs Page (DONE BY PRETI)-->
<!-- Global Search (DONE BY PRETI)-->
<!-- Advanced Filter Panel (DONE BY PRETI)-->
<!-- Date Range Filter (DONE BY PRETI)-->
<!-- Action Filter (DONE BY PRETI)-->
<!-- Will be populated dynamically (DONE BY PRETI)-->
<!-- Target Type Filter (DONE BY PRETI)-->
<!-- IP Address Filter (DONE BY PRETI)-->
<!-- Results Count (DONE BY PRETI)-->
<!-- Results Info Bar (DONE BY PRETI)-->
<!-- Data Export Page (DONE BY PRETI)-->
<!-- Password Panel (shown by default) (DONE BY PRETI)-->
<!-- Export Cards (hidden by default) (DONE BY PRETI)-->
<!-- Card A: Full Feedback (DONE BY PRETI)-->
<!-- Card B: Feedback Not Archived (DONE BY PRETI)-->
<!-- Card C: Feedback Archived (DONE BY PRETI)-->
<!-- Card D: All Photos (DONE BY PRETI)-->
<!-- Card E: Photos Not Archived (DONE BY PRETI)-->
<!-- Card F: Photos Archived (DONE BY PRETI)-->
<!-- Card G: Audit Log (DONE BY PRETI)-->
<!-- Theme Settings Page (DONE BY PRETI)-->
<!-- Left Sidebar: Section List (DONE BY PRETI)-->
<!-- Dynamically populated (DONE BY PRETI)-->
<!-- Right Panel: Theme Controls (DONE BY PRETI)-->
<!-- Override Toggle (for non-global sections) (DONE BY PRETI)-->
<!-- Theme Settings Form (DONE BY PRETI)-->
<!-- Save Current Theme Section (DONE BY PRETI)-->
<!-- Saved Themes List (DONE BY PRETI)-->
<!-- Saved themes will be dynamically loaded here (DONE BY PRETI)-->
<!-- Dynamically populated based on selected section (DONE BY PRETI)-->
<!-- Preview Area (optional) (DONE BY PRETI)-->

// ============================================================
// ADMIN.JS - TABLE OF CONTENTS
// ============================================================
// 
// 1. GLOBAL VARIABLES & STATE MANAGEMENT
//    let currentDownloadType          - Track current download operation type (DONE BY PRETI)
//    let currentDeleteFeedbackId      - Track feedback ID pending deletion (DONE BY PRETI)
//    let currentEmailViewingId        - Track email ID being viewed (DONE BY PRETI)
//    let currentAuditPage             - Current audit logs pagination page (DONE BY PRETI)
//    let auditLogsPerPage             - Items per page for audit logs (DONE BY PRETI)
//    let currentSortField             - Current audit sort column (DONE BY PRETI)
//    let currentSortDirection         - Audit sort direction (DONE BY PRETI)
//    let allAuditLogs                 - Store all loaded audit logs (DONE BY PRETI)
//    let filteredAuditLogs            - Store filtered audit logs (DONE BY PRETI)
//    let allFeedbackData              - ALL not_archived records (DONE BY PRETI)
//    let filteredFeedbackData         - Filtered feedback results (DONE BY PRETI)
//    let feedbackCurrentPage          - Current feedback page (DONE BY PRETI)
//    const feedbackItemsPerPage       - Items per page for feedback (25) (DONE BY PRETI)
//    let allArchiveData               - ALL archived records (DONE BY PRETI)
//    let filteredArchiveData          - Filtered archive results (DONE BY PRETI)
//    let archiveCurrentPage           - Current archive page (DONE BY PRETI)
//    const archiveItemsPerPage        - Items per page for archive (25) (DONE BY PRETI)
//    let allLeaderboardData           - ALL leaderboard records (DONE BY PRETI)
//    let filteredLeaderboardData      - Filtered leaderboard results (DONE BY PRETI)
//    let leaderboardCurrentPage       - Current leaderboard page (DONE BY PRETI)
//    const leaderboardItemsPerPage    - Items per page for leaderboard (25) (DONE BY PRETI)
//    let decryptedEmailMap            - Map of decrypted emails {feedbackId: email} (DONE BY PRETI)
//    let isAnyEmailDecrypted          - Flag for feedback decryption state (DONE BY PRETI)
//    let encryptedFeedbackIds         - Array of encrypted feedback IDs (current page) (DONE BY PRETI)
//    let decryptedArchiveEmailMap     - Map of decrypted archive emails (DONE BY PRETI)
//    let isAnyArchiveEmailDecrypted   - Flag for archive decryption state (DONE BY PRETI)
//    let encryptedArchiveIds          - Array of encrypted archive IDs (current page) (DONE BY PRETI)
//    let dataExportUnlocked           - Track data export session unlock status (DONE BY PRETI)
//    let dataExportUnlockTime         - Track data export unlock timestamp (DONE BY PRETI)
//    window.questionsDataMap          - Store question data for edit functions (DONE BY PRETI)
//    function showNotification()      - Show notification message to user (DONE BY PRETI)
//
// 2. AUTHENTICATION & SESSION MANAGEMENT
//    async function handleLogin()     - Admin login with API authentication (DONE BY PRETI)
//    function handleLogout()          - Log out admin user with audit logging (DONE BY PRETI)
//    function updateUIForUser()       - Update UI based on user role (DONE BY PRETI)
//    function formatRoleName()        - Format role names for display (DONE BY PRETI)
//
// 3. AUDIT LOGS MANAGEMENT
//    async function loadAuditLogs()   - Load all audit log entries (DONE BY PRETI)
//    function populateUserFilter()    - Populate user filter dropdown (DONE BY PRETI)
//    function filterAuditLogs()       - Filter logs by search, action, user, target, IP, date (DONE BY PRETI)
//    function sortFilteredLogs()      - Sort filtered logs by current sort field (DONE BY PRETI)
//    function sortAuditLogs()         - Handle column header clicks for sorting (DONE BY PRETI)
//    function displayAuditLogsPage()  - Display current page of filtered logs (DONE BY PRETI)
//    function updateAuditTable()      - Update audit logs table display (DONE BY PRETI)
//    function getAuditBadgeType()     - Determine badge style based on action type (DONE BY PRETI)
//    function updateAuditPagination() - Update pagination controls (DONE BY PRETI)
//    function prevAuditPage()         - Navigate to previous audit page (DONE BY PRETI)
//    function nextAuditPage()         - Navigate to next audit page (DONE BY PRETI)
//    function toggleAdvancedFilters() - Show/hide advanced filter panel (DONE BY PRETI)
//    function clearAllFilters()       - Reset all filters to default (DONE BY PRETI)
//    function setDateRangePreset()    - Set date range (today/week/month) (DONE BY PRETI)
//    function updateFilterIndicators() - Highlight active filters (DONE BY PRETI)
//    function updateResultsCounts()   - Update result count displays (DONE BY PRETI)
//    async function downloadAuditExcel() - Download filtered logs as CSV/Excel (DONE BY PRETI)
//
// 4. DASHBOARD MANAGEMENT
//    async function loadDashboardData() - Load dashboard statistics from API (DONE BY PRETI)
//    function updateDashboardStats()  - Update dashboard stat cards (DONE BY PRETI)
//    function updateRecentActivity()  - Update recent activity section (DONE BY PRETI)
//    function createStatusItem()      - Create status item element (DONE BY PRETI)
//    function updateLastUpdated()     - Update last updated timestamp (DONE BY PRETI)
//    function getDefaultStats()       - Get fallback statistics for offline mode (DONE BY PRETI)
//    function refreshDashboard()      - Refresh dashboard data (DONE BY PRETI)
//
// 5. FEEDBACK DATA MANAGEMENT (NOT_ARCHIVED)
//    async function loadFeedbackData() - Load ALL feedback data (not_archived) (DONE BY PRETI)
//    function filterFeedbackData()    - Filter feedback based on all active filters (DONE BY PRETI)
//    function updateFeedbackCounts()  - Update feedback count displays (DONE BY PRETI)
//    function renderFeedbackPage()    - Render current page of feedback (25 records) (DONE BY PRETI)
//    function updateFeedbackPaginationControls() - Update feedback pagination controls (DONE BY PRETI)
//    function prevFeedbackPage()      - Navigate to previous feedback page (DONE BY PRETI)
//    function nextFeedbackPage()      - Navigate to next feedback page (DONE BY PRETI)
//    function refreshFeedbackData()   - Refresh feedback data (DONE BY PRETI)
//
// 6. ARCHIVE DATA MANAGEMENT (ARCHIVED)
//    async function loadArchiveData() - Load ALL archive data (archived) (DONE BY PRETI)
//    function filterArchiveData()     - Filter archive data (DONE BY PRETI)
//    function updateArchiveCounts()   - Update archive count displays (DONE BY PRETI)
//    function renderArchivePage()     - Render current page of archive (25 records) (DONE BY PRETI)
//    function updateArchivePaginationControls() - Update archive pagination controls (DONE BY PRETI)
//    function prevArchivePage()       - Navigate to previous archive page (DONE BY PRETI)
//    function nextArchivePage()       - Navigate to next archive page (DONE BY PRETI)
//    function refreshArchiveData()    - Refresh archive data (DONE BY PRETI)
//
// 7. FILTER CONTROLS (BOTH TABS)
//    function toggleFeedbackAdvancedFilters() - Toggle feedback advanced filters panel (DONE BY PRETI)
//    function toggleArchiveAdvancedFilters() - Toggle archive advanced filters panel (DONE BY PRETI)
//    function setFeedbackDateRangePreset() - Set feedback date range preset (DONE BY PRETI)
//    function setArchiveDateRangePreset() - Set archive date range preset (DONE BY PRETI)
//    function clearAllFeedbackFilters() - Clear all feedback filters (DONE BY PRETI)
//    function clearAllArchiveFilters() - Clear all archive filters (DONE BY PRETI)
//
// 8. ENCRYPTION MANAGEMENT (PAGE-SPECIFIC)
//    function updateEncryptionButtons() - Update feedback encryption buttons (DONE BY PRETI)
//    function updateArchiveEncryptionButtons() - Update archive encryption buttons (DONE BY PRETI)
//    async function decryptAllEmails() - Decrypt emails on current feedback page (DONE BY PRETI)
//    async function decryptAllArchiveEmails() - Decrypt emails on current archive page (DONE BY PRETI)
//    function reEncryptAllEmails()    - Re-encrypt feedback emails (DONE BY PRETI)
//    function reEncryptAllArchiveEmails() - Re-encrypt archive emails (DONE BY PRETI)
//
// 9. PLEDGE & CONTENT VIEWING
//    function viewPledge()            - Display pledge content in popup (DONE BY PRETI)
//    function closePledgePopup()      - Close pledge popup (DONE BY PRETI)
//    async function viewQuestionAnswers() - Load and display question answers (DONE BY PRETI)
//    function createQuestionAnswersPopup() - Create Q&A popup interface (DONE BY PRETI)
//    function formatAnswer()          - Format answer based on question type (DONE BY PRETI)
//    function closeQAPopup()          - Close Q&A popup (DONE BY PRETI)
//
// 10. PHOTO MANAGEMENT
//     async function viewRawPhoto()   - View raw photo without password (DONE BY PRETI)
//     async function viewProcessedPhoto() - View processed photo without password (DONE BY PRETI)
//     function showRawPhotoPopup()    - Show raw photo popup (DONE BY PRETI)
//     function showProcessedPhotoPopup() - Show processed photo popup (DONE BY PRETI)
//     function createPhotoPopup()     - Create photo viewing popup (DONE BY PRETI)
//     function handlePhotoError()     - Handle photo loading errors (DONE BY PRETI)
//     function downloadPhoto()        - Download photo file (DONE BY PRETI)
//     function closePhotoPopup()      - Close photo popup (DONE BY PRETI)
//
// 11. EMAIL MANAGEMENT
//     function showPasswordPrompt()   - Custom password prompt with hidden input (DONE BY PRETI)
//     function showEmailPopup()       - Display decrypted email in popup (DONE BY PRETI)
//     function closeEmailPopup()      - Close email display popup (DONE BY PRETI)
//
// 12. OVERLAY MANAGEMENT
//     async function loadOverlayData() - Load overlay themes from API (DONE BY PRETI)
//     function showOverlayMessage()   - Display overlay status message (DONE BY PRETI)
//     function createOverlaysTable()  - Placeholder for creating overlays table (DONE BY PRETI)
//     function updateOverlayTable()   - Update overlay grid display (DONE BY PRETI)
//     function viewOverlay()          - View overlay image in popup (DONE BY PRETI)
//     function closeOverlayPreview()  - Close overlay preview (DONE BY PRETI)
//     function handleOverlayImageError() - Handle overlay image loading errors (DONE BY PRETI)
//     function downloadOverlay()      - Download overlay image (DONE BY PRETI)
//     function showAddOverlayModal()  - Show add overlay modal (System Admin only) (DONE BY PRETI)
//     function closeAddOverlayModal() - Close add overlay modal (DONE BY PRETI)
//     async function handleAddOverlay() - Handle overlay creation with file upload (DONE BY PRETI)
//     async function deleteOverlay()  - Request overlay deletion (System Admin only) (DONE BY PRETI)
//     async function performOverlayDeletion() - Execute overlay deletion (DONE BY PRETI)
// 
// 13. USER MANAGEMENT 
//     let currentUserTab                - Track current tab ('active' or 'deleted') (DONE BY PRETI)
//     function switchUserTab()          - Switch between Active/Deleted users tabs (DONE BY PRETI)
//     async function loadUserManagementData() - Load users based on current tab (DONE BY PRETI)
//     async function loadActiveUsers()  - Load active admin users (DONE BY PRETI)
//     async function loadDeletedUsers() - Load deleted admin users (DONE BY PRETI)
//     function updateActiveUsersTable() - Update active users table (DONE BY PRETI)
//     function updateDeletedUsersTable() - Update deleted users table (DONE BY PRETI)
//     function updateUserManagementTable() - Legacy wrapper for backward compatibility (DONE BY PRETI)
//     function addUser()                - Open add user modal (System Admin only) (DONE BY PRETI)
//     async function handleAddUser()    - Process new user creation (DONE BY PRETI)
//     function closeAddUserModal()      - Close add user modal (DONE BY PRETI)
//     function editUser()               - Open user edit modal (System Admin only) (DONE BY PRETI)
//     async function handleEditUser()   - Process user updates (DONE BY PRETI)
//     function closeEditUserModal()     - Close edit user modal (DONE BY PRETI)
//     async function deleteUser()       - Soft delete user (DONE BY PRETI)
//     async function performUserDeletion() - Execute soft deletion (DONE BY PRETI)
//     async function restoreUser()      - Restore soft-deleted user (DONE BY PRETI)
//     async function permanentDeleteUser() - Permanently delete from database (DONE BY PRETI)
//     function getFallbackUsers()       - Get fallback user data for development (DONE BY PRETI)
//     function formatRoleName()         - Format role display names (DONE BY PRETI)
//
// 14. QUESTION MANAGEMENT
//     async function loadQuestionManagementData() - Load question data from API (DONE BY PRETI)
//     function updateQuestionManagementTable() - Update question display (DONE BY PRETI)
//     function formatQuestionType()   - Format question type for display (DONE BY PRETI)
//     function showAddQuestionModal() - Show add question modal (System Admin only) (DONE BY PRETI)
//     function closeAddQuestionModal() - Close add question modal (DONE BY PRETI)
//     function toggleOptionsField()   - Show/hide options based on question type (DONE BY PRETI)
//     function addOptionField()       - Add option input field (DONE BY PRETI)
//     function removeOptionField()    - Remove option input field (DONE BY PRETI)
//     async function handleAddQuestion() - Process new question creation (DONE BY PRETI)
//     function editQuestionById()     - Helper to retrieve question data and call edit (DONE BY PRETI)
//     function editQuestion()         - Open question edit modal (System Admin only) (DONE BY PRETI)
//     async function handleEditQuestion() - Process question updates (safe editing) (DONE BY PRETI)
//     function closeEditQuestionModal() - Close edit question modal (DONE BY PRETI)
//     async function deleteQuestion() - Delete question (System Admin only) (DONE BY PRETI)
//
// 15. DATA EXPORT MANAGEMENT
//     function initDataExportPage()   - Initialize data export page with access control (DONE BY PRETI)
//     async function unlockDataExport() - Unlock data export with password verification (DONE BY PRETI)
//     function updateExportSessionInfo() - Update session info display (DONE BY PRETI)
//     async function downloadExport() - Download export file (Excel/CSV/Zip) (DONE BY PRETI)
//
// 16. FEEDBACK DELETION
//     async function deleteFeedback() - Request feedback deletion with password (DONE BY PRETI)
//     async function deleteArchiveFeedback() - Request archive feedback deletion (DONE BY PRETI)
//     function showDeletePasswordModal() - Show deletion password prompt (DONE BY PRETI)
//     async function verifyDeleteAccess() - Verify password for deletion (DONE BY PRETI)
//     async function performFeedbackDeletion() - Execute feedback deletion (DONE BY PRETI)
//     function closeDeleteModal()     - Close delete modal (DONE BY PRETI)
//
// 17. NAVIGATION & PAGE MANAGEMENT
//     function showPage()             - Navigate between pages with role-based access control (DONE BY PRETI)
//     function initializeArchivePage() - Initialize archive page (placeholder) (DONE BY PRETI)
//
// 18. DIGITAL TREE MANAGEMENT
//     async function loadDigitalTreeData() - Load digital tree visitor data (DONE BY PRETI)
//     function updateDigitalTreeTable() - Update digital tree table (DONE BY PRETI)
//     function refreshTreeData()      - Refresh tree data (DONE BY PRETI)
//
// 19. UTILITY FUNCTIONS
//     function escapeHtml()           - Escape HTML for safe display (DONE BY PRETI)
//
// 20. THEME SETTINGS - HELPER FUNCTIONS
//     function showConfirmDialog()    - Show confirmation dialog (DONE BY PRETI)
//
// 21. THEME CONFIGURATION
//     function getDefaultThemeSettings() - Get default theme color settings (DONE BY PRETI)
//     function initThemeSettings()    - Initialize theme settings page (DONE BY PRETI)
//     function loadThemeSettings()    - Load theme settings from localStorage (DONE BY PRETI)
//     function migrateOldColors()     - Migrate old color format to new structure (DONE BY PRETI)
//     function getCustomDefaultColors() - Get custom default colors (DONE BY PRETI)
//     function saveIndividualPageSettings() - Save page-specific color overrides (DONE BY PRETI)
//     function loadIndividualPageSettings() - Load page-specific color overrides (DONE BY PRETI)
//     function saveThemeSettings()    - Save theme settings to localStorage (DONE BY PRETI)
//     function showSaveMessage()      - Show save confirmation message (DONE BY PRETI)
//
// 22. THEME MANAGEMENT FUNCTIONS
//     function renderSectionList()    - Render list of theme sections (DONE BY PRETI)
//     function selectSection()        - Select theme section for editing (DONE BY PRETI)
//     function updateSectionTitle()   - Update section title display (DONE BY PRETI)
//     function renderThemeControls()  - Render color controls for section (DONE BY PRETI)
//     function createColorGroup()     - Create group of color controls (DONE BY PRETI)
//     function createColorControl()   - Create individual color control (DONE BY PRETI)
//     function updateColor()          - Update color value from picker (DONE BY PRETI)
//     function updateColorFromHex()   - Update color value from hex input (DONE BY PRETI)
//     function toggleGlobalThemeOverride() - Toggle global theme override for section (DONE BY PRETI)
//     function resetSectionToGlobal() - Reset section colors to global theme (DONE BY PRETI)
//     async function resetAllToDefaults() - Reset all theme settings to defaults (DONE BY PRETI)
//     function updatePreview()        - Update theme preview display (DONE BY PRETI)
//     function applyThemeSettings()   - Apply theme colors to all pages (DONE BY PRETI)
//
// 23. SAVED THEMES MANAGEMENT
//     let savedThemesCache            - Cache saved themes data (DONE BY PRETI)
//     async function loadSavedThemes() - Load user saved themes from database (DONE BY PRETI)
//     function updateSavedThemesUI()  - Update saved themes UI display (DONE BY PRETI)
//     function createSavedThemeCard() - Create saved theme card element (DONE BY PRETI)
//     function extractPreviewColors() - Extract preview colors from theme data (DONE BY PRETI)
//     function captureCurrentThemeData() - Capture current theme configuration (DONE BY PRETI)
//     async function saveCurrentTheme() - Save current theme to database (DONE BY PRETI)
//     function clearSaveThemeForm()   - Clear save theme form inputs (DONE BY PRETI)
//     function applyThemeData()       - Apply theme data to UI (DONE BY PRETI)
//     async function activateSavedTheme() - Set theme as active for user (DONE BY PRETI)
//     async function renameSavedTheme() - Rename saved theme (DONE BY PRETI)
//     function createRenameModal()    - Create rename modal interface (DONE BY PRETI)
//     async function performRename()  - Execute theme rename operation (DONE BY PRETI)
//     function closeRenameModal()     - Close rename modal (DONE BY PRETI)
//     async function deleteSavedTheme() - Delete saved theme from database (DONE BY PRETI)
//     async function refreshSavedThemes() - Refresh saved themes list (DONE BY PRETI)
//     async function loadActiveThemeOnLogin() - Load and apply active theme on page load (DONE BY PRETI)
//     function applyDefaultTheme()    - Apply default theme colors (DONE BY PRETI)
//     function initSavedThemesSection() - Initialize saved themes section (DONE BY PRETI)
//
// 24. ARCHIVE DELETION FUNCTIONS (System Admin Only)
//     function initializeDeletionControls() - Show/hide deletion controls based on user role (DONE BY PRETI)
//     function toggleSelectAllArchive() - Toggle select all checkboxes in archive (DONE BY PRETI)
//     function updateArchiveSelectionCount() - Update selected count and enable/disable delete button (DONE BY PRETI)
//     function setQuickDeleteDate()   - Set quick date for bulk deletion (DONE BY PRETI) 
//     async function previewBulkDelete() - Preview records to be deleted by date (DONE BY PRETI) 
//     async function deleteSelectedArchive() - Delete selected archive records (DONE BY PRETI) 
//     async function bulkDeleteByDate() - Bulk delete records before date (DONE BY PRETI)
//     function showDeletionConfirmationModal() - Show deletion confirmation modal (DONE BY PRETI) 
//     function refreshArchiveData()   - Refresh archive data after deletion (DONE BY PRETI) 
//
// 25. INITIALIZATION & EVENT HANDLERS
//     window.addEventListener('DOMContentLoaded') - Check login status on page load (DONE BY PRETI)
//
// 26. LEADERBOARD MANAGEMENT
//     async function loadAdminLeaderboard() - Load leaderboard data from API (DONE BY PRETI)
//     function filterLeaderboardData() - Filter leaderboard data by search term (DONE BY PRETI)
//     function clearLeaderboardSearch() - Clear leaderboard search (DONE BY PRETI)
//     function renderLeaderboardPage() - Render current page of leaderboard (DONE BY PRETI)
//     function updateLeaderboardPaginationControls() - Update leaderboard pagination controls (DONE BY PRETI)
//     function prevLeaderboardPage()  - Navigate to previous leaderboard page (DONE BY PRETI)
//     function nextLeaderboardPage()  - Navigate to next leaderboard page (DONE BY PRETI)
//

// ============================================================
// ADMINROUTES.JS - TABLE OF CONTENTS 
// ============================================================
// 
// 1. AUDIT LOGGING FUNCTIONS
//    function logAudit()              - Log admin actions to database with IP and user agent (DONE BY PRETI)
//
// 2. FILE UPLOAD CONFIGURATION
//    const storage = multer.diskStorage - Configure multer storage for overlay file uploads (DONE BY PRETI)
//    const upload = multer            - Handle PNG file uploads with validation (DONE BY PRETI)
//
// 3. AUTHENTICATION ROUTES
//    router.post('/login'             - Admin login with audit logging (DONE BY PRETI)
//    router.post('/logout-audit'      - Log admin logout with audit trail (DONE BY PRETI)
//
// 4. DASHBOARD ROUTES
//    router.get('/dashboard'          - Get dashboard statistics for last 1 month and recent activity (DONE BY PRETI)
//    router.get('/test-db'            - Test database connection and table counts (DONE BY PRETI)
//
// 5. FEEDBACK MANAGEMENT ROUTES
//    router.get('/feedback'           - Get all feedback with answers and pagination (DONE BY PRETI)
//    router.put('/feedback/:id'       - Update feedback entry with admin notes (DONE BY PRETI)
//    router.delete('/feedback/:id'    - Delete feedback with cascade and photo cleanup (DONE BY PRETI)
//    router.get('/feedback/:id/questions' - Get all feedback questions and answers (DONE BY PRETI)
// 
// 6. ARCHIVE MANAGEMENT ROUTES
//    router.get('/archive'            - Get archived feedback (older than 3 months) (DONE BY PRETI)
//    router.post('/archive/update-status' - Manually trigger archive status update (DONE BY PRETI)
//    router.get('/archive/stats'      - Archive Statistics [CHECK IF ITS NEEDED] (DONE BY PRETI)
//    router.post('/bulk-decrypt-archive' - Bulk decrypt archived emails with admin verification (DONE BY PRETI)
//    router.post('/download-archive-photos' - Download archived photos as ZIP (DONE BY PRETI)
//    router.get('/download-file/:filename' - Serve downloaded files from temp directory (DONE BY PRETI)
// 
// 7. ARCHIVE DELETION ROUTES (System Admin Only)
//    router.post('/archive/preview-deletion' - Preview deletion count before executing (System Admin only) (DONE BY PRETI)
//    router.post('/archive/delete-selected' - Permanently delete selected archived feedback (System Admin only) (DONE BY PRETI)
//    router.post('/archive/delete-by-date' - Permanently delete archived feedback by date range (System Admin only) (DONE BY PRETI)
// 
// 8. PHOTO ACCESS & EMAIL DECRYPTION ROUTES
//    router.post('/verify-photo-access' - Verify system admin password for photo access (DONE BY PRETI)
//    router.post('/decrypt-email'     - Decrypt email with system admin verification (DONE BY PRETI)
//
// 9. ADMIN USER MANAGEMENT ROUTES 
//    router.get('/users'              - Get all ACTIVE admin users (excludes soft-deleted) (DONE BY PRETI)
//    router.get('/users/deleted'      - Get all DELETED admin users (soft-deleted only) (DONE BY PRETI)
//    router.post('/users')            - Add new admin user with password hashing and full_name (DONE BY PRETI)
//    router.delete('/users/:id'       - Soft delete admin user (mark as deleted) (DONE BY PRETI)
//    router.post('/users/:id/restore' - Restore soft-deleted admin user (DONE BY PRETI)
//    router.delete('/users/:id/permanent' - Permanently delete soft-deleted user from database (DONE BY PRETI)
//    router.put('/users/:id'          - Update admin user details with validation (DONE BY PRETI)
//
// 10. DATA EXPORT MANAGEMENT ROUTES
//    router.post('/data-export/unlock' - Unlock data export with password verification (System Admin only) (DONE BY PRETI)
//
// 11. EXPORT/IMPORT ROUTES
//     router.get('/download-excel'    - Download feedback as CSV with decrypted emails (DONE BY PRETI)
//     router.get('/download-archive-excel' - Download archived feedback as CSV with decryption (DONE BY PRETI)
//     router.get('/download-photos'   - Download photos as ZIP archive (DONE BY PRETI)
//
// 12. OVERLAY MANAGEMENT ROUTES
//     router.get('/overlays'          - Get all overlay themes with display order (DONE BY PRETI)
//     router.post('/overlays'         - Add new overlay with file uploads (System Admin only) (DONE BY PRETI)
//     router.delete('/overlays/:id'   - Delete overlay and associated image files (DONE BY PRETI)
//
// 13. QUESTION MANAGEMENT ROUTES
//     router.get('/questions'         - Get all active questions with options (DONE BY PRETI)
//     router.post('/questions'        - Add new question with multiple choice options (DONE BY PRETI)
//     router.delete('/questions/:id'  - Delete question with soft/hard delete based on answers (DONE BY PRETI)
//     router.put('/questions/:id'     - Update question safely without breaking answers (DONE BY PRETI)
//
// 14. AUDIT LOGS ROUTES
//     router.get('/audit-logs'        - Get audit log entries with pagination (DONE BY PRETI)
//
// 15. HELPER FUNCTIONS
//     function deleteUserPhotos()     - Delete user photo files from filesystem (DONE BY PRETI)
//     function deleteOverlayFiles()   - Delete overlay image files from assets directory (DONE BY PRETI)
//     function checkDirectoryForPhotos() - Check if directory contains image files (DONE BY PRETI)
//     function createUploadsZip()     - Create ZIP archive of uploads directory (DONE BY PRETI)
//     function convertToCSV()         - Convert data array to CSV format (DONE BY PRETI)
//
// 16. SAVED THEMES ROUTES
//     router.get('/saved-themes'      - Get all saved themes for the current logged-in user (DONE BY PRETI)
//     router.post('/saved-themes'     - Save a new theme for the current user (DONE BY PRETI)
//     router.put('/saved-themes/:id/activate' - Set a saved theme as the active theme (DONE BY PRETI)
//     router.post('/saved-themes/deactivate-all' - Deactivate all themes for current user (DONE BY PRETI)
//     router.put('/saved-themes/:id'  - Update a saved theme (rename only) (DONE BY PRETI)
//     router.delete('/saved-themes/:id' - Delete a saved theme (DONE BY PRETI)
//     router.get('/saved-themes/active' - Get the currently active theme for the logged-in user (DONE BY PRETI)


/* ============================================================
   LEADERBOARD.CSS - TABLE OF CONTENTS
   ============================================================ */
/* 
   1. ROOT VARIABLES
      :root                                  - CSS custom properties for colors, shadows, and transitions (DONE BY PRETI)
   
   2. GLOBAL STYLES
      *                                      - Universal box-sizing reset (DONE BY PRETI)
      body                                   - Base font, background, and layout settings (DONE BY PRETI)
   
   3. CONTAINER & HEADER
      .leaderboard-container                 - Main wrapper with max-width and padding (DONE BY PRETI)
      .leaderboard-header                    - Gradient header with rounded corners and shadow (DONE BY PRETI)
      .back-button                           - Positioned back navigation button (DONE BY PRETI)
      .back-button:hover                     - Hover state with background change and slide effect (DONE BY PRETI)
      .header-content                        - Centered header text container (DONE BY PRETI)
      .header-content h1                     - Main header title styling (DONE BY PRETI)
      .header-content p                      - Header subtitle styling (DONE BY PRETI)
   
   4. SECTION TITLES
      .section-title                         - Section heading with flex layout (DONE BY PRETI)
   
   4.5 SEARCH SECTION
      .search-section                        - Search area wrapper with spacing (DONE BY PRETI)
      .search-container                      - Flex container for search input and button (DONE BY PRETI)
      .search-input                          - Search text input with border and focus styles (DONE BY PRETI)
      .search-input:focus                    - Focus state with primary color border and shadow (DONE BY PRETI)
      .clear-search-btn                      - Clear search button styling (DONE BY PRETI)
      .clear-search-btn:hover                - Hover state for clear button (DONE BY PRETI)
      .search-hint                           - Helper text below search input (DONE BY PRETI)
   
   5. TOP 3 SECTION
      .top-three-section                     - Container for top 3 pledges (DONE BY PRETI)
      .top-three-grid                        - Grid layout for top pledge cards (DONE BY PRETI)
      .top-pledge-card                       - Individual top pledge card styling (DONE BY PRETI)
      .top-pledge-card:hover                 - Hover effect with lift animation (DONE BY PRETI)
      .top-pledge-card.rank-1                - Gold medal styling for 1st place (DONE BY PRETI)
      .top-pledge-card.rank-2                - Silver medal styling for 2nd place (DONE BY PRETI)
      .top-pledge-card.rank-3                - Bronze medal styling for 3rd place (DONE BY PRETI)
      .medal-badge                           - Medal emoji positioning (DONE BY PRETI)
      .pledge-rank                           - Rank badge styling (DONE BY PRETI)
      .rank-1 .pledge-rank                   - Gold rank badge colors (DONE BY PRETI)
      .rank-2 .pledge-rank                   - Silver rank badge colors (DONE BY PRETI)
      .rank-3 .pledge-rank                   - Bronze rank badge colors (DONE BY PRETI)
      .pledge-author                         - Author name styling (DONE BY PRETI)
      .pledge-text                           - Pledge content text styling (DONE BY PRETI)
      .pledge-footer                         - Footer section with like button and date (DONE BY PRETI)
      .like-button                           - Interactive like button styling (DONE BY PRETI)
      .like-button:hover                     - Hover state with color change and scale (DONE BY PRETI)
      .like-button.liked                     - Active liked state styling (DONE BY PRETI)
      .like-count                            - Like count number styling (DONE BY PRETI)
      .pledge-date                           - Date display styling (DONE BY PRETI)
   
   6. ALL PLEDGES SECTION
      .all-pledges-section                   - Container for all pledges list (DONE BY PRETI)
      .pledges-list                          - Scrollable list container (DONE BY PRETI)
      .pledges-list::-webkit-scrollbar       - Custom scrollbar width (DONE BY PRETI)
      .pledges-list::-webkit-scrollbar-track - Scrollbar track styling (DONE BY PRETI)
      .pledges-list::-webkit-scrollbar-thumb - Scrollbar thumb styling (DONE BY PRETI)
      .pledge-card                           - Individual pledge card in list (DONE BY PRETI)
      .pledge-card:hover                     - Hover effect with shadow and slide (DONE BY PRETI)
      .pledge-card .pledge-header            - Header section within pledge card (DONE BY PRETI)
      .pledge-card .pledge-author            - Author name in list view (DONE BY PRETI)
      .pledge-card .pledge-text              - Pledge text in list view (DONE BY PRETI)
    
   7. LOADING & EMPTY STATES
      .loading-state                         - Loading screen container (DONE BY PRETI)
      .spinner                               - Animated loading spinner (DONE BY PRETI)
      @keyframes spin                        - Rotation animation for spinner (DONE BY PRETI)
      .empty-state                           - Empty state message container (DONE BY PRETI)
      .empty-icon                            - Large emoji icon for empty state (DONE BY PRETI)
      .empty-state h3                        - Empty state heading (DONE BY PRETI)
      .empty-state p                         - Empty state description text (DONE BY PRETI)
      .cta-button                            - Call-to-action button styling (DONE BY PRETI)
      .cta-button:hover                      - CTA button hover effect (DONE BY PRETI)
   
   8. RESPONSIVE DESIGN
      @media (max-width: 768px)              - Tablet breakpoint styles (DONE BY PRETI)
      @media (max-width: 480px)              - Mobile breakpoint styles (DONE BY PRETI)
*/v

LEADERBOARD.HTML
<!-- Leaderboard Page (DONE BY PRETI)-->
<!-- Search Bar (DONE BY PRETI)-->
<!-- Top 3 Section (DONE BY PRETI)-->
<!-- Top 3 pledges will be dynamically inserted here (DONE BY PRETI)-->
<!-- All Pledges Section (DONE BY PRETI)-->
<!-- All other pledges will be dynamically inserted here (DONE BY PRETI)-->
<!-- Empty State (shown when no pledges) (DONE BY PRETI)-->
<!-- No Results State (shown when search returns nothing) (DONE BY PRETI)-->

// ============================================================
// LEADERBOARD.JS - TABLE OF CONTENTS (CTRL+F SEARCHABLE)
// ============================================================
// 
// 1. GLOBAL VARIABLES
//    let allPledges                                - Stores all pledges from current month (DONE BY PRETI)
//    let filteredPledges                           - Stores filtered pledges after search (DONE BY PRETI)
//    let userIdentifier                            - Unique identifier for tracking user likes (DONE BY PRETI)
//
// 2. INITIALIZATION
//    document.addEventListener('DOMContentLoaded'  - Initialize leaderboard on page load (DONE BY PRETI)
//
// 3. USER IDENTIFICATION
//    function getUserIdentifier()                  - Generate unique identifier for user (DONE BY PRETI)
//
// 4. LOAD LEADERBOARD DATA
//    async function loadLeaderboard()              - Fetch and display pledges from current month (DONE BY PRETI)
//    function filterCurrentMonth(                  - Filter pledges to only current month (DONE BY PRETI)
//
// 5. SEARCH FUNCTIONALITY
//    function searchPledges()                      - Search pledges by name (DONE BY PRETI)
//    function clearSearch()                        - Clear search and show all pledges (DONE BY PRETI)
//
// 6. RENDER LEADERBOARD
//    function renderLeaderboard()                  - Render top 3 and all pledges sections (DONE BY PRETI)
//
// 7. CREATE PLEDGE CARDS
//    function createTopPledgeCard(                 - Create HTML for top 3 pledge card (DONE BY PRETI)
//    function createPledgeCard(                    - Create HTML for regular pledge card (DONE BY PRETI)
//
// 8. LIKE FUNCTIONALITY
//    async function toggleLike(                    - Toggle like on a pledge (DONE BY PRETI)
//    async function likePledge(                    - Like a pledge (DONE BY PRETI)
//    async function unlikePledge(                  - Unlike a pledge (DONE BY PRETI) 
//    async function checkUserLikes()               - Check which pledges user has liked (DONE BY PRETI)
//
// 9. UI HELPERS
//    function showEmptyState()                     - Show empty state when no pledges exist (DONE BY PRETI)
//    function showError(                           - Show error message (DONE BY PRETI)
//    function escapeHtml(                          - Escape HTML to prevent XSS (DONE BY PRETI)
//    function showNoResultsState()                 - Show no results state when search returns nothing (DONE BY PRETI)
//
// 10. NAVIGATION
//    function goBackToFeedback()                   - Go back to feedback page (DONE BY PRETI)

// ============================================================
// LEADERBOARDROUTES.JS - TABLE OF CONTENTS 
// ============================================================
// 
// 1. GET LEADERBOARD DATA 
//    router.get('/pledges'                    - Get all pledges with like counts for public leaderboard (DONE BY PRETI)
//
// 2. LIKE A PLEDGE 
//    router.post('/like/:feedbackId'          - Add a like to a specific pledge (DONE BY PRETI)
// 
// 3. UNLIKE A PLEDGE 
//    router.delete('/unlike/:feedbackId'      - Remove a like from a specific pledge (DONE BY PRETI)
//
// 4. CHECK IF USER LIKED A PLEDGE 
//    router.get('/check-like/:feedbackId'     - Check if a user has already liked a specific pledge (DONE BY PRETI)
//
// 5. ADMIN: GET LEADERBOARD WITH SORTING 
//    router.get('/admin/pledges'              - Admin endpoint to get pledges with sorting options (DONE BY PRETI)
//
// 6. ROOT ENDPOINT 
//    router.get('/'                           - API status and endpoint information (DONE BY PRETI)


SCHEMA.SQL
-- ============================================================
-- USERS TABLE (DONE BY PRETI)
-- ============================================================

-- ============================================================
-- FEEDBACK TABLE (DONE BY PRETI)
-- ============================================================

-- ============================================================
-- QUESTIONS TABLE (DONE BY PRETI)
-- ============================================================

-- ============================================================
-- QUESTION OPTIONS TABLE (DONE BY PRETI)
-- ============================================================

-- ============================================================
-- FEEDBACK ANSWERS TABLE (DONE BY PRETI)
-- ============================================================

-- ============================================================
-- ADMIN USERS TABLE (DONE BY PRETI)
-- ============================================================

-- ============================================================
-- AUDIT LOGS TABLE (DONE BY PRETI)
-- ============================================================

-- ============================================================
-- OVERLAYS TABLE (DONE BY PRETI)
-- ============================================================

-- ============================================================
-- SAVED THEMES TABLE (DONE BY PRETI)
-- ============================================================

-- ============================================================
-- PLEDGE LIKES TABLE (LEADERBOARD FEATURE) (DONE BY PRETI)
-- ============================================================

-- ============================================================
-- COUNTDOWN MANAGEMENT TABLE (GLOBAL TIMER CONFIG)
-- ============================================================

-- ============================================================
-- INSERT INITIAL DATA (DONE BY PRETI)
-- ============================================================

-- ============================================================
-- VERIFICATION (DONE BY PRETI)
-- ============================================================

// ============================================================
// DB.JS - TABLE OF CONTENTS 
// ============================================================
// 
// 1. DATABASE CONFIGURATION
//    const mysql = require('mysql2')  - MySQL database driver (DONE BY PRETI)
//    const path = require('path')     - Path utility module (DONE BY PRETI)
//    const pool = mysql.createPool()  - MySQL connection pool configuration (DONE BY PRETI)
//
// 2. DATABASE CONNECTION TEST
//    pool.getConnection()             - Test database connection on startup (DONE BY PRETI)
//
// 3. SQLITE-COMPATIBLE WRAPPER FUNCTIONS 
//    function get()                   - Execute query and return single row (SQLite db.get) (DONE BY PRETI)
//    function all()                   - Execute query and return all rows (SQLite db.all) (DONE BY PRETI)
//    function run()                   - Execute INSERT/UPDATE/DELETE (SQLite db.run) (DONE BY PRETI)
//
// 4. TRANSACTION FUNCTIONS
//    function beginTransaction()      - Begin database transaction (DONE BY PRETI)
//    function commit()                - Commit database transaction (DONE BY PRETI)
//    function rollback()              - Rollback database transaction (DONE BY PRETI)
//
// 5. MODULE EXPORTS
//    module.exports                   - Export pool and SQLite-compatible functions (DONE BY PRETI)
//

// ============================================================
// AUTHLAYER_RECONSTITUTION.JS - TABLE OF CONTENTS 
// ============================================================
// 
// 1. IMPORTS & CONFIGURATION
//    const mysql                      - MySQL2 promise library (DONE BY PRETI)
//    const bcrypt                     - Password hashing library (DONE BY PRETI)
//    const crypto                     - Node.js crypto for encryption (DONE BY PRETI)
//    const DB_CONFIG                  - Database connection configuration (DONE BY PRETI)
//    const ENCRYPTION_KEY             - AES-256 encryption key for emails (DONE BY PRETI)
//
// 2. HELPER FUNCTIONS
//    async function hashPassword()    - Hash password using bcrypt (12 rounds) (DONE BY PRETI)
//    function encryptEmail()          - Encrypt email using AES-256-GCM (DONE BY PRETI)
//
// 3. PASSWORD MIGRATION
//    async function migratePasswords() - Hash plain-text passwords in admin_users table (DONE BY PRETI)
//
// 4. EMAIL MIGRATION
//    async function migrateEmails()   - Encrypt plain-text emails in users table (DONE BY PRETI)
//
// 5. MAIN EXECUTION
//    async function runMigration()    - Execute complete migration process (DONE BY PRETI)
//    runMigration()                   - Script entry point (DONE BY PRETI)
//
// ============================================================
// CHECK_DATABASE.JS - TABLE OF CONTENTS 
// ============================================================
// 
// 1. IMPORTS & CONFIGURATION
//    const mysql                      - MySQL database library (DONE BY PRETI)
//    const DB_CONFIG                  - Database connection configuration (DONE BY PRETI)
//    const connection                 - MySQL connection instance (DONE BY PRETI)
//
// 2. DATABASE CONNECTION & VERIFICATION
//    connection.connect()             - Connect to database (DONE BY PRETI)
//    Query admin users                - Retrieve all admin users (DONE BY PRETI)
//    Display user info                - Show user details and diagnostics (DONE BY PRETI)
//    Test auth query                  - Test systemadmin login query (DONE BY PRETI)

// ============================================================
// DATASTORE_ASSEMBLY.JS - TABLE OF CONTENTS
// ============================================================
// 
// 1. IMPORTS & CONFIGURATION
//    const mysql                      - MySQL2 promise library (DONE BY PRETI)
//    const fs                         - File system operations (DONE BY PRETI)
//    const path                       - Path utilities (DONE BY PRETI)
//    const readline                   - Terminal input interface (DONE BY PRETI)
//    require('dotenv')                - Load environment variables (DONE BY PRETI)
//    const rl                         - Readline interface instance (DONE BY PRETI)
//
// 2. HELPER FUNCTIONS
//    function question()              - Prompt user for input (async wrapper) (DONE BY PRETI)
//
// 3. DATABASE SETUP
//    async function setup()           - Main setup orchestration function (DONE BY PRETI)
//
// 4. SCRIPT EXECUTION
//    setup()                          - Execute main setup function (DONE BY PRETI)

// ============================================================
// PURGE_ACTUATOR.JS - TABLE OF CONTENTS 
// ============================================================
// 
// 1. IMPORTS & CONFIGURATION
//    require('dotenv')                - Environment variables (DONE BY PRETI)
//    const mysql                      - MySQL database library (DONE BY PRETI)
//    const readline                   - Terminal input interface (DONE BY PRETI)
//    const db                         - Database connection instance (DONE BY PRETI)
//    const rl                         - Readline interface instance (DONE BY PRETI)
//
// 2. DATABASE CONNECTION & DATA PURGE
//    db.connect()                     - Connect to database and show counts (DONE BY PRETI)
//    Query user count                 - Get current user count (DONE BY PRETI)
//    Query feedback count             - Get current feedback count (DONE BY PRETI)
//    Query audit_logs count           - Get current audit log count (DONE BY PRETI)
//    Query pledge_likes count         - Get current pledge likes count (DONE BY PRETI)
//    Confirmation prompt              - Ask user to confirm deletion (DONE BY PRETI)
//    DELETE pledge_likes              - Delete all pledge likes (DONE BY PRETI)
//    DELETE audit_logs                - Delete all audit log entries (DONE BY PRETI)
//    DELETE feedback                  - Delete all feedback entries (DONE BY PRETI)
//    DELETE users                     - Delete all user entries (DONE BY PRETI)
//    Reset auto-increment             - Reset table auto-increment counters (DONE BY PRETI)

// ============================================================
// SIMULATION_GENERATOR.JS - TABLE OF CONTENTS 
// ============================================================
// 
// 1. IMPORTS & CONFIGURATION
//    require('dotenv')                - Environment variables (DONE BY PRETI)
//    const mysql                      - MySQL database library (DONE BY PRETI)
//    const crypto                     - Cryptography for email encryption (DONE BY PRETI)
//    const fs                         - File system operations (DONE BY PRETI)
//    const path                       - Path utilities (DONE BY PRETI)
//    const PNG                        - PNG image generation (pngjs) (DONE BY PRETI)
//    const ENCRYPTION_KEY             - AES-256 encryption key (DONE BY PRETI)
//    const ENCRYPTION_ALGORITHM       - Encryption algorithm (aes-256-gcm) (DONE BY PRETI)
//    const db                         - Database connection instance (DONE BY PRETI)
//
// 2. ENCRYPTION FUNCTION
//    function encryptEmail()          - Encrypt email using AES-256-GCM (DONE BY PRETI)
//
// 3. IMAGE GENERATION FUNCTION
//    function createBlankPNG()        - Create blank PNG file with text overlay (DONE BY PRETI)
//
// 4. TEST DATA ARRAYS
//    const firstNames                 - Array of first names for generation (DONE BY PRETI)
//    const lastNames                  - Array of last names for generation (DONE BY PRETI)
//    const pledges                    - Array of sample pledge texts (DONE BY PRETI)
//    const dataRetentions             - Retention period options (DONE BY PRETI)
//    const learnings                  - Array of "what did you learn" responses (DONE BY PRETI)
//    const topics                     - Array of topic interests (DONE BY PRETI)
//    const overlayThemes              - Array of overlay theme names (DONE BY PRETI)
//
// 5. HELPER FUNCTIONS
//    function randomElement()         - Get random element from array (DONE BY PRETI)
//    function randomName()            - Generate random full name (DONE BY PRETI)
//    function randomEmail()           - Generate random email address (DONE BY PRETI)
//    function randomDate()            - Generate random date in range (DONE BY PRETI)
//    function getArchiveStatus()      - Calculate archive status based on date (DONE BY PRETI)
//    function getQuestionIds()        - Fetch question IDs from database (DONE BY PRETI)
//    function ensureDirectories()     - Create uploads directories if needed (DONE BY PRETI)
//
// 6. MAIN GENERATION FUNCTION
//    async function generateTestData() - Generate 500 test feedback entries with images (DONE BY PRETI)
//
// 7. SCRIPT EXECUTION
//    generateTestData()               - Execute test data generation (DONE BY PRETI)
//