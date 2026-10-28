// ============================================================
// BADGE SYSTEM MODULE - COMPLETE IMPLEMENTATION
// ============================================================
// DONE BY XY - BADGE SYSTEM SUMMARY
//  - Added the complete ESG Kiosk badge awarding module.
//  - Defined badge configurations, SVG/icon styling, and badge email content.
//  - Added badge determination logic for feedback completion and sustainability pledges.
//  - Integrated badge email sending support through Nodemailer.
// ============================================================

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// ==================== BADGE CONFIGURATIONS ====================
const BADGE_CONFIGS = {
    'feedback-completer': {
        name: 'Feedback Contributor',
        description: 'For completing the feedback form',
        subject: 'Congratulations on Earning Your Feedback Contributor Badge!',
        icon: '📝',
        color: '#10b981',
        iconSvg: `<svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM16 18H8V16H16V18ZM16 14H8V12H16V14ZM13 9V3.5L18.5 9H13Z" fill="#10b981"/>
        </svg>`,
        textTemplate: `Hello!\n\nCongratulations on completing the feedback form! You've earned the "Feedback Contributor" badge.\n\nKeep up the great work!\n\nBest regards,\nESG Team`,
        htmlTemplate: `
            <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; background: #f8fafc; padding: 20px; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="width: 80px; height: 80px; margin: 0 auto 15px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM16 18H8V16H16V18ZM16 14H8V12H16V14ZM13 9V3.5L18.5 9H13Z" fill="white"/>
                        </svg>
                    </div>
                    <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 15px 30px; border-radius: 50px; display: inline-block; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
                        <h2 style="margin: 0; font-size: 24px;">Feedback Contributor</h2>
                        <p style="margin: 5px 0 0 0; opacity: 0.9;">Badge Earned!</p>
                    </div>
                </div>
                <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h3 style="color:#006937; margin-top: 0;">Congratulations!</h3>
                    <p>Hello!</p>
                    <p>Congratulations on completing the feedback form! You've earned the <strong>"Feedback Contributor"</strong> badge for sharing your valuable insights.</p>
                    <p>Your feedback helps us improve and serve you better. Keep up the great work!</p>
                    <div style="text-align: center; margin: 25px 0;">
                        <div style="display: inline-block; background: #10b981; color: white; padding: 10px 20px; border-radius: 20px; font-weight: bold;">
                            🏆 Achievement Unlocked
                        </div>
                    </div>
                    <p>Best regards,<br><strong>ESG Team</strong></p>
                </div>
            </div>
        `
    },
    'eco-warrior': {
        name: 'Eco Warrior',
        description: 'For making an environmental pledge',
        subject: 'Congratulations on Earning Your Eco Warrior Badge!',
        icon: '🌱',
        color: '#059669',
        iconSvg: `<svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z" fill="#059669"/>
            <path d="M3 21V19C3 17.9 3.9 17 5 17H19C20.1 17 21 17.9 21 19V21H3Z" fill="#059669"/>
        </svg>`,
        textTemplate: `Hello!\n\nCongratulations! By making an environmental pledge, you've earned the "Eco Warrior" badge.\n\nYour commitment to sustainability makes a real difference!\n\nBest regards,\nESG Team`,
        htmlTemplate: `
            <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; background: linear-gradient(135deg, #ecfdf5, #d1fae5); padding: 20px; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="width: 80px; height: 80px; margin: 0 auto 15px; background: linear-gradient(135deg, #059669, #047857); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(5, 150, 105, 0.3);">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z" fill="white"/>
                            <path d="M3 21V19C3 17.9 3.9 17 5 17H19C20.1 17 21 17.9 21 19V21H3Z" fill="white"/>
                        </svg>
                    </div>
                    <div style="background: linear-gradient(135deg, #059669, #047857); color: white; padding: 15px 30px; border-radius: 50px; display: inline-block; box-shadow: 0 4px 15px rgba(5, 150, 105, 0.3);">
                        <h2 style="margin: 0; font-size: 24px;">Eco Warrior</h2>
                        <p style="margin: 5px 0 0 0; opacity: 0.9;">Badge Earned!</p>
                    </div>
                </div>
                <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h3 style="color:#059669; margin-top: 0;">Congratulations, Eco Warrior!</h3>
                    <p>Hello!</p>
                    <p>Congratulations! By making an environmental pledge, you've earned the <strong>"Eco Warrior"</strong> badge. You're now part of our sustainability champions!</p>
                    <p>Your commitment to protecting our planet makes a real difference. Together, we can create a greener future!</p>
                    <div style="text-align: center; margin: 25px 0;">
                        <div style="display: inline-block; background: linear-gradient(135deg, #059669, #047857); color: white; padding: 10px 20px; border-radius: 20px; font-weight: bold;">
                            🌍 Planet Protector 🛡️
                        </div>
                    </div>
                    <p>Best regards,<br><strong>ESG Team</strong></p>
                </div>
            </div>
        `
    },
    'pledge-maker': {
        name: 'Commitment Champion',
        description: 'For making any pledge commitment',
        subject: 'Congratulations on Earning Your Commitment Champion Badge!',
        icon: '🤝',
        color: '#3b82f6',
        iconSvg: `<svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 3H7C5.9 3 5 3.9 5 5V21L12 18L19 21V5C19 3.9 18.1 3 17 3Z" fill="#3b82f6"/>
        </svg>`,
        textTemplate: `Hello!\n\nCongratulations on making a pledge commitment! You've earned the "Commitment Champion" badge.\n\nYour pledges help drive positive change!\n\nBest regards,\nESG Team`,
        htmlTemplate: `
            <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; background: linear-gradient(135deg, #eff6ff, #dbeafe); padding: 20px; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="width: 80px; height: 80px; margin: 0 auto 15px; background: linear-gradient(135deg, #3b82f6, #2563eb); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17 3H7C5.9 3 5 3.9 5 5V21L12 18L19 21V5C19 3.9 18.1 3 17 3Z" fill="white"/>
                        </svg>
                    </div>
                    <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 15px 30px; border-radius: 50px; display: inline-block; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);">
                        <h2 style="margin: 0; font-size: 24px;">Commitment Champion</h2>
                        <p style="margin: 5px 0 0 0; opacity: 0.9;">Badge Earned!</p>
                    </div>
                </div>
                <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h3 style="color:#3b82f6; margin-top: 0;">Congratulations, Commitment Champion!</h3>
                    <p>Hello!</p>
                    <p>Congratulations on making a pledge commitment! You've earned the <strong>"Commitment Champion"</strong> badge for taking concrete steps toward positive change.</p>
                    <p>Your pledges help drive meaningful progress. Every commitment counts toward building a better future!</p>
                    <div style="text-align: center; margin: 25px 0;">
                        <div style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 10px 20px; border-radius: 20px; font-weight: bold;">
                            💪 Commitment Champion
                        </div>
                    </div>
                    <p>Best regards,<br><strong>ESG Team</strong></p>
                </div>
            </div>
        `
    },
    'social-champion': {
        name: 'Social Champion',
        description: 'For making social responsibility pledges',
        subject: 'Congratulations on Earning Your Social Champion Badge!',
        icon: '🤝',
        color: '#f59e0b',
        iconSvg: `<svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.9 1 3 1.9 3 3V21C3 22.1 3.9 23 5 23H19C20.1 23 21 22.1 21 21V9ZM19 9H14V4L19 9ZM17 19H7V17H17V19ZM17 15H7V13H17V15ZM17 11H7V9H17V11Z" fill="#f59e0b"/>
        </svg>`,
        textTemplate: `Hello!\n\nCongratulations! By making a social responsibility pledge, you've earned the "Social Champion" badge.\n\nYour commitment to community and inclusion makes a real difference!\n\nBest regards,\nESG Team`,
        htmlTemplate: `
            <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; background: linear-gradient(135deg, #fef3c7, #fde68a); padding: 20px; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="width: 80px; height: 80px; margin: 0 auto 15px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.9 1 3 1.9 3 3V21C3 22.1 3.9 23 5 23H19C20.1 23 21 22.1 21 21V9ZM19 9H14V4L19 9ZM17 19H7V17H17V19ZM17 15H7V13H17V15ZM17 11H7V9H17V11Z" fill="white"/>
                        </svg>
                    </div>
                    <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 15px 30px; border-radius: 50px; display: inline-block; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);">
                        <h2 style="margin: 0; font-size: 24px;">Social Champion</h2>
                        <p style="margin: 5px 0 0 0; opacity: 0.9;">Badge Earned!</p>
                    </div>
                </div>
                <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h3 style="color:#f59e0b; margin-top: 0;">Congratulations, Social Champion!</h3>
                    <p>Hello!</p>
                    <p>Congratulations! By making a social responsibility pledge, you've earned the <strong>"Social Champion"</strong> badge. You're now part of our community champions!</p>
                    <p>Your commitment to diversity, inclusion, and community support makes a real difference. Together, we can build stronger, more inclusive communities!</p>
                    <div style="text-align: center; margin: 25px 0;">
                        <div style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 10px 20px; border-radius: 20px; font-weight: bold;">
                            🤝 Community Builder 🏘️
                        </div>
                    </div>
                    <p>Best regards,<br><strong>ESG Team</strong></p>
                </div>
            </div>
        `
    },
    'governance-guardian': {
        name: 'Governance Guardian',
        description: 'For making governance and ethics pledges',
        subject: 'Congratulations on Earning Your Governance Guardian Badge!',
        icon: '⚖️',
        color: '#8b5cf6',
        iconSvg: `<svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z" fill="#8b5cf6"/>
            <path d="M3 21V19C3 17.9 3.9 17 5 17H19C20.1 17 21 17.9 21 19V21H3Z" fill="#8b5cf6"/>
        </svg>`,
        textTemplate: `Hello!\n\nCongratulations! By making a governance and ethics pledge, you've earned the "Governance Guardian" badge.\n\nYour commitment to transparency and accountability strengthens our society!\n\nBest regards,\nESG Team`,
        htmlTemplate: `
            <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto; background: linear-gradient(135deg, #f3e8ff, #e9d5ff); padding: 20px; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="width: 80px; height: 80px; margin: 0 auto 15px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z" fill="white"/>
                            <path d="M3 21V19C3 17.9 3.9 17 5 17H19C20.1 17 21 17.9 21 19V21H3Z" fill="white"/>
                        </svg>
                    </div>
                    <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 15px 30px; border-radius: 50px; display: inline-block; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);">
                        <h2 style="margin: 0; font-size: 24px;">Governance Guardian</h2>
                        <p style="margin: 5px 0 0 0; opacity: 0.9;">Badge Earned!</p>
                    </div>
                </div>
                <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h3 style="color:#8b5cf6; margin-top: 0;">Congratulations, Governance Guardian!</h3>
                    <p>Hello!</p>
                    <p>Congratulations! By making a governance and ethics pledge, you've earned the <strong>"Governance Guardian"</strong> badge. You're now part of our ethics champions!</p>
                    <p>Your commitment to transparency, accountability, and ethical practices strengthens trust and integrity in our society. Every pledge counts toward better governance!</p>
                    <div style="text-align: center; margin: 25px 0;">
                        <div style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 10px 20px; border-radius: 20px; font-weight: bold;">
                            ⚖️ Ethics Champion 🛡️
                        </div>
                    </div>
                    <p>Best regards,<br><strong>ESG Team</strong></p>
                </div>
            </div>
        `
    }
};

