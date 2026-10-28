// WHOLE FILE DONE BY PRETI

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
// DESCRIPTION:
// This script initializes database security by hashing passwords
// and encrypting emails. Run ONCE after initial database setup.
// 
// USAGE: node AuthLayer_Reconstitution.js
// WARNING: Backup database before running!
// ============================================================

// ==================== 1. IMPORTS & CONFIGURATION ====================

// MySQL2 promise library for async database operations
const mysql = require('mysql2/promise');

// Password hashing library using bcrypt algorithm
const bcrypt = require('bcrypt');

// Node.js crypto module for email encryption
const crypto = require('crypto');

// Database connection configuration
const DB_CONFIG = {
    host: 'localhost',
    user: 'kiosk_user',
    password: 'kiosk123',
    database: 'dp_kiosk_db'
};

// AES-256 encryption key for email encryption (must match .env file)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key-here-change-this!!';

console.log('📄 Starting database migration...\n');

// ==================== 2. HELPER FUNCTIONS ====================

// Hash password using bcrypt with 12 salt rounds
async function hashPassword(plainPassword) {
    const saltRounds = 12;
    return await bcrypt.hash(plainPassword, saltRounds);
}

// Encrypt email using AES-256-GCM algorithm
function encryptEmail(email) {
    try {
        const algorithm = 'aes-256-gcm';
        const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf-8');
        const iv = crypto.randomBytes(16);
        
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(email, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
        console.error('❌ Encryption error:', error);
        throw error;
    }
}

// ==================== 3. PASSWORD MIGRATION ====================

// Hash plain-text passwords in admin_users table
async function migratePasswords(connection) {
    console.log('📋 Step 1: Migrating admin passwords...');
    
    try {
        // Retrieve all admin users from database
        const [users] = await connection.query('SELECT id, username, password_hash FROM admin_users');
        
        if (!users || users.length === 0) {
            console.log('⚠️  No users found in database');
            return;
        }
        
        console.log(`Found ${users.length} admin users to check`);
        
        let migrated = 0;
        let alreadyHashed = 0;
        let errors = 0;
        
        for (const user of users) {
            // Check if password is already hashed (bcrypt hashes start with $2b$ or $2a$)
            if (user.password_hash && (user.password_hash.startsWith('$2b$') || user.password_hash.startsWith('$2a$'))) {
                console.log(`✅ User '${user.username}' already has hashed password`);
                alreadyHashed++;
                continue;
            }
            
            console.log(`🔄 Hashing password for user: ${user.username}`);
            
            try {
                // Hash the plain text password using bcrypt
                const hashedPassword = await hashPassword(user.password_hash);
                
                // Update database with hashed password
                await connection.query(
                    'UPDATE admin_users SET password_hash = ? WHERE id = ?',
                    [hashedPassword, user.id]
                );
                
                console.log(`✅ Updated '${user.username}'`);
                migrated++;
            } catch (error) {
                console.error(`❌ Error processing '${user.username}':`, error.message);
                errors++;
            }
        }
        
        console.log('\n📊 Password Migration Summary:');
        console.log(`   ✅ Already hashed: ${alreadyHashed}`);
        console.log(`   🔄 Newly migrated: ${migrated}`);
        console.log(`   ❌ Errors: ${errors}`);
        console.log('');
        
        if (migrated > 0) {
            console.log('⚠️  IMPORTANT: Users must now login with their ORIGINAL passwords');
            console.log('   Example: If password was "SystemAdmin123!", login with "SystemAdmin123!"');
        }
    } catch (error) {
        console.error('❌ Error in password migration:', error);
        throw error;
    }
}

// ==================== 4. EMAIL MIGRATION ====================

// Encrypt plain-text emails in users table
async function migrateEmails(connection) {
    console.log('📋 Step 2: Migrating user emails...');
    
    try {
        // Check if email column exists in users table
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = '${DB_CONFIG.database}' 
            AND TABLE_NAME = 'users'
        `);
        
        const hasEmailColumn = columns.some(col => col.COLUMN_NAME === 'email');
        const hasEmailEncryptedColumn = columns.some(col => col.COLUMN_NAME === 'email_encrypted');
        
        if (!hasEmailEncryptedColumn) {
            console.log('⚠️  email_encrypted column not found - skipping email migration');
            return;
        }
        
        // Get all users with emails
        let query = 'SELECT id, email_encrypted FROM users WHERE email_encrypted IS NOT NULL';
        if (hasEmailColumn) {
            query = 'SELECT id, email, email_encrypted FROM users WHERE email IS NOT NULL OR email_encrypted IS NOT NULL';
        }
        
        const [users] = await connection.query(query);
        
        if (!users || users.length === 0) {
            console.log('⚠️  No users with emails found');
            return;
        }
        
        console.log(`Found ${users.length} users with emails to check`);
        
        let migrated = 0;
        let alreadyEncrypted = 0;
        let noEmail = 0;
        let errors = 0;
        
        for (const user of users) {
            // Check if email is already encrypted (encrypted emails contain colons for iv:authTag:data)
            if (user.email_encrypted && user.email_encrypted.includes(':')) {
                console.log(`✅ User ${user.id} email already encrypted`);
                alreadyEncrypted++;
                continue;
            }
            
            // Determine which email to encrypt
            const emailToEncrypt = hasEmailColumn ? (user.email || user.email_encrypted) : user.email_encrypted;
            
            if (!emailToEncrypt || emailToEncrypt.trim() === '') {
                console.log(`⚠️  User ${user.id} has no email to encrypt`);
                noEmail++;
                continue;
            }
            
            console.log(`🔄 Encrypting email for user ${user.id}`);
            
            try {
                // Encrypt the email using AES-256-GCM
                const encryptedEmail = encryptEmail(emailToEncrypt);
                
                // Update database with encrypted email
                if (hasEmailColumn) {
                    await connection.query(
                        'UPDATE users SET email = NULL, email_encrypted = ? WHERE id = ?',
                        [encryptedEmail, user.id]
                    );
                } else {
                    await connection.query(
                        'UPDATE users SET email_encrypted = ? WHERE id = ?',
                        [encryptedEmail, user.id]
                    );
                }
                
                console.log(`✅ Encrypted email for user ${user.id}`);
                migrated++;
            } catch (error) {
                console.error(`❌ Error encrypting email for user ${user.id}:`, error.message);
                errors++;
            }
        }
        
        console.log('\n📊 Email Migration Summary:');
        console.log(`   ✅ Already encrypted: ${alreadyEncrypted}`);
        console.log(`   🔄 Newly encrypted: ${migrated}`);
        console.log(`   ⚠️  No email to encrypt: ${noEmail}`);
        console.log(`   ❌ Errors: ${errors}`);
        console.log('');
    } catch (error) {
        console.error('❌ Error in email migration:', error);
        throw error;
    }
}

// ==================== 5. MAIN EXECUTION ====================

// Execute complete migration process
async function runMigration() {
    let connection;
    
    try {
        console.log('🔗 Connecting to MySQL database...');
        connection = await mysql.createConnection(DB_CONFIG);
        console.log('✅ Connected successfully!\n');
        
        await migratePasswords(connection);
        await migrateEmails(connection);
        
        console.log('✅ Migration complete!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Test admin login with original passwords');
        console.log('   • Username: systemadmin');
        console.log('   • Password: SystemAdmin123!');
        console.log('2. Verify encrypted emails can be decrypted');
        console.log('3. Check that new users are created with hashed passwords');
        console.log('4. Monitor logs for any authentication issues');
        console.log('');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('🔴 Access Denied - Check database credentials in DB_CONFIG');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('🔴 MySQL Server not running');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.error('🔴 Database does not exist - Run setup.js first');
        }
        
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔗 Database connection closed');
        }
    }
}

// Script entry point - run the migration
runMigration();