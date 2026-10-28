// ============================================================
// XY CHANGE SUMMARY (DONE BY XY)
// ============================================================
//
// 1. LIVE PULSE DASHBOARD RENDERING
//    const REFRESH_MS                 - Auto-refresh interval for pulse dashboard data (DONE BY XY)
//    function loadPulse()             - Fetch and render live ESG pledge/badge/tree summary (DONE BY XY)
//    function renderPledges()         - Render newest anonymous pledges in pulse view (DONE BY XY)
//    function renderBadgeMix()        - Render badge breakdown bars in pulse view (DONE BY XY)
//
// 2. DIGITAL TREE PREVIEW
//    leafPositions                    - Fixed pulse leaf positions so leaves stay connected visually (DONE BY XY)
//    ultrawide no-scroll layout        - Supports 7m by 2m public display screens (DONE BY XY)
//
// FIND COMMAND
//    rg -n "XY CHANGE SUMMARY|DONE BY XY" frontend backend
// ============================================================

const REFRESH_MS = 20000;
const MAX_TREE_LEAVES = 54;

if (new URLSearchParams(window.location.search).get('embed') === 'admin') {
    document.documentElement.classList.add('admin-embed');
}

const leafImages = [
    '/assets/Tree/leaf/NewLeftLeaf.png',
    '/assets/Tree/leaf/NewRightLeaf.png',
    '/assets/Tree/leaf/OldLeftLeaf.png',
    '/assets/Tree/leaf/OldRightLeaf.png'
];

const DEFAULT_PULSE_BADGE_COLORS = {
    'feedback-completer': '#4a7c59',
    'climate-champion': '#0f766e',
    'renewable-innovator': '#f59e0b',
    'sustainable-living-advocate': '#16a34a',
    'ocean-guardian': '#0284c7',
    'governance-guardian': '#7c3aed',
    'social-champion': '#d97706'
};

const branchAnchors = [
    { left: 42, top: 36 },
    { left: 50, top: 31 },
    { left: 58, top: 36 },
    { left: 36, top: 45 },
    { left: 48, top: 43 },
    { left: 62, top: 45 },
    { left: 43, top: 53 },
    { left: 56, top: 53 }
];

const leafPositions = Array.from({ length: MAX_TREE_LEAVES }, (_, index) => {
    const anchor = branchAnchors[index % branchAnchors.length];
    const lap = Math.floor(index / branchAnchors.length);
    const spreadX = (((index * 17) % 9) - 4) + ((lap % 3) - 1) * 2;
    const spreadY = (((index * 11) % 7) - 3) + (lap % 2 ? 2 : -1);
    return {
        left: anchor.left + spreadX,
        top: anchor.top + spreadY,
        rotation: ((index * 37) % 50) - 25
    };
});

function $(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
}

function formatNumber(value) {
    return new Intl.NumberFormat('en-SG').format(Number(value) || 0);
}

