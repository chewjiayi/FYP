// WHOLE FILE DONE BY PRETI
// ============================================================
// SIMULATION_GENERATOR.JS - TABLE OF CONTENTS (CTRL+F SEARCHABLE)
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
//    const dataRetentions             - Retention period options (DONE BY PRETI) [MODIFIED]
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
// ============================================================
// Generates 500 random test feedback entries with realistic data,
// blank PNG images (raw + processed), and proper question answers.
// Perfect for testing admin panel cleanup, email, view buttons, and filters.
// 
// USAGE: node Simulation_Generator.js
// REQUIREMENT: Database must be set up first (run Datastore_Assembly.js)
//
// ============================================================
// EXPECTED TEST RESULTS AFTER GENERATION:
// ============================================================
//
// INITIAL STATE (Before Cleanup):
//    Total Entries:     500
//    Active Entries:    ~400 (Groups 1, 3, 4)
//    Archived Entries:  ~100 (Group 2)
//
//   AFTER RUNNING dataRetentionCleanup.js:
//    Deleted Entries:   ~0 (no retention-based deletion, all indefinite)
//    Remaining Active:  ~400 (unchanged)
//    Archived Entries:  ~100 (unchanged)
//    Images Deleted:    ~0
//
// ADVANCED FILTER TESTING:
//    Visit Count Filter:
//       - 1-3 visits:   ~100 entries (Group 1 - expired data)
//       - 4-7 visits:   ~100 entries (Group 2 - archived)
//       - 5-10 visits:  ~100 entries (Group 4 - recent active)
//       - 1-10 visits:  ~200 entries (Group 3 - mixed range)
//
//    Date Range Filter:
//       - Last 7 days:      ~100 entries (Group 4)
//       - 8-14 days ago:    ~100 entries (Group 1 - should be deleted)
//       - 1-3 months ago:   ~200 entries (Group 3)
//       - 6-12 months ago:  ~100 entries (Group 2 - archived)
//
//    User Name Filter:
//       - "preti test":     50 entries (distributed across all groups)
//       - Random names:     450 entries
//
// ============================================================

// ==================== 1. IMPORTS & CONFIGURATION ====================

// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

// MySQL database library for database operations
const mysql = require('mysql2');

// Cryptography module for email encryption
const crypto = require('crypto');

// File system operations for creating image files
const fs = require('fs');

// Path utilities for file path management
const path = require('path');

// PNG image generation library
const { PNG } = require('pngjs');

// AES-256 encryption key from environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Encryption algorithm for email encryption
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

// Check encryption key validity
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    console.log('❌ ERROR: ENCRYPTION_KEY not found or invalid in .env file!');
    console.log('   Please make sure your .env has:');
    console.log('   ENCRYPTION_KEY=73b7a3917d846546457cbd72ba22c2f9ab5668dd42d954843f713d778c85ce8d');
    process.exit(1);
}

// Database connection instance using MySQL
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'kiosk_user',
    password: process.env.DB_PASSWORD || 'kiosk123',
    database: process.env.DB_NAME || 'dp_kiosk_db'
});

// ==================== 2. ENCRYPTION FUNCTION ====================

// Encrypt email using AES-256-GCM algorithm
function encryptEmail(email) {
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    
    let encrypted = cipher.update(email, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

// ==================== 3. IMAGE GENERATION FUNCTION ====================

// Create blank PNG file with text overlay
function createBlankPNG(width, height, text, outputPath) {
    const png = new PNG({ width, height });
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (width * y + x) << 2;
            png.data[idx] = 240;
            png.data[idx + 1] = 240;
            png.data[idx + 2] = 240;
            png.data[idx + 3] = 255;
        }
    }
    
    const buffer = PNG.sync.write(png);
    fs.writeFileSync(outputPath, buffer);
}

// ==================== 4. TEST DATA ARRAYS ====================

// Array of first names for random user generation
const firstNames = ['John', 'Emma', 'Michael', 'Sophia', 'James', 'Olivia', 'Robert', 'Ava', 
                    'William', 'Isabella', 'David', 'Mia', 'Richard', 'Charlotte', 'Joseph', 
                    'Amelia', 'Thomas', 'Harper', 'Charles', 'Evelyn'];

// Array of last names for random user generation
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 
                   'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 
                   'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

// Array of sample pledge texts
const pledges = [
    'I pledge to reduce my energy consumption',
    'I will use sustainable products',
    'I commit to recycling daily',
    'I promise to conserve water',
    'I will reduce my carbon footprint'
];

// Retention period options for data retention (now only indefinite)
const dataRetentions = ['indefinite'];

