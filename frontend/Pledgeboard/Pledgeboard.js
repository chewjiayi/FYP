// ============================================================
// PLEDGEBOARD.JS - TABLE OF CONTENTS (CTRL+F SEARCHABLE)
// ============================================================
// 
// 1. GLOBAL VARIABLES
//    let allPledges                   - Stores all pledges from current month (DONE BY PRETI)
//    let filteredPledges              - Stores filtered pledges after search (DONE BY PRETI)
//    let userIdentifier               - Unique identifier for tracking user likes (DONE BY PRETI)
//
// 2. INITIALIZATION
//    document.addEventListener('DOMContentLoaded' - Initialize pledgeboard on page load (DONE BY PRETI)
//
// 3. USER IDENTIFICATION
//    function getUserIdentifier()     - Generate unique identifier for user (DONE BY PRETI)
//
// 4. LOAD PLEDGEBOARD DATA
//    async function loadPledgeboard() - Fetch and display pledges from current month (DONE BY PRETI)
//    function filterCurrentMonth()    - Filter pledges to only current month (DONE BY PRETI)
//
// 5. SEARCH FUNCTIONALITY
//    function searchPledges()         - Search pledges by name (DONE BY PRETI)
//    function clearSearch()           - Clear search and show all pledges (DONE BY PRETI)
//
// 6. RENDER PLEDGEBOARD
//    function renderPledgeboard()     - Render top 3 and all pledges sections (DONE BY PRETI)
//
// 7. CREATE PLEDGE CARDS
//    function createTopPledgeCard()   - Create HTML for top 3 pledge card (DONE BY PRETI)
//    function createPledgeCard()      - Create HTML for regular pledge card (DONE BY PRETI)
//
// 8. LIKE FUNCTIONALITY
//    async function toggleLike()      - Toggle like on a pledge (DONE BY PRETI)
//    async function likePledge()      - Like a pledge (DONE BY PRETI)
//    async function unlikePledge()    - Unlike a pledge (DONE BY PRETI)
//    async function checkUserLikes()  - Check which pledges user has liked (DONE BY PRETI)
//
// 9. UI HELPERS
//    function showEmptyState()        - Show empty state when no pledges exist (DONE BY PRETI)
//    function showError()             - Show error message (DONE BY PRETI)
//    function escapeHtml()            - Escape HTML to prevent XSS (DONE BY PRETI)
//    function showNoResultsState()    - Show no results state when search returns nothing (DONE BY PRETI)
//
// 10. NAVIGATION
//     function goBackToFeedback()     - Go back to feedback page (DONE BY PRETI)

// ==================== 1. GLOBAL VARIABLES ====================
let allPledges = [];
let filteredPledges = [];
let userIdentifier = '';

// ==================== 2. INITIALIZATION ====================
// Initialize pledgeboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏆 Pledgeboard page loaded');
    
    // Generate or retrieve user identifier for tracking likes
    userIdentifier = getUserIdentifier();
    
    // Load pledgeboard data
    loadPledgeboard();
});

// ==================== 3. USER IDENTIFICATION ====================
// Generate a unique identifier for the user to track likes
function getUserIdentifier() {
    // Try to get existing identifier from sessionStorage
    let identifier = sessionStorage.getItem('pledgeboard_user_id');
    
    if (!identifier) {
        // Generate new identifier using timestamp and random string
        identifier = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('pledgeboard_user_id', identifier);
    }
    
    console.log('👤 User identifier:', identifier);
    return identifier;
}

// ==================== 4. LOAD PLEDGEBOARD DATA ====================
// Fetch all pledges from the server and render them
async function loadPledgeboard() {
    try {
        console.log('📡 Fetching pledgeboard data...');
        
        const response = await fetch('/api/pledgeboard/pledges');
        const data = await response.json();
        
        if (data.success) {
            // Filter to only current month
            const currentMonthPledges = filterCurrentMonth(data.pledges);
            allPledges = currentMonthPledges;
            filteredPledges = currentMonthPledges;
            
            console.log(`✅ Loaded ${allPledges.length} pledges from current month`);
            
            if (allPledges.length === 0) {
                showEmptyState();
            } else {
                renderPledgeboard();
            }
        } else {
            console.error('❌ Failed to load pledgeboard:', data.error);
            showError('Failed to load pledgeboard data');
        }
    } catch (error) {
        console.error('❌ Error loading pledgeboard:', error);
        showError('Failed to connect to server');
    }
}

// Filter pledges to only show current month
function filterCurrentMonth(pledges) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return pledges.filter(pledge => {
        const pledgeDate = new Date(pledge.created_at);
        return pledgeDate.getMonth() === currentMonth && 
               pledgeDate.getFullYear() === currentYear;
    });
}