// ==================== BADGE DETERMINATION LOGIC ====================
function determineBadge(userData) {
    // Priority: Eco Warrior > Social Champion > Governance Guardian > Commitment Champion > Feedback Completer
    if (userData.pledge && userData.pledge.trim().length > 0) {
        const pledgeLower = userData.pledge.toLowerCase();
        
        // Check if pledge contains environmental keywords
        const ecoKeywords = ['environment', 'sustainability', 'eco', 'green', 'climate', 'carbon', 'recycle', 'waste', 'energy', 'renewable'];
        const hasEcoContent = ecoKeywords.some(keyword => pledgeLower.includes(keyword));
        
        if (hasEcoContent) {
            return 'eco-warrior';
        }
        
        // Check if pledge contains social keywords
        const socialKeywords = ['community', 'diversity', 'inclusion', 'social', 'equality', 'volunteer', 'charity', 'donate', 'help', 'support'];
        const hasSocialContent = socialKeywords.some(keyword => pledgeLower.includes(keyword));
        
        if (hasSocialContent) {
            return 'social-champion';
        }
        
        // Check if pledge contains governance keywords
        const governanceKeywords = ['ethics', 'transparency', 'governance', 'accountability', 'compliance', 'integrity', 'trust', 'responsible'];
        const hasGovernanceContent = governanceKeywords.some(keyword => pledgeLower.includes(keyword));
        
        if (hasGovernanceContent) {
            return 'governance-guardian';
        }
        
        // Default pledge badge
        return 'pledge-maker';
    }
    
    // Default badge for completing feedback
    return 'feedback-completer';
}