function formatTime(value) {
    if (!value) return 'Just now';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Recently';

    return date.toLocaleTimeString('en-SG', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
}

function normalizeHexColor(value, fallback) {
    const color = String(value || '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}

function getPulseLeafScale(visitor) {
    const scale = Number(visitor?.leafScale);
    return Number.isFinite(scale) ? Math.min(2, Math.max(0.4, scale)) : 1;
}

function getPulseBadgeColor(visitor) {
    const badgeKey = visitor?.badgeKey || 'feedback-completer';
    return normalizeHexColor(visitor?.badgeColor, DEFAULT_PULSE_BADGE_COLORS[badgeKey] || DEFAULT_PULSE_BADGE_COLORS['feedback-completer']);
}

function updateClock() {
    const now = new Date();
    setText('pulse-time', now.toLocaleTimeString('en-SG', {
        hour: '2-digit',
        minute: '2-digit'
    }));
    setText('pulse-date', now.toLocaleDateString('en-SG', {
        weekday: 'long',
        day: 'numeric',
        month: 'short'
    }));
}

function renderMetrics(stats, activeCampaign = null) {
    setText('pledges-today', formatNumber(stats.pledgesToday));
    setText('pledges-month', formatNumber(stats.pledgesThisMonth));
    setText('tree-leaves', formatNumber(stats.treeLeaves));
    setText('total-pledges', formatNumber(stats.totalPledges));
    setText('campaign-percent', `${stats.progressPercent}%`);
    const campaignTitle = activeCampaign?.title
        ? `${activeCampaign.title} goal`
        : 'Monthly pledge goal';
    setText('campaign-title', campaignTitle);
    setText('campaign-copy', `${formatNumber(stats.pledgesThisMonth)} of ${formatNumber(stats.campaignGoal)} pledges reached`);

    const bar = $('campaign-bar');
    if (bar) bar.style.width = `${stats.progressPercent}%`;
}

function renderPledges(pledges) {
    const container = $('newest-pledges');
    if (!container) return;

    if (!pledges || pledges.length === 0) {
        container.innerHTML = '<div class="empty-state">No pledges yet. The next visitor can start the pulse.</div>';
        return;
    }

    container.innerHTML = pledges.slice(0, 6).map((pledge) => `
        <article class="pledge-card">
            <p class="pledge-text">${escapeHtml(pledge.pledge)}</p>
            <div class="pledge-meta">${escapeHtml(pledge.displayName)} - ${escapeHtml(pledge.badge)} - ${formatTime(pledge.created_at)}</div>
        </article>
    `).join('');
}

function renderBadgeEarners(earners) {
    const container = $('badge-earners');
    if (!container) return;

    if (!earners || earners.length === 0) {
        container.innerHTML = '<div class="empty-state">No badges earned yet.</div>';
        return;
    }

    container.innerHTML = earners.map((earner, index) => `
        <div class="badge-row">
            <span class="rank">${index + 1}</span>
            <div>
                <div class="badge-name">${escapeHtml(earner.name)}</div>
                <div class="badge-subtitle">${escapeHtml(earner.latestBadge || 'Feedback Contributor')}</div>
            </div>
            <span class="badge-count">${formatNumber(earner.badgeCount)}</span>
        </div>
    `).join('');
}

function renderBadgeBreakdown(items) {
    const container = $('badge-breakdown');
    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = '<div class="empty-state">Badge topics will appear after pledges arrive.</div>';
        return;
    }

    const max = Math.max(...items.map(item => Number(item.count) || 0), 1);

    container.innerHTML = items.slice(0, 5).map((item) => {
        const width = Math.max(8, Math.round(((Number(item.count) || 0) / max) * 100));
        return `
            <div class="topic-row${item.emphasized ? ' campaign-emphasis' : ''}">
                <div class="topic-name">${escapeHtml(item.badge)}</div>
                <div class="topic-track"><div class="topic-fill" style="width: ${width}%"></div></div>
                <div class="topic-count">${formatNumber(item.count)}</div>
            </div>
        `;
    }).join('');
}

function renderTree(visitors) {
    const container = $('pulse-leaves');
    if (!container) return;

    const visibleVisitors = (visitors || []).slice(0, MAX_TREE_LEAVES);
    container.innerHTML = visibleVisitors.map((visitor, index) => {
        const position = leafPositions[index];
        const isNew = index < 8;
        const image = leafImages[index % leafImages.length];
        const scale = getPulseLeafScale(visitor);
        const leafSize = Math.round((isNew ? 52 : 42) * scale);
        const badgeColor = getPulseBadgeColor(visitor);
        const delay = (index % 8) * -0.35;
        return `
            <div
                class="pulse-leaf pulse-leaf-tinted${isNew ? ' new' : ''}"
                title="${escapeHtml(visitor.name || 'Visitor')} - ${escapeHtml(visitor.badge || 'Feedback Contributor')}"
                style="
                    left: ${position.left}%;
                    top: ${position.top}%;
                    width: ${leafSize}px;
                    height: ${leafSize}px;
                    --pulse-leaf-image: url('${image}');
                    --pulse-leaf-color: ${badgeColor};
                    --leaf-rotate: ${position.rotation}deg;
                    animation-delay: ${delay}s;
                "
            >
                <span class="pulse-leaf-name">${escapeHtml(visitor.name || 'Visitor')}</span>
            </div>
        `;
    }).join('');
}

async function loadPulse() {
    try {
        const response = await fetch('/api/pulse/summary', {
            headers: { 'Cache-Control': 'no-cache' }
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Unable to load pulse data');
        }

        renderMetrics(data.stats || {}, data.activeCampaign || null);
        renderPledges(data.newestPledges || []);
        renderBadgeEarners(data.topBadgeEarners || []);
        renderBadgeBreakdown(data.badgeBreakdown || []);
        renderTree(data.treeVisitors || []);
        setText('last-updated', `Updated ${formatTime(data.generatedAt)}`);
    } catch (error) {
        console.error('Pulse load failed:', error);
        setText('last-updated', 'Connection issue');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateClock();
    loadPulse();
    setInterval(updateClock, 1000);
    setInterval(loadPulse, REFRESH_MS);
});