// ==================== 5. SEARCH FUNCTIONALITY ====================
// Search pledges by name
function searchPledges() {
    const searchInput = document.getElementById('pledge-search');
    const searchTerm = searchInput.value.toLowerCase().trim();
    const clearBtn = document.querySelector('.clear-search-btn');
    
    // Show or hide clear button
    if (searchTerm) {
        clearBtn.style.display = 'block';
    } else {
        clearBtn.style.display = 'none';
    }
    
    if (!searchTerm) {
        // If search is empty, show all pledges
        filteredPledges = allPledges;
        renderPledgeboard();
        return;
    }
    
    // Filter pledges by name
    filteredPledges = allPledges.filter(pledge => {
        return pledge.name.toLowerCase().includes(searchTerm);
    });
    
    console.log(`🔍 Found ${filteredPledges.length} matches for "${searchTerm}"`);
    
    // Show no results state if nothing found
    if (filteredPledges.length === 0) {
        showNoResultsState();
    } else {
        renderPledgeboard();
    }
}

// Clear search and show all pledges
function clearSearch() {
    const searchInput = document.getElementById('pledge-search');
    const clearBtn = document.querySelector('.clear-search-btn');
    
    searchInput.value = '';
    clearBtn.style.display = 'none';
    filteredPledges = allPledges;
    
    // Hide no results state and show pledgeboard
    document.getElementById('no-results-state').style.display = 'none';
    renderPledgeboard();
}

// ==================== 6. RENDER PLEDGEBOARD ====================
// Render the top 3 pledges and all other pledges
function renderPledgeboard() {
    const topThreeGrid = document.getElementById('top-three-grid');
    const pledgesList = document.getElementById('pledges-list');
    const emptyState = document.getElementById('empty-state');
    const noResultsState = document.getElementById('no-results-state');
    const allPledgesTitle = document.querySelector('.all-pledges-section .section-title');
    
    // Hide empty and no results states
    emptyState.style.display = 'none';
    noResultsState.style.display = 'none';
    
    // Top 3 is always the actual top 3 by likes (never filtered by search)
    const actualTop3 = allPledges.slice(0, 3);
    
    // Render actual top 3
    if (actualTop3.length > 0) {
        topThreeGrid.innerHTML = actualTop3.map((pledge, index) => 
            createTopPledgeCard(pledge, index + 1)
        ).join('');
        topThreeGrid.parentElement.style.display = 'block';
    } else {
        topThreeGrid.innerHTML = '<div class="loading-state"><p>No pledges in top 3 yet</p></div>';
        topThreeGrid.parentElement.style.display = 'block';
    }
    
    // For "All Pledges" section, show filtered results (excluding top 3)
    let pledgesToShow;
    const searchInput = document.getElementById('pledge-search');
    const isSearching = searchInput.value.trim() !== '';
    
    if (isSearching) {
        // Show search results, but exclude any that are in top 3
        const top3Ids = actualTop3.map(p => p.id);
        pledgesToShow = filteredPledges.filter(p => !top3Ids.includes(p.id));
        
        // Update section title to show it's filtered
        allPledgesTitle.textContent = `📜 Search Results (${pledgesToShow.length} found)`;
    } else {
        // Show all pledges except top 3
        pledgesToShow = allPledges.slice(3);
        allPledgesTitle.textContent = '📜 All Pledges This Month';
    }
    
    // Render the pledges list
    if (pledgesToShow.length > 0) {
        pledgesList.innerHTML = pledgesToShow.map(pledge => 
            createPledgeCard(pledge)
        ).join('');
        pledgesList.parentElement.style.display = 'block';
    } else if (isSearching) {
        // No search results found
        pledgesList.innerHTML = '<div class="loading-state"><p>No matching pledges found in current month</p></div>';
        pledgesList.parentElement.style.display = 'block';
    } else {
        pledgesList.innerHTML = '<div class="loading-state"><p>No additional pledges this month</p></div>';
        pledgesList.parentElement.style.display = 'block';
    }
    
    // Check which pledges user has liked
    checkUserLikes();
}

// ==================== 7. CREATE PLEDGE CARDS ====================
// top 3 pledge card
function createTopPledgeCard(pledge, rank) {
    const medals = ['🥇', '🥈', '🥉'];
    const date = new Date(pledge.created_at).toLocaleDateString();
    
    return `
        <div class="top-pledge-card rank-${rank}">
            <div class="medal-badge">${medals[rank - 1]}</div>
            <div class="pledge-rank">#${rank}</div>
            <div class="pledge-author">${escapeHtml(pledge.name)}</div>
            <div class="pledge-text">${escapeHtml(pledge.pledge)}</div>
            <div class="pledge-footer">
                <button class="like-button" data-feedback-id="${pledge.id}" onclick="toggleLike(${pledge.id})">
                    <span class="like-icon">❤️</span>
                    <span class="like-count">${pledge.like_count}</span>
                </button>
                <div class="pledge-date">${date}</div>
            </div>
        </div>
    `;
}