// ==================== EMAIL TRANSPORTER SETUP ====================
let emailTransporter;
let SENDER_EMAIL;

// Initialize email transporter (this would be called from your emailService)
function initializeEmailTransporter(transporter, senderEmail) {
    emailTransporter = transporter;
    SENDER_EMAIL = senderEmail;
}

// ==================== BADGE EMAIL SENDING ====================
async function sendBadgeEmail(recipientEmail, userData) {
    try {
        if (!emailTransporter) {
            throw new Error('Email transporter not initialized');
        }

        // Determine which badge to award based on user actions
        const badgeKey = determineBadge(userData);
        const badgeConfig = BADGE_CONFIGS[badgeKey];

        if (!badgeConfig) {
            console.error(`Unknown badge key: ${badgeKey}`);
            return { success: false, error: 'Unknown badge type' };
        }

        const mailOptions = {
            from: `"RP ESG Centre" <${SENDER_EMAIL}>`,
            to: recipientEmail,
            subject: badgeConfig.subject,
            text: badgeConfig.textTemplate,
            html: badgeConfig.htmlTemplate
        };

        const info = await emailTransporter.sendMail(mailOptions);
        console.log(`🏆 Badge "${badgeConfig.name}" email sent to ${recipientEmail}: ${info.messageId}`);
        return {
            success: true,
            messageId: info.messageId,
            badge: badgeConfig.name,
            badgeKey: badgeKey
        };
    } catch (error) {
        console.error('Error sending badge email:', error);
        return { success: false, error: error.message };
    }
}

// ==================== UTILITY FUNCTIONS ====================

// Get all available badges
function getAllBadges() {
    return BADGE_CONFIGS;
}

// Get a specific badge configuration
function getBadgeConfig(badgeKey) {
    return BADGE_CONFIGS[badgeKey] || null;
}

// Validate badge key exists
function isValidBadge(badgeKey) {
    return badgeKey in BADGE_CONFIGS;
}

// ==================== INTEGRATION EXAMPLE ====================
/*
// In your feedbackRoutes.js, after successful feedback submission:

const badgeResult = await sendBadgeEmail(userData.email, userData);

if (badgeResult.success) {
    console.log(`🏆 Badge "${badgeResult.badge}" email sent to ${userData.email}`);
} else {
    console.error(`❌ Badge email failed:`, badgeResult.error);
}
*/

// ==================== EXPORTS ====================
module.exports = {
    BADGE_CONFIGS,
    determineBadge,
    sendBadgeEmail,
    initializeEmailTransporter,
    getAllBadges,
    getBadgeConfig,
    isValidBadge
};
