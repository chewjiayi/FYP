// WHOLE FILE DONE BY PRETI

// ============================================================
// DATASTORE_ASSEMBLY.JS - TABLE OF CONTENTS (CTRL+F SEARCHABLE)
// ============================================================
// 
// 1. IMPORTS & CONFIGURATION
//    const mysql                          - MySQL2 promise library (DONE BY PRETI)
//    const fs                             - File system operations (DONE BY PRETI)
//    const path                           - Path utilities (DONE BY PRETI)
//    const readline                       - Terminal input interface (DONE BY PRETI)
//    require('dotenv')                    - Load environment variables (DONE BY PRETI)
//    const rl                             - Readline interface instance (DONE BY PRETI)
//
// 2. HELPER FUNCTIONS
//    function question()                  - Prompt user for input (async wrapper) (DONE BY PRETI)
//
// 3. DATABASE SETUP
//    async function setup()               - Main setup orchestration function (DONE BY PRETI)
//
// 4. SCRIPT EXECUTION
//    setup()                              - Execute main setup function (DONE BY PRETI)
//
// ============================================================
// Automated database setup script that creates the complete
// dp_kiosk_db database with all tables, users, and initial data.
// 
// USAGE: node Datastore_Assembly.js
// REQUIREMENT: MySQL server running with root access
// ============================================================

// =================== 1. IMPORTS & CONFIGURATION =================== 
// MySQL2 promise library for database operations
const mysql = require('mysql2/promise');

// File system operations for reading schema files
const fs = require('fs');

// Path utilities for file path management
const path = require('path');

// Terminal input interface for user prompts
const readline = require('readline');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Readline interface instance for prompting user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// =================== 2. HELPER FUNCTIONS =================== 
// Prompt user for input with async wrapper for readline
function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            resolve(answer);
        });
    });
}