// regular pledge card
function createPledgeCard(pledge) {
    const date = new Date(pledge.created_at).toLocaleDateString();
    
    return `
        <div class="pledge-card">
            <div class="pledge-header">
                <div class="pledge-author">${escapeHtml(pledge.name)}</div>
            </div>
            <div class="pledge-text">${escapeHtml(pledge.pledge)}</div>
            <div class="pledge-footer">
                <button class="like-button" data-feedback-id="${pledge.id}" onclick="toggleLike(${pledge.id})">
                    <span class="like-icon">❤️</span>
                    <span class="like-count">${pledge.like_count}</span>
                </button>
                <div class="pledge-date">${date}</div>
            </div>
        </div>
    `;
}

// ==================== 8. LIKE FUNCTIONALITY ====================
// Toggle like on a pledge
async function toggleLike(feedbackId) {
    const button = document.querySelector(`[data-feedback-id="${feedbackId}"]`);
    const isLiked = button.classList.contains('liked');
    
    try {
        if (isLiked) {
            // Unlike the pledge
            await unlikePledge(feedbackId);
        } else {
            // Like the pledge
            await likePledge(feedbackId);
        }
    } catch (error) {
        console.error('❌ Error toggling like:', error);
        showError('Failed to update like');
    }
}

// Like a pledge
async function likePledge(feedbackId) {
    try {
        const response = await fetch(`/api/pledgeboard/like/${feedbackId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userIdentifier })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ Liked pledge ${feedbackId}`);
            
            // Update UI
            const button = document.querySelector(`[data-feedback-id="${feedbackId}"]`);
            button.classList.add('liked');
            
            if (data.like_count !== null) {
                button.querySelector('.like-count').textContent = data.like_count;
            }
            
            // Update local data
            const pledge = allPledges.find(p => p.id === feedbackId);
            if (pledge) {
                pledge.like_count = data.like_count;
            }
        } else {
            if (data.alreadyLiked) {
                console.log('⚠️ Already liked this pledge');
                // Mark as liked in UI
                const button = document.querySelector(`[data-feedback-id="${feedbackId}"]`);
                button.classList.add('liked');
            } else {
                throw new Error(data.error);
            }
        }
    } catch (error) {
        console.error('❌ Error liking pledge:', error);
        throw error;
    }
}

// Unlike a pledge
async function unlikePledge(feedbackId) {
    try {
        const response = await fetch(`/api/pledgeboard/unlike/${feedbackId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userIdentifier })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ Unliked pledge ${feedbackId}`);
            
            // Update UI
            const button = document.querySelector(`[data-feedback-id="${feedbackId}"]`);
            button.classList.remove('liked');
            
            if (data.like_count !== null) {
                button.querySelector('.like-count').textContent = data.like_count;
            }
            
            // Update local data
            const pledge = allPledges.find(p => p.id === feedbackId);
            if (pledge) {
                pledge.like_count = data.like_count;
            }
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('❌ Error unliking pledge:', error);
        throw error;
    }
}

// Check which pledges the user has already liked
async function checkUserLikes() {
    for (const pledge of allPledges) {
        try {
            const response = await fetch(`/api/pledgeboard/check-like/${pledge.id}?userIdentifier=${userIdentifier}`);
            const data = await response.json();
            
            if (data.success && data.hasLiked) {
                const button = document.querySelector(`[data-feedback-id="${pledge.id}"]`);
                if (button) {
                    button.classList.add('liked');
                }
            }
        } catch (error) {
            console.error(`❌ Error checking like status for pledge ${pledge.id}:`, error);
        }
    }
}

// ==================== 9. UI HELPERS ====================
// Show empty state when no pledges exist
function showEmptyState() {
    const topThreeGrid = document.getElementById('top-three-grid');
    const pledgesList = document.getElementById('pledges-list');
    const emptyState = document.getElementById('empty-state');
    
    topThreeGrid.style.display = 'none';
    pledgesList.style.display = 'none';
    emptyState.style.display = 'block';
}

// Show error message
function showError(message) {
    const topThreeGrid = document.getElementById('top-three-grid');
    const pledgesList = document.getElementById('pledges-list');
    
    topThreeGrid.innerHTML = `<div class="loading-state"><p style="color: red;">❌ ${message}</p></div>`;
    pledgesList.innerHTML = '';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== 10. NAVIGATION ====================
// Go back to feedback page
function goBackToFeedback() {
    window.location.href = '/feedback';
}

// Show no results state when search returns nothing
function showNoResultsState() {
    const topThreeGrid = document.getElementById('top-three-grid');
    const pledgesList = document.getElementById('pledges-list');
    const emptyState = document.getElementById('empty-state');
    const noResultsState = document.getElementById('no-results-state');
    
    topThreeGrid.style.display = 'none';
    pledgesList.style.display = 'none';
    emptyState.style.display = 'none';
    noResultsState.style.display = 'block';
}