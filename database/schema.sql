-- ============================================================
-- KIOSK DATABASE SCHEMA (MySQL)
-- ============================================================

-- Drop existing tables ( THIS WILL DELETE ALL DATA) (DONE BY PRETI)
DROP TABLE IF EXISTS pledge_likes;
DROP TABLE IF EXISTS saved_themes;
DROP TABLE IF EXISTS feedback_answers;
DROP TABLE IF EXISTS feedback;
-- changes made by nick
DROP TABLE IF EXISTS lost_found_reports;
DROP TABLE IF EXISTS feedback_analysis_cache;
DROP TABLE IF EXISTS question_options;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS admin_users;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS overlays;
DROP TABLE IF EXISTS countdown_management;
DROP TABLE IF EXISTS vip_management;

-- ============================================================
-- USERS TABLE (DONE BY PRETI)
-- ============================================================
-- USERS TABLE
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email_encrypted TEXT,
    visit_count INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_visit TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_last_visit (last_visit)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- FEEDBACK TABLE (DONE BY PRETI)
-- ============================================================
CREATE TABLE feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    comment TEXT,
    metadata TEXT,
    photo_path VARCHAR(500),
    processed_photo_path VARCHAR(500),
    data_retention VARCHAR(20) DEFAULT 'longterm',
    email_sent TINYINT(1) DEFAULT 0,
    email_sent_at TIMESTAMP NULL,
    admin_notes TEXT,
    is_active TINYINT(1) DEFAULT 1,
    archive_status ENUM('not_archived', 'archived') DEFAULT 'not_archived',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_data_retention (data_retention),
    INDEX idx_is_active (is_active),
    INDEX idx_archive_status (archive_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- QUESTIONS TABLE (DONE BY PRETI)
-- ============================================================
CREATE TABLE questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    is_required TINYINT(1) DEFAULT 0,
    display_order INT NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_is_active (is_active),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- QUESTION OPTIONS TABLE (DONE BY PRETI)
-- ============================================================
CREATE TABLE question_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    option_label VARCHAR(255) NOT NULL,
    display_order INT NOT NULL,
    
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    INDEX idx_question_id (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- FEEDBACK ANSWERS TABLE (DONE BY PRETI)
-- ============================================================
CREATE TABLE feedback_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    feedback_id INT NOT NULL,
    question_id INT NOT NULL,
    answer_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    INDEX idx_feedback_id (feedback_id),
    INDEX idx_question_id (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- FEEDBACK ANALYSIS CACHE TABLE (OLLAMA/OFFLINE ANALYSIS CACHE) - Done By Yu Kang
-- ============================================================
CREATE TABLE feedback_analysis_cache (
    cache_key VARCHAR(255) PRIMARY KEY,
    analysis_mode VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    normalized_text TEXT NOT NULL,
    source_text TEXT NOT NULL,
    sentiment ENUM('positive', 'neutral', 'negative') NOT NULL,
    hit_count INT NOT NULL DEFAULT 1,
    analyzed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_analysis_mode (analysis_mode),
    INDEX idx_model_name (model_name),
    INDEX idx_last_used_at (last_used_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- LOST AND FOUND REPORTS TABLE - changes made by nick
-- ============================================================
CREATE TABLE lost_found_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tracking_code VARCHAR(32), -- Lost & Found visitor tracking code (DONE BY NICK)
    report_type VARCHAR(20) NOT NULL,
    item_description VARCHAR(255) NOT NULL,
    location_text VARCHAR(255) NOT NULL,
    contact_info VARCHAR(255) NOT NULL,
    details TEXT,
    item_photo_path VARCHAR(500), -- Optional item photo uploaded with report (DONE BY NICK)
    item_photo_original_name VARCHAR(255), -- Original Lost & Found photo filename (DONE BY NICK)
    current_page VARCHAR(120),
    feedback_progress TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_lost_found_status (status),
    INDEX idx_lost_found_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ADMIN USERS TABLE (DONE BY PRETI)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) DEFAULT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('IT_staff', 'IT_admin', 'system_admin') DEFAULT 'system_admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    is_deleted TINYINT(1) DEFAULT 0,
    deleted_at TIMESTAMP NULL,
    deleted_by VARCHAR(50) NULL,
    
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_is_deleted (is_deleted)
);

-- ============================================================
-- AUDIT LOGS TABLE (DONE BY PRETI)
-- ============================================================
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    admin_username VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_admin_username (admin_username),
    INDEX idx_created_at (created_at),
    INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- OVERLAYS TABLE (DONE BY PRETI)
-- ============================================================
CREATE TABLE overlays (
    id INT AUTO_INCREMENT PRIMARY KEY,
    display_name VARCHAR(255) NOT NULL,
    theme_id VARCHAR(100) UNIQUE NOT NULL,
    desktop_filename VARCHAR(255) NOT NULL,
    mobile_filename VARCHAR(255) NOT NULL,
    display_order INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_theme_id (theme_id),
    INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SAVED THEMES TABLE (DONE BY PRETI)
-- ============================================================
-- Note: The 6-theme limit per user is enforced in the backend API
-- (adminRoutes.js POST /api/admin/saved-themes)
CREATE TABLE saved_themes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_user_id INT NOT NULL,
    theme_name VARCHAR(100) NOT NULL,
    theme_data JSON NOT NULL,
    is_active TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
    INDEX idx_admin_user_id (admin_user_id),
    INDEX idx_is_active (is_active),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PLEDGE LIKES TABLE (PLEDGEBOARD FEATURE) (DONE BY PRETI)
-- ============================================================
-- Tracks likes/hearts for pledges on the pledgeboard
CREATE TABLE pledge_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    feedback_id INT NOT NULL,
    user_identifier VARCHAR(255) NOT NULL,  
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (feedback_id) REFERENCES feedback(id) ON DELETE CASCADE,
    INDEX idx_feedback_id (feedback_id),
    INDEX idx_user_identifier (user_identifier),
    -- Prevent duplicate likes from same user
    UNIQUE KEY unique_like (feedback_id, user_identifier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- COUNTDOWN MANAGEMENT TABLE (GLOBAL TIMER CONFIG)  (DONE BY BERNISSA)
-- ============================================================
CREATE TABLE countdown_management (
    id INT PRIMARY KEY AUTO_INCREMENT,
    countdown_seconds INT NOT NULL DEFAULT 3,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(100) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ensure exactly ONE row exists
INSERT INTO countdown_management (id, countdown_seconds, updated_by)
VALUES (1, 3, 'system')
ON DUPLICATE KEY UPDATE countdown_seconds = countdown_seconds;

-- ============================================================
-- VIP MANAGEMENT TABLE (DONE BY ZAH)
-- ============================================================
-- Stores VIP names that will appear as GOLDEN LEAF in the tree

CREATE TABLE vip_management (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Generated lowercase version for case-insensitive uniqueness
    name_lower VARCHAR(255) GENERATED ALWAYS AS (LOWER(name)) STORED,
    -- Prevent duplicate VIP names (case-insensitive)
    UNIQUE KEY uniq_vip_name (name_lower),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- INSERT INITIAL DATA (DONE BY PRETI)
-- ============================================================

-- Insert default admin user with full_name
-- Default: username = systemadmin, password = SystemAdmin123!
-- Note: This is plain text password, will be hashed by AuthLayer_Resconstituion).js
INSERT INTO admin_users (username, full_name, password_hash, role) 
VALUES ('systemadmin', 'System Administrator', 'SystemAdmin123!', 'system_admin');

-- Insert overlay themes
INSERT INTO overlays (display_name, theme_id, desktop_filename, mobile_filename, display_order) VALUES
('Nature Theme', 'nature', '/assets/overlays/DesktopOverlay/natureThemeDesktop.png', '/assets/overlays/MobileOverlay/natureThemeMobile.png', 1),
('Ocean Theme', 'ocean', '/assets/overlays/DesktopOverlay/oceanThemeDesktop.png', '/assets/overlays/MobileOverlay/oceanThemeMobile.png', 2),
('Energy Theme', 'energy', '/assets/overlays/DesktopOverlay/energyThemeDesktop.png', '/assets/overlays/MobileOverlay/energyThemeMobile.png', 3),
('Recycle Theme', 'recycle', '/assets/overlays/DesktopOverlay/recycleThemeDesktop.png', '/assets/overlays/MobileOverlay/recycleThemeMobile.png', 4),
('Tech Theme', 'tech', '/assets/overlays/DesktopOverlay/techThemeDesktop.png', '/assets/overlays/MobileOverlay/techThemeDesktop.png', 5),
('Cute Theme', 'cute', '/assets/overlays/DesktopOverlay/cuteThemeDesktop.png', '/assets/overlays/MobileOverlay/cuteThemeMobile.png', 6);

-- Insert sample questions
INSERT INTO questions (question_text, question_type, is_required, display_order, is_active) VALUES
('How would you rate your experience?', 'rating', 1, 1, 1),
('What did you learn today?', 'text', 0, 2, 1),
('Which topic interested you most?', 'choice', 0, 3, 1);

-- Insert options for question 3
INSERT INTO question_options (question_id, option_label, display_order) VALUES
(3, 'Climate Change', 1),
(3, 'Renewable Energy', 2),
(3, 'Sustainable Living', 3),
(3, 'Ocean Conservation', 4);

-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT 'Database setup complete!' as Status;
SELECT COUNT(*) as admin_users FROM admin_users;
SELECT COUNT(*) as overlays FROM overlays;
SELECT COUNT(*) as questions FROM questions;
SELECT COUNT(*) as saved_themes FROM saved_themes;
SELECT COUNT(*) as pledge_likes FROM pledge_likes;
SELECT COUNT(*) as countdown_management FROM countdown_management;