// Array of sample learning responses
const learnings = [
    'I learned about energy conservation',
    'I discovered sustainable practices',
    'I understood the importance of recycling',
    'I learned about environmental protection',
    'I discovered ways to reduce waste'
];

// Array of topic interests for selection questions
const topics = ['Energy', 'Sustainability', 'Recycling', 'Conservation', 'Climate'];

// Array of overlay theme names for processed images
const overlayThemes = ['Nature', 'Ocean', 'Energy', 'Recycle', 'Tech', 'Cute'];

// ==================== 5. HELPER FUNCTIONS ====================

// Get random element from array
function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Generate random full name
function randomName() {
    return `${randomElement(firstNames)} ${randomElement(lastNames)}`;
}

// Generate random email address
function randomEmail(name) {
    const domain = ['gmail.com', 'yahoo.com', 'outlook.com', 'email.com'][Math.floor(Math.random() * 4)];
    return `${name.toLowerCase().replace(' ', '.')}@${domain}`;
}

// Generate random date within specified range
function randomDate(daysAgo) {
    const now = new Date();
    const randomDays = Math.floor(Math.random() * daysAgo);
    const date = new Date(now.getTime() - randomDays * 24 * 60 * 60 * 1000);
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

// Calculate archive status based on submission date
function getArchiveStatus(submissionDate) {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const submittedDate = new Date(submissionDate);
    return submittedDate < threeMonthsAgo ? 'archived' : 'not_archived';
}

// Fetch question IDs from database
function getQuestionIds(callback) {
    db.query('SELECT id FROM questions ORDER BY id', (err, results) => {
        if (err) {
            console.log('❌ Failed to get question IDs:', err.message);
            callback(err, null);
        } else {
            callback(null, results.map(r => r.id));
        }
    });
}

// Create uploads directories if they don't exist
function ensureDirectories() {
    const photosDir = path.join(__dirname, '..', '..', 'uploads', 'photos');
    const processedDir = path.join(__dirname, '..', '..', 'uploads', 'processed');
    
    if (!fs.existsSync(photosDir)) {
        fs.mkdirSync(photosDir, { recursive: true });
        console.log('✅ Created /uploads/photos directory');
    } else {
        console.log('✅ Using existing /uploads/photos directory');
    }
    
    if (!fs.existsSync(processedDir)) {
        fs.mkdirSync(processedDir, { recursive: true });
        console.log('✅ Created /uploads/processed directory');
    } else {
        console.log('✅ Using existing /uploads/processed directory');
    }
}

// ==================== 6. MAIN GENERATION FUNCTION ====================

// Generate 500 test feedback entries with realistic data and images
async function generateTestData() {
    console.log('='.repeat(60));
    console.log('TEST DATA GENERATOR - 500 Entries with Images');
    console.log('='.repeat(60));
    console.log('');
    
    ensureDirectories();
    
    console.log('📊 Data Distribution Plan:');
    console.log('');
    console.log('   GROUP 1 (~80 entries): 8-14 days old, indefinite retention');
    console.log('   → Will NOT be deleted (retention is indefinite)');
    console.log('   → Visit count: 1-3 (testing low visit filter)');
    console.log('');
    console.log('   GROUP 2 (~80 entries): 6-12 months old, indefinite retention');
    console.log('   → Already ARCHIVED (>3 months)');
    console.log('   → Visit count: 4-7 (testing mid visit filter)');
    console.log('');
    console.log('   GROUP 3 (~80 entries): 1-3 YEARS old, indefinite retention');
    console.log('   → ARCHIVED - OLD DATA FOR DELETION TESTING');
    console.log('   → Visit count: 2-6 (testing date-based bulk deletion)');
    console.log('');
    console.log('   GROUP 4 (~160 entries): 1-3 months old, indefinite retention');
    console.log('   → ACTIVE but nearing archive threshold');
    console.log('   → Visit count: 1-10 (testing full range filter)');
    console.log('');
    console.log('   GROUP 5 (~100 entries): <7 days old, indefinite retention');
    console.log('   → Fresh ACTIVE data, should remain untouched');
    console.log('   → Visit count: 5-10 (testing high visit filter)');
    console.log('');
    console.log('Special: 50 users named "preti test" (10% of total)');
    console.log('         Distributed across all groups for name filter testing');
    console.log('');
    
    db.connect((err) => {
        if (err) {
            console.log('❌ Database connection failed:', err.message);
            process.exit(1);
        }
        
        console.log('✅ Connected to database');
        console.log('🔄 Generating test data...\n');
        
        getQuestionIds((err, questionIds) => {
            if (err) {
                db.end();
                process.exit(1);
            }
            
            if (questionIds.length === 0) {
                console.log('❌ No questions found! Run Datastore_Assembly.js first.');
                db.end();
                process.exit(1);
            }
            
            console.log(`✅ Found ${questionIds.length} questions\n`);
            
            let usersCreated = 0;
            let feedbackCreated = 0;
            let answersCreated = 0;
            let imagesCreated = 0;
            let archivedCount = 0;
            let activeCount = 0;
            let completionReported = false;
            
            const visitCountDistribution = {
                '1-3': 0,
                '4-7': 0,
                '8-10': 0
            };
            
            const totalToCreate = 500;
            
            for (let i = 1; i <= totalToCreate; i++) {
                let name, email, submittedDate, dataRetention, visitCount;
                
                // GROUP 1: 8-14 days old, indefinite retention
                if (i <= 80) {
                    name = (i % 10 === 0) ? `preti test${i}` : randomName();
                    email = (i % 10 === 0) ? `preti.test${i}@test.com` : randomEmail(name);
                    submittedDate = new Date(Date.now() - (8 + Math.floor(Math.random() * 7)) * 24 * 60 * 60 * 1000)
                        .toISOString().slice(0, 19).replace('T', ' ');
                    dataRetention = 'indefinite';
                    visitCount = 1 + Math.floor(Math.random() * 3);
                    visitCountDistribution['1-3']++;
                    
                // GROUP 2: 6-12 months old, already archived
                } else if (i <= 160) {
                    name = (i % 10 === 0) ? `preti test${i}` : randomName();
                    email = (i % 10 === 0) ? `preti.test${i}@test.com` : randomEmail(name);
                    const monthsAgo = 6 + Math.floor(Math.random() * 7);
                    submittedDate = new Date(Date.now() - monthsAgo * 30 * 24 * 60 * 60 * 1000)
                        .toISOString().slice(0, 19).replace('T', ' ');
                    dataRetention = 'indefinite';
                    visitCount = 4 + Math.floor(Math.random() * 4);
                    visitCountDistribution['4-7']++;
                    
                // GROUP 3: 1-3 YEARS old, archived (FOR DELETION TESTING)
                } else if (i <= 240) {
                    name = (i % 10 === 0) ? `preti test${i}` : randomName();
                    email = (i % 10 === 0) ? `preti.test${i}@test.com` : randomEmail(name);
                    // Generate dates 1-3 years in the past
                    const yearsAgo = 1 + Math.floor(Math.random() * 2.5); // 1.0 to 3.5 years
                    submittedDate = new Date(Date.now() - yearsAgo * 365 * 24 * 60 * 60 * 1000)
                        .toISOString().slice(0, 19).replace('T', ' ');
                    dataRetention = 'indefinite';
                    visitCount = 2 + Math.floor(Math.random() * 5);
                    visitCountDistribution['1-3']++;
                    
                // GROUP 4: 1-3 months old, indefinite retention
                } else if (i <= 400) {
                    name = (i % 10 === 0) ? `preti test${i}` : randomName();
                    email = (i % 10 === 0) ? `preti.test${i}@test.com` : randomEmail(name);
                    const monthsAgo = 1 + Math.floor(Math.random() * 3);
                    submittedDate = new Date(Date.now() - monthsAgo * 30 * 24 * 60 * 60 * 1000)
                        .toISOString().slice(0, 19).replace('T', ' ');
                    dataRetention = 'indefinite';
                    visitCount = 1 + Math.floor(Math.random() * 10);
                    if (visitCount <= 7) {
                        visitCountDistribution['4-7']++;
                    } else {
                        visitCountDistribution['8-10']++;
                    }
                    
                // GROUP 5: <7 days old, fresh data
                } else {
                    name = (i % 10 === 0) ? `preti test${i}` : randomName();
                    email = (i % 10 === 0) ? `preti.test${i}@test.com` : randomEmail(name);
                    submittedDate = new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000)
                        .toISOString().slice(0, 19).replace('T', ' ');
                    dataRetention = 'indefinite';
                    visitCount = 5 + Math.floor(Math.random() * 6);
                    visitCountDistribution['8-10']++;
                }
                
                const encryptedEmail = encryptEmail(email);
                
                const rawPhotoFilename = `${name.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}_${i}.png`;
                const overlayTheme = randomElement(overlayThemes);
                const processedPhotoFilename = `${name.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}_${i}_${overlayTheme}_Theme.png`;
                
                const rawPhotoPath = path.join(__dirname, '..', '..', 'uploads', 'photos', rawPhotoFilename);
                const processedPhotoPath = path.join(__dirname, '..', '..', 'uploads', 'processed', processedPhotoFilename);
                
                createBlankPNG(400, 300, `Test Photo ${i}`, rawPhotoPath);
                createBlankPNG(400, 300, `${overlayTheme} Overlay`, processedPhotoPath);
                imagesCreated += 2;
                
                const userQuery = `
                    INSERT INTO users (name, email_encrypted, visit_count, created_at, last_visit) 
                    VALUES (?, ?, ?, ?, ?)
                `;
                
                db.query(
                    userQuery,
                    [name, encryptedEmail, visitCount, submittedDate, submittedDate],
                    (err, userResult) => {
                        if (err) {
                            console.log(`❌ Failed to create user ${i}:`, err.message);
                            return;
                        }
                        
                        usersCreated++;
                        const userId = userResult.insertId;
                        
                        const archiveStatus = getArchiveStatus(submittedDate);
                        if (archiveStatus === 'archived') {
                            archivedCount++;
                        } else {
                            activeCount++;
                        }
                        
                        const feedbackQuery = `
                            INSERT INTO feedback (
                                user_id, 
                                comment, 
                                photo_path, 
                                processed_photo_path, 
                                data_retention,
                                created_at,
                                archive_status
                            ) VALUES (?, ?, ?, ?, ?, ?, ?)
                        `;
                        
                        db.query(
                            feedbackQuery,
                            [
                                userId,
                                randomElement(pledges),
                                rawPhotoFilename,
                                processedPhotoFilename,
                                dataRetention,
                                submittedDate,
                                archiveStatus
                            ],
                            (err, feedbackResult) => {
                                if (err) {
                                    console.log(`❌ Failed to create feedback ${i}:`, err.message);
                                    return;
                                }
                                
                                feedbackCreated++;
                                const feedbackId = feedbackResult.insertId;
                                
                                let questionsAnswered = 0;
                                const questions = [
                                    { id: questionIds[0], answer: String(3 + Math.floor(Math.random() * 3)) },
                                    { id: questionIds[1], answer: randomElement(learnings) },
                                    { id: questionIds[2], answer: randomElement(topics) }
                                ];
                                
                                for (const q of questions) {
                                    const answerQuery = `
                                        INSERT INTO feedback_answers (feedback_id, question_id, answer_value) 
                                        VALUES (?, ?, ?)
                                    `;
                                    
                                    db.query(
                                        answerQuery,
                                        [feedbackId, q.id, q.answer],
                                        (err, result) => {
                                            if (err) {
                                                console.log(`❌ Failed to create answer for feedback ${i}:`, err.message);
                                            } else {
                                                answersCreated++;
                                            }
                                            
                                            questionsAnswered++;
                                            
                                            if (questionsAnswered === questions.length) {
                                                if (feedbackCreated % 50 === 0) {
                                                    console.log(`   Progress: ${feedbackCreated}/${totalToCreate} entries created...`);
                                                }
                                                
                                                if (feedbackCreated === totalToCreate && !completionReported) {
                                                    completionReported = true;
                                                    console.log('');
                                                    console.log('='.repeat(60));
                                                    console.log('✅ TEST DATA GENERATION COMPLETE!');
                                                    console.log('='.repeat(60));
                                                    console.log('');
                                                    console.log('📊 Summary:');
                                                    console.log(`   Users created:        ${usersCreated} (50 'preti test' users)`);
                                                    console.log(`   Feedback created:     ${feedbackCreated}`);
                                                    console.log(`   Answers created:      ${answersCreated}`);
                                                    console.log(`   Images created:       ${imagesCreated} (${imagesCreated / 2} raw + ${imagesCreated / 2} processed)`);
                                                    console.log(`   Emails encrypted:     ${feedbackCreated}`);
                                                    console.log('');
                                                    console.log('📦 Archive Status Breakdown:');
                                                    console.log(`   Archived (>3 months): ${archivedCount} entries`);
                                                    console.log(`   Active (<3 months):   ${activeCount} entries`);
                                                    console.log('');
                                                    console.log('🔍 Visit Count Distribution (For Advanced Filter Testing):');
                                                    console.log(`   1-3 visits:           ${visitCountDistribution['1-3']} entries`);
                                                    console.log(`   4-7 visits:           ${visitCountDistribution['4-7']} entries`);
                                                    console.log(`   8-10 visits:          ${visitCountDistribution['8-10']} entries`);
                                                    console.log('');
                                                    console.log('📅 Date Range Distribution (For Date Filter Testing):');
                                                    console.log('   Last 7 days:          ~100 entries (GROUP 4 - Fresh)');
                                                    console.log('   8-14 days ago:        ~100 entries (GROUP 1 - older but indefinite)');
                                                    console.log('   1-3 months ago:       ~200 entries (GROUP 3 - Active)');
                                                    console.log('   6-12 months ago:      ~100 entries (GROUP 2 - Archived)');
                                                    console.log('');
                                                    console.log('✂️  Cleanup Testing Data:');
                                                    console.log('   All entries have indefinite retention.');
                                                    console.log('   → No entries will be deleted by dataRetentionCleanup.js for retention reasons.');
                                                    console.log('   → Archival status is based on age (>3 months).');
                                                    console.log(`   Archived (>3 months): ${archivedCount} entries (GROUP 2)`);
                                                    console.log('   → Check Archive tab in admin panel.');
                                                    console.log(`   Fresh (<7 days):      ~100 entries (GROUP 5)`);
                                                    console.log('   → Should remain UNTOUCHED.');
                                                    console.log('');
                                                    console.log('✅ Expected Results After Cleanup:');
                                                    console.log(`   Before: ${activeCount} Active + ${archivedCount} Archived = ${feedbackCreated} Total`);
                                                    console.log(`   After:  ${activeCount} Active + ${archivedCount} Archived = ${feedbackCreated} Total (no deletion)`);
                                                    console.log('');
                                                    console.log('📋 Question Answers:');
                                                    console.log('   Question 1 (Rating):  3-5 stars');
                                                    console.log('   Question 2 (Text):    Learning responses');
                                                    console.log('   Question 3 (Choice):  Topic selections');
                                                    console.log('   Note: Some optional questions left blank');
                                                    console.log('');
                                                    console.log('🖼️  Image Details:');
                                                    console.log('   Raw photos:           /uploads/photos/');
                                                    console.log('   Processed photos:     /uploads/processed/');
                                                    console.log('   Filename format:      submitter_name_timestamp.png');
                                                    console.log('   Example raw:          preti_test1_1734284567001.png');
                                                    console.log('   Example processed:    preti_test1_1734284567001_Nature_Theme.png');
                                                    console.log('   Overlay themes:       Nature, Ocean, Energy, Recycle, Tech, Cute');
                                                    console.log('   Format:               400x300 blank PNG files');
                                                    console.log('');
                                                    console.log('🎯 Testing Checklist:');
                                                    console.log('');
                                                    console.log('   1. INITIAL CHECK:');
                                                    console.log('      • Open admin panel → Feedback Data');
                                                    console.log(`      • Active tab should show: ~${activeCount} entries`);
                                                    console.log(`      • Archive tab should show: ~${archivedCount} entries`);
                                                    console.log('');
                                                    console.log('   2. TEST ADVANCED FILTERS:');
                                                    console.log('      • Filter by visit count (1-3, 4-7, 8-10)');
                                                    console.log('      • Filter by date range (last 7 days, 8-14 days, etc.)');
                                                    console.log('      • Search for "preti test" (should find 50 users)');
                                                    console.log('      • Filter by data retention (only indefinite now)');
                                                    console.log('');
                                                    console.log('   3. TEST CLEANUP SCRIPT:');
                                                    console.log('      • Run: node dataRetentionCleanup.js');
                                                    console.log('      • Should delete NO entries (all indefinite)');
                                                    console.log(`      • Active tab after: ~${activeCount} entries (unchanged)`);
                                                    console.log(`      • Archive tab after: ~${archivedCount} entries (unchanged)`);
                                                    console.log('');
                                                    console.log('   4. TEST VIEW/EMAIL BUTTONS:');
                                                    console.log('      • Click VIEW to see raw/processed images');
                                                    console.log('      • Click EMAIL to test sending with attachments');
                                                    console.log('      • Verify image paths in processed filenames');
                                                    console.log('');
                                                    
                                                    db.end();
                                                }
                                            }
                                        }
                                    );
                                }
                            }
                        );
                    }
                );
            }
        });
    });
}

// ==================== 7. SCRIPT EXECUTION ====================

console.log('🔑 Encryption Key Check:');
console.log(`   Loaded: ${ENCRYPTION_KEY ? 'YES ✅' : 'NO ❌'}`);
console.log(`   Length: ${ENCRYPTION_KEY ? ENCRYPTION_KEY.length : 'N/A'} characters`);
console.log('');

if (ENCRYPTION_KEY && ENCRYPTION_KEY.length === 64) {
    // Execute test data generation
    generateTestData();
} else {
    console.log('❌ Invalid encryption key. Please check your .env file.');
    process.exit(1);
}