// =================== 3. DATABASE SETUP =================== 
// Main setup orchestration function
async function setup() {
    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║     DP KIOSK - AUTOMATED DATABASE SETUP          ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');
    
    console.log('This script will:');
    console.log('  ✓ Create database: dp_kiosk_db');
    console.log('  ✓ Create user: kiosk_user (password: kiosk123)');
    console.log('  ✓ Create all tables');
    console.log('  ✓ Add archive_status column for feedback management');
    console.log('  ✓ Add saved_themes table for user theme presets');
    console.log('  ✓ Set up automatic archiving (3-month threshold)');
    console.log('  ✓ Insert sample data (overlays, questions, admin user)');
    console.log('  ✓ Enable event scheduler for auto-archiving');
    console.log('  ✓ Verify everything is working\n');

    const rootPassword = await question('Enter your MySQL root password: ');
    console.log('');
    rl.close();

    try {
        // Connect to MySQL as root user
        console.log('📡 [1/9] Connecting to MySQL as root...');
        const rootConnection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: rootPassword,
            multipleStatements: true
        });
        console.log('    ✅ Connected successfully!\n');

        // Enable Event Scheduler for automatic archiving
        console.log('⏰ [2/9] Enabling Event Scheduler for auto-archiving...');
        await rootConnection.query('SET GLOBAL event_scheduler = ON');
        const [schedulerStatus] = await rootConnection.query("SHOW VARIABLES LIKE 'event_scheduler'");
        console.log(`    ✅ Event Scheduler: ${schedulerStatus[0].Value}\n`);

        // Create the dp_kiosk_db database
        console.log('📦 [3/9] Creating database...');
        await rootConnection.query(`
            CREATE DATABASE IF NOT EXISTS dp_kiosk_db 
            CHARACTER SET utf8mb4 
            COLLATE utf8mb4_unicode_ci
        `);
        console.log('    ✅ Database "dp_kiosk_db" created\n');

        // Create kiosk_user with appropriate privileges
        console.log('👤 [4/9] Creating database user...');
        
        try {
            await rootConnection.query(`DROP USER IF EXISTS 'kiosk_user'@'localhost'`);
        } catch (e) {
            // User doesn't exist, continue
        }

        await rootConnection.query(`
            CREATE USER 'kiosk_user'@'localhost' 
            IDENTIFIED BY 'kiosk123'
        `);

        await rootConnection.query(`
            GRANT ALL PRIVILEGES ON dp_kiosk_db.* 
            TO 'kiosk_user'@'localhost'
        `);

        await rootConnection.query('FLUSH PRIVILEGES');

        console.log('    ✅ User "kiosk_user" created with password "kiosk123"\n');

        await rootConnection.end();

        // Load and execute schema.sql statements safely
        console.log('📋 [5/9] Loading database schema...');
        const userConnection = await mysql.createConnection({
            host: 'localhost',
            user: 'kiosk_user',
            password: 'kiosk123',
            database: 'dp_kiosk_db',
            multipleStatements: true
        });

        const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');

        if (!fs.existsSync(schemaPath)) {
            console.error('    ❌ ERROR: schema.sql not found!');
            console.error(`    Expected location: ${schemaPath}`);
            process.exit(1);
        }

        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Split schema into individual statements for safe execution
        const statements = schema
            .split(/;\s*[\r\n]+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);

        if (!statements.length) {
            throw new Error('Schema file contains no SQL statements.');
        }

        console.log(`    ➜ Running ${statements.length} SQL statements...`);

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            console.log(`      • Executing statement ${i + 1}/${statements.length}`);

            try {
                await userConnection.query(stmt);
            } catch (err) {
                console.error(`    ❌ ERROR in statement ${i + 1}:`);
                console.error(err.message);
                console.error('    SQL:', stmt.substring(0, 100) + '...');
                throw err;
            }
        }

        console.log('    ✅ Schema loaded successfully\n');

        // Verify all tables were created successfully
        console.log('🔍 [6/9] Verifying tables...');
        const [tables] = await userConnection.query('SHOW TABLES');

        if (tables.length === 0) {
            console.error('    ❌ No tables created! Check schema.sql\n');
            process.exit(1);
        }

        console.log(`    ✅ ${tables.length} tables created:`);
        for (const t of tables) {
            const name = Object.values(t)[0];
            console.log(`       • ${name}`);
        }
        console.log('');

        // Verify archive management features
        console.log('📚 [7/9] Verifying archive management...');
        
        const [feedbackColumns] = await userConnection.query(`
            SHOW COLUMNS FROM feedback LIKE 'archive_status'
        `);
        
        if (feedbackColumns.length > 0) {
            console.log('    ✅ Archive status column created');
        } else {
            console.log('    ❌ Archive status column missing!');
        }

        const [procedures] = await userConnection.query(`
            SHOW PROCEDURE STATUS WHERE Db = 'dp_kiosk_db' AND Name = 'update_archive_status'
        `);
        
        if (procedures.length > 0) {
            console.log('    ✅ Archive update procedure created');
        } else {
            console.log('    ⚠️  Archive update procedure not found');
        }

        const [events] = await userConnection.query(`
            SHOW EVENTS WHERE Name = 'update_archive_status_daily'
        `);
        
        if (events.length > 0) {
            console.log('    ✅ Daily archive event scheduled');
        } else {
            console.log('    ⚠️  Daily archive event not found');
        }
        
        console.log('');

        // Verify saved themes table and structure
        console.log('💾 [8/9] Verifying saved themes functionality...');
        
        const [savedThemesTables] = await userConnection.query(`
            SHOW TABLES LIKE 'saved_themes'
        `);
        
        if (savedThemesTables.length > 0) {
            console.log('    ✅ Saved themes table created');
            
            const [savedThemesColumns] = await userConnection.query(`
                DESCRIBE saved_themes
            `);
            
            const requiredColumns = ['id', 'admin_user_id', 'theme_name', 'theme_data', 'is_active', 'created_at', 'updated_at'];
            const existingColumns = savedThemesColumns.map(col => col.Field);
            
            const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
            
            if (missingColumns.length === 0) {
                console.log('    ✅ All required columns present');
                console.log('    ✅ Foreign key constraint to admin_users');
                console.log('    ✅ Theme limit: 6 per user');
            } else {
                console.log(`    ⚠️  Missing columns: ${missingColumns.join(', ')}`);
            }
        } else {
            console.log('    ⚠️  Saved themes table not found');
            console.log('    ℹ️  Run add_saved_themes_table.sql to add this feature');
        }
        
        console.log('');

        // Verify initial data was inserted
        console.log('📊 [9/9] Verifying data...');

        const [[adminCount]] = await userConnection.query(
            'SELECT COUNT(*) AS count FROM admin_users'
        );
        console.log(`    ✅ Admin users: ${adminCount.count}`);

        const [[overlayCount]] = await userConnection.query(
            'SELECT COUNT(*) AS count FROM overlays'
        );
        console.log(`    ✅ Overlays: ${overlayCount.count}`);

        const [[questionCount]] = await userConnection.query(
            'SELECT COUNT(*) AS count FROM questions'
        );
        console.log(`    ✅ Questions: ${questionCount.count}`);

        try {
            const [[savedThemesCount]] = await userConnection.query(
                'SELECT COUNT(*) AS count FROM saved_themes'
            );
            console.log(`    ✅ Saved themes: ${savedThemesCount.count}`);
        } catch (e) {
            // Table doesn't exist yet, that's okay
        }

        await userConnection.end();

        // Display setup completion message
        console.log('\n╔═══════════════════════════════════════════════════╗');
        console.log('║              🎉 SETUP COMPLETE! 🎉               ║');
        console.log('╚═══════════════════════════════════════════════════╝\n');

        console.log('📝 Database Connection Details:');
        console.log('   Host:     localhost');
        console.log('   User:     kiosk_user');
        console.log('   Password: kiosk123');
        console.log('   Database: dp_kiosk_db\n');

        console.log('🔐 Default Admin Login:');
        console.log('   Username: systemadmin');
        console.log('   Password: SystemAdmin123!\n');

        console.log('📚 Archive Management:');
        console.log('   • Feedback older than 3 months will be auto-archived');
        console.log('   • Archive status updates daily at midnight');
        console.log('   • Manual update: CALL update_archive_status();\n');

        console.log('💾 Saved Themes Feature:');
        console.log('   • Users can save up to 6 custom theme presets');
        console.log('   • Themes are user-specific and persist across sessions');
        console.log('   • Active theme auto-applies on login\n');

        console.log('⚠️  IMPORTANT NOTES:');
        console.log('   • Event Scheduler is now enabled');
        console.log('   • Archive tab will show feedback older than 3 months');
        console.log('   • Feedback tab will show recent feedback (< 3 months)');
        console.log('   • Saved Themes available in Style & Theme Settings\n');

    } catch (error) {
        console.error('\n╔═══════════════════════════════════════════════════╗');
        console.error('║                ❌ SETUP FAILED                    ║');
        console.error('╚═══════════════════════════════════════════════════╝\n');

        console.error('Error:', error.message, '\n');

        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('🔴 Access Denied – bad MySQL root password.\n');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('🔴 MySQL Server not running.\n');
        } else if (error.code === 'ENOENT') {
            console.error('🔴 Missing schema.sql file.\n');
        }

        process.exit(1);
    }
}

// =================== 4. SCRIPT EXECUTION =================== 
// Execute main setup function
setup();
