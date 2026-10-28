// WHOLE FILE DONE BY PRETI

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
// 
// ============================================================
// DESCRIPTION:
// Diagnostic utility to check admin users in the database.
// Verifies password hashes, user status, and tests login queries.
// 
// USAGE: node check_database.js
// OUTPUT: Displays all admin users with hash validation
// ============================================================

// ==================== 1. IMPORTS & CONFIGURATION ====================

// MySQL database library for database operations
const mysql = require('mysql2');

// Database connection configuration
const DB_CONFIG = {
    host: 'localhost',
    user: 'kiosk_user',
    password: 'kiosk123',
    database: 'dp_kiosk_db'
};

console.log('=================================');
console.log('Database Contents Checker');
console.log('=================================\n');

// MySQL connection instance using configured credentials
const connection = mysql.createConnection(DB_CONFIG);

// ==================== 2. DATABASE CONNECTION & VERIFICATION ====================

// Connect to database and verify admin users
connection.connect((err) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
        process.exit(1);
    }
    
    console.log('✅ Connected to database:', DB_CONFIG.database);
    console.log('-----------------------------------\n');
    
    // Query to retrieve all admin users with relevant details
    const query = `
        SELECT 
            id,
            username,
            full_name,
            role,
            is_active,
            SUBSTRING(password_hash, 1, 20) as hash_preview,
            LENGTH(password_hash) as hash_length,
            created_at,
            last_login
        FROM admin_users
        ORDER BY id
    `;
    
    connection.query(query, (err, results) => {
        if (err) {
            console.error('❌ Query error:', err.message);
            connection.end();
            process.exit(1);
        }
        
        if (results.length === 0) {
            console.log('❌ No admin users found in database!');
            connection.end();
            process.exit(0);
        }
        
        console.log(`Found ${results.length} admin user(s):\n`);
        
        // Display detailed information for each admin user
        results.forEach((user, index) => {
            console.log(`User #${index + 1}:`);
            console.log(`  ID: ${user.id}`);
            console.log(`  Username: ${user.username}`);
            console.log(`  Full Name: ${user.full_name || 'N/A'}`);
            console.log(`  Role: ${user.role}`);
            console.log(`  Active: ${user.is_active ? 'Yes' : 'No'}`);
            console.log(`  Password Hash Preview: ${user.hash_preview}...`);
            console.log(`  Password Hash Length: ${user.hash_length} chars`);
            console.log(`  Created: ${user.created_at}`);
            console.log(`  Last Login: ${user.last_login || 'Never'}`);
            
            // Validate bcrypt hash format
            if (user.hash_preview.startsWith('$2b$') || 
                user.hash_preview.startsWith('$2a$') || 
                user.hash_preview.startsWith('$2y$')) {
                console.log(`  ✅ Hash Format: Valid bcrypt hash`);
            } else {
                console.log(`  ❌ Hash Format: NOT a valid bcrypt hash! (Plain text?)`);
            }
            
            // Warn if user account is inactive
            if (user.is_active === 0) {
                console.log(`  ⚠️  WARNING: User is INACTIVE - cannot login!`);
            }
            
            console.log('');
        });
        
        console.log('-----------------------------------');
        console.log('\nDiagnostic Information:');
        console.log('');
        
        // Test the exact query that auth.js uses for systemadmin
        console.log('Testing auth.js query for "systemadmin":');
        connection.query(
            'SELECT * FROM admin_users WHERE username = ? AND is_active = 1',
            ['systemadmin'],
            (err, testResults) => {
                if (err) {
                    console.log('❌ Query error:', err.message);
                } else if (testResults.length === 0) {
                    console.log('❌ No results returned!');
                    console.log('   Possible reasons:');
                    console.log('   1. Username is not exactly "systemadmin" (case sensitive?)');
                    console.log('   2. User is inactive (is_active = 0)');
                } else {
                    console.log('✅ Query returned a user');
                    console.log('   Username:', testResults[0].username);
                    console.log('   Role:', testResults[0].role);
                    console.log('   Password hash starts with:', testResults[0].password_hash.substring(0, 10));
                }
                
                connection.end();
                console.log('\n✅ Check complete!');
            }
        );
    });
});