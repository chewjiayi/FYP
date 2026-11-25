// ============================================================
// XY CHANGE SUMMARY (DONE BY XY)
// ============================================================
//
// 1. DIGITAL TREE LEAF PLACEMENT
//    class TreeManager                - Stable leaf placement on tree canopy instead of flying/floating leaves (DONE BY XY)
//    badgeConfig mapping              - Badge-specific labels, short labels and preferred leaf sides (DONE BY XY)
//
// 2. ACTIVE BADGE CLEANUP
//    badgeConfig mapping              - Uses Feedback Contributor plus 6 pledge-topic badges only (DONE BY XY)
//    Removed inactive badges          - Eco Warrior and Commitment Champion removed from tree mapping (DONE BY XY)
//
// 3. YEAR REVIEW BOOK
//    yearReviewToggle                 - Opens/closes the yearly review book from a corner button (DONE BY XY)
//    fetchYearReviewData()            - Loads yearly tree summary data from /api/tree/years (DONE BY XY)
//    turnReviewPage()                 - Flips between yearly review pages with animation (DONE BY XY)
//    demoYearsEnabled                 - Supports ?demoYears=1 preview years without database edits (DONE BY XY)
//
// 4. LEAF FALL AND BADGE COLOR CONSISTENCY
//    leafFallThreshold                - Trigger full-batch leaf falling when the tree reaches the configured count (DONE BY XY)
//    getLeafCycleState()              - Clear fallen batches so the next pledge starts a new visible leaf batch (DONE BY XY)
//    badgeLeafColors                  - Keep every visible non-VIP leaf aligned with its assigned badge colour (DONE BY XY)
//
// 5. INTERACTIVE LEAF DETAILS
//    bindLeafDetailControls()         - Close leaf detail card with button or Escape key (DONE BY XY)
//    openLeafDetail()                 - Show visitor display name, badge, date and pledge snippet on leaf click (DONE BY XY)
//    createLeaf()                     - Add click and keyboard handlers to each visible leaf (DONE BY XY)
//
// 6. LEAF FALL DEMO MODE
//    demoFallEnabled                  - Supports ?demoFall=1 live tree demo without database records (DONE BY XY)
//    createDemoFallVisitors()         - Builds browser-only demo leaves for lecturer animation demos (DONE BY XY)
//    parseDemoLeafCount()             - Supports ?leaves= and ?duration= controls for demo fall playback (DONE BY XY)
//
// FIND COMMAND
//    rg -n "XY CHANGE SUMMARY|DONE BY XY" frontend backend
//
// CAEDEN CHANGE SUMMARY (DONE BY CAEDEN)
// ============================================================
//
// 1. ADMIN-CONFIGURABLE TREE PARAMETERS
//    function fetchParameterConfig    - Load tree and visual settings from /api/parameters (DONE BY CAEDEN)
//    TreeManager canopy fields        - Apply configurable canopy size, offset, refresh rate and leaf appearance (DONE BY CAEDEN)
//    refreshTreeFromServer            - Refresh tree using admin-configured interval (DONE BY CAEDEN)
//
// FIND COMMAND
//    rg -n "DONE BY CAEDEN|CAEDEN CHANGE SUMMARY" frontend backend
// ============================================================
// YU KANG CHANGE SUMMARY (DONE BY YU KANG)
// ============================================================
//
// - Tree now supports a custom leaf image uploaded via the admin panel
//   and an adjustable display scale controlled by admin parameters.
//   Uploaded leaf assets are saved to ./assets/Tree/leaf and applied to
//   the visual tree when configured. (Done by Yu Kang)
//
// FIND COMMAND
//    rg -n "YU KANG CHANGE SUMMARY|DONE BY YU KANG" frontend backend
// ============================================================
//
// CLEANUP NOTE
// ============================================================
// The 2D leaf-overlay system (DOM leaves, mask placement, leaf-fall
// animation, leaf detail card, demo-fall mode) has been removed ahead of
// the three.js renderer. Admin parameters, visitor/VIP/year-review data
// fetching, the year review book, and the title heading are retained.
// Leaf-related config values are still loaded into TreeManager so the
// upcoming three.js leaf system can consume them.
// ============================================================


// TREE.JS - TABLE OF CONTENTS
// ============================================================
//
// CLASS: TreeManager
//   - constructor()                    - Initialize TreeManager instance
//
// INITIALIZATION & SETUP
//   - init()                           - Initialize tree and load data
//   - normalizeName()                  - Normalize names for VIP matching
//   - fetchVipNames()                  - Fetch VIP names from API (/api/tree/vip-names)
//   - isVipName()                      - Check if a visitor name is VIP (using vipNames Set)
//   - fetchVisitorData()               - Fetch visitor data from API (/api/tree)
//   - fetchYearReviewData()            - Fetch yearly summaries from /api/tree/years
//   - fetchParameterConfig()           - Load admin tree/visual parameters
//
// YEAR REVIEW BOOK
//   - bindYearReviewControls()         - Wire book toggle, nav and view buttons
//   - toggleYearReviewBook()           - Open/close the book
//   - turnReviewPage()                 - Flip between yearly pages
//   - viewReviewYear() / viewLiveYear()- Switch the active year
//   - renderYearReviewBook()           - Render current page content
//   - updateTreeHeading()              - Update title/subtitle text
//
// CONFIGURATION
//   - applyTitleBoxVisibility()        - Show/hide title box per admin setting
//   - applyTreeStageAssets()           - Store normalized tree stage for renderer
//   - refreshTree()                    - Extension point for the three.js renderer
//
// GLOBAL LISTENERS
//   - on load                          - Init
//   - setTimeout refresh               - Refresh on admin-configured interval
//   - tree-vip-refresh / storage       - Refresh data after VIP updates
//   - resize                           - Refresh on resize
// ============================================================

const DEFAULT_BADGE_LEAF_COLORS = Object.freeze({
    'feedback-completer': '#4a7c59',
    'climate-champion': '#0f766e',
    'renewable-innovator': '#f59e0b',
    'sustainable-living-advocate': '#16a34a',
    'ocean-guardian': '#0284c7',
    'governance-guardian': '#7c3aed',
    'social-champion': '#d97706'
});

class TreeManager {

    constructor() {
        // DOM Elements
        this.loadingMessage = document.getElementById('loadingMessage');
        this.treeTitleBox = document.querySelector('.tree-title');
        this.treeTitle = document.getElementById('treeTitle');
        this.treeSubtitle = document.getElementById('treeSubtitle');
        this.yearReviewToggle = document.getElementById('yearReviewToggle');
        this.yearReviewBook = document.getElementById('yearReviewBook');
        this.bookYear = document.getElementById('bookYear');
        this.bookCount = document.getElementById('bookCount');
        this.reviewTreePreview = document.getElementById('reviewTreePreview');
        this.bookPrevButton = document.getElementById('bookPrevButton');
        this.bookNextButton = document.getElementById('bookNextButton');
        this.bookViewButton = document.getElementById('bookViewButton');
        this.bookLiveButton = document.getElementById('bookLiveButton');
        this.bookCloseButton = document.getElementById('bookCloseButton');
        this.bookTurnSheet = document.getElementById('bookTurnSheet');
        this.bookTurnYear = document.getElementById('bookTurnYear');
        this.leafDetailCard = document.getElementById('leafDetailCard');
        this.leafDetailClose = document.getElementById('leafDetailClose');
        this.leafDetailPrivacy = document.getElementById('leafDetailPrivacy');
        this.leafDetailName = document.getElementById('leafDetailName');
        this.leafDetailBadge = document.getElementById('leafDetailBadge');
        this.leafDetailDate = document.getElementById('leafDetailDate');
        this.leafDetailSnippet = document.getElementById('leafDetailSnippet');

        // Data
        this.visitors = [];
        this.currentYear = new Date().getFullYear();
        this.selectedYear = this.currentYear;
        this.reviewYears = [];
        this.reviewIndex = 0;
        this.isReviewMode = false;
        this.isBookOpen = false;
        this.urlParams = new URLSearchParams(window.location.search);
        this.demoYearsEnabled = this.urlParams.get('demoYears') === '1';
        this.isBookFlipping = false;

        // VIP Names (reserved for golden leaves in the three.js renderer)
        this.vipNames = new Set();

        this.badgeLeafProfiles = {
            'feedback-completer': {
                label: 'Feedback Contributor',
                shortLabel: 'Feedback',
                className: 'badge-feedback',
                preferredSide: null
            },
            'climate-champion': {
                label: 'Climate Champion',
                shortLabel: 'Climate',
                className: 'badge-climate',
                preferredSide: 'LeftLeaf.png'
            },
            'renewable-innovator': {
                label: 'Renewable Innovator',
                shortLabel: 'Energy',
                className: 'badge-renewable',
                preferredSide: 'RightLeaf.png'
            },
            'sustainable-living-advocate': {
                label: 'Sustainable Living Advocate',
                shortLabel: 'Living',
                className: 'badge-sustainable',
                preferredSide: 'LeftLeaf.png'
            },
            'ocean-guardian': {
                label: 'Ocean Guardian',
                shortLabel: 'Ocean',
                className: 'badge-ocean',
                preferredSide: 'RightLeaf.png'
            },
            'governance-guardian': {
                label: 'Governance Guardian',
                shortLabel: 'Ethics',
                className: 'badge-governance',
                preferredSide: 'LeftLeaf.png'
            },
            'social-champion': {
                label: 'Social Champion',
                shortLabel: 'Social',
                className: 'badge-social',
                preferredSide: 'RightLeaf.png'
            }
        };

        // ====================================================
        // ADMIN-CONFIGURABLE PARAMETERS (stored for renderer)
        // ====================================================
        this.ovalWidth = 850;
        this.ovalHeight = 300;
        this.ovalTopOffset = -100;
        this.leafRefreshInterval = 30000;
        this.leafOpacity = 0.9;
        this.leafAnimationDuration = 500;
        this.leafFallThreshold = 15;
        this.leafFallDuration = 4200;
        this.leafDisplayScale = 1;
        this.vipLeafDisplayScale = 1;
        this.badgeTintDurationMs = 24 * 60 * 60 * 1000;
        this.badgeLeafColors = { ...DEFAULT_BADGE_LEAF_COLORS };
        this.treeStage = 0;
        this.showTitleBox = true;
        this.activeCampaign = null;
        this.leafOverrideImage = null;

        // Three.js scene (treeScene.js)
        this.treeScene = null;
        this.treeCanvas = document.getElementById('treeCanvas');

        this.init();
    }

    // ==================== INIT ====================

    async init() {
        try {
            await this.fetchParameterConfig();
            this.bindYearReviewControls();
            this.bindLeafDetailControls();
            this.bindLeafClick();
            await this.fetchVipNames();
            await this.fetchYearReviewData();
            await this.fetchVisitorData(this.currentYear);
            this.updateTreeHeading();
            this.renderYearReviewBook();
            await this.initTreeScene();
        } catch (err) {
            console.error('Init error:', err);
        } finally {
            if (this.loadingMessage) {
                this.loadingMessage.style.display = 'none';
            }
        }
    }

    async fetchParameterConfig() {
        try {
            const response = await fetch('/api/parameters', { cache: 'no-store' });
            const data = await response.json();
            if (!response.ok || !data.success) return;

            const tree = data.parameters?.treeParameters || {};
            const assets = data.parameters?.visualAssets || {};
            const campaign = data.parameters?.campaignSettings || {};
            const badgeLeafStyles = data.parameters?.badgeLeafStyles || {};

            this.ovalWidth = Number(tree.ovalWidth) || this.ovalWidth;
            this.ovalHeight = Number(tree.ovalHeight) || this.ovalHeight;
            this.ovalTopOffset = Number(tree.ovalTopOffset) || this.ovalTopOffset;
            this.leafRefreshInterval = Number(tree.leafRefreshInterval) || this.leafRefreshInterval;
            this.leafOpacity = Number(tree.leafOpacity) || this.leafOpacity;
            this.leafAnimationDuration = Number(tree.leafAnimationDuration) || this.leafAnimationDuration;
            this.leafFallThreshold = Number(tree.leafFallThreshold) || this.leafFallThreshold;
            this.leafFallDuration = Number(tree.leafFallDuration) || this.leafFallDuration;
            this.treeStage = this.normalizeTreeStage(tree.treeStage);
            this.showTitleBox = tree.showTitleBox !== false;
            this.activeCampaign = campaign.enabled === true ? campaign : null;
            this.applyTitleBoxVisibility();
            this.applyTreeStageAssets(this.treeStage);

            if (assets.treeBackground) {
                document.body.style.backgroundImage = `url('${assets.treeBackground}')`;
            }
            // Leaf override image and shared display scale
            const configuredLeafScale = Number(tree.leafDisplayScale);
            const configuredBadgeLeafScale = Number(badgeLeafStyles.leafScale);
            this.leafDisplayScale = Number.isFinite(configuredLeafScale)
                ? configuredLeafScale
                : (Number.isFinite(configuredBadgeLeafScale) ? configuredBadgeLeafScale : 1);
            const configuredVipLeafScale = Number(tree.vipLeafDisplayScale);
            this.vipLeafDisplayScale = Number.isFinite(configuredVipLeafScale)
                ? configuredVipLeafScale
                : this.leafDisplayScale;
            const configuredTintHours = Number(badgeLeafStyles.tintDurationHours);
            if (Number.isFinite(configuredTintHours) && configuredTintHours > 0) {
                this.badgeTintDurationMs = configuredTintHours * 60 * 60 * 1000;
            }
            this.badgeLeafColors = {
                ...DEFAULT_BADGE_LEAF_COLORS,
                ...(badgeLeafStyles.colors || {})
            };
            this.leafOverrideImage = assets.leafImage
                ? (assets.leafImage.startsWith('/') ? assets.leafImage : `/assets/Tree/leaf/${assets.leafImage}`)
                : null;
            this.vipLeafOverrideImage = assets.vipLeafImage
                ? (assets.vipLeafImage.startsWith('/') ? assets.vipLeafImage : `/assets/Tree/vip-leaf/${assets.vipLeafImage}`)
                : null;
        } catch (error) {
            console.warn('Tree parameter config unavailable:', error);
        }
    }

    applyTitleBoxVisibility() {
        if (this.treeTitleBox) {
            this.treeTitleBox.style.display = this.showTitleBox ? 'block' : 'none';
        }
    }

    normalizeTreeStage(rawStage) {
        const parsed = Number(rawStage);
        if (!Number.isInteger(parsed)) {
            return 0;
        }
        return Math.max(0, Math.min(4, parsed));
    }

    applyTreeStageAssets(stageNumber) {
        this.treeStage = this.normalizeTreeStage(stageNumber);
        this.refreshTree();
    }

    // ==================== VIP HELPERS ====================

    normalizeName(name) {
        return String(name || '').trim().toLowerCase();
    }

    async fetchVipNames() {
        try {
            const response = await fetch('/api/tree/vip-names');
            const data = await response.json();

            const list = Array.isArray(data.vipNames) ? data.vipNames : [];
            this.vipNames = new Set(list.map(n => this.normalizeName(n)));

            console.log(`✅ Loaded ${this.vipNames.size} VIP names`);
        } catch (error) {
            console.error('❌ Error fetching VIP names:', error);
            this.vipNames = new Set();
        }
    }

    isVipName(name) {
        return this.vipNames.has(this.normalizeName(name));
    }

    getBadgeLeafProfile(visitor) {
        const badgeKey = visitor && visitor.badgeKey ? visitor.badgeKey : 'feedback-completer';
        return this.badgeLeafProfiles[badgeKey] || this.badgeLeafProfiles['feedback-completer'];
    }

    getBadgeLeafColor(visitor) {
        const badgeKey = visitor && visitor.badgeKey ? visitor.badgeKey : 'feedback-completer';
        return this.badgeLeafColors[badgeKey]
            || visitor?.badgeColor
            || DEFAULT_BADGE_LEAF_COLORS[badgeKey]
            || DEFAULT_BADGE_LEAF_COLORS['feedback-completer'];
    }

    hashString(value) {
        let hash = 2166136261;
        const text = String(value || '');

        for (let i = 0; i < text.length; i++) {
            hash ^= text.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }

        return hash >>> 0;
    }

    createSeededRandom(seed) {
        let state = this.hashString(seed) || 1;

        return () => {
            state = Math.imul(1664525, state) + 1013904223;
            return (state >>> 0) / 4294967296;
        };
    }

    // ==================== DATA ====================

    async fetchVisitorData(year = this.selectedYear) {
        try {
            const query = year ? `?year=${encodeURIComponent(year)}` : '';
            const response = await fetch(`/api/tree${query}`);
            const data = await response.json();

            this.visitors = Array.isArray(data) ? data : [];
            console.log(`Loaded ${this.visitors.length} visitors`);
        } catch (error) {
            console.error('Error fetching visitor data:', error);
            this.visitors = [];
        }
    }

    async fetchYearReviewData() {
        try {
            const response = await fetch('/api/tree/years');
            const data = await response.json();

            this.currentYear = Number(data.currentYear) || new Date().getFullYear();
            this.selectedYear = this.isReviewMode ? this.selectedYear : this.currentYear;
            this.reviewYears = Array.isArray(data.years) ? data.years : [];
            this.addDemoYearsIfNeeded();

            if (!this.reviewYears.some(item => Number(item.year) === this.currentYear)) {
                this.reviewYears.unshift({
                    year: this.currentYear,
                    leafCount: 0,
                    isCurrentYear: true
                });
            }

            if (!this.reviewYears.length) {
                this.reviewYears = [{
                    year: this.currentYear,
                    leafCount: 0,
                    isCurrentYear: true
                }];
            }

            const activeIndex = this.reviewYears.findIndex(item => Number(item.year) === this.selectedYear);
            this.reviewIndex = activeIndex >= 0 ? activeIndex : 0;
        } catch (error) {
            console.error('Error fetching tree year review data:', error);
            this.reviewYears = [{
                year: this.currentYear,
                leafCount: this.visitors.length,
                isCurrentYear: true
            }];
            this.addDemoYearsIfNeeded();
            this.reviewIndex = 0;
        }
    }

    addDemoYearsIfNeeded() {
        if (!this.demoYearsEnabled) return;

        const demoYears = [
            { year: this.currentYear - 1, leafCount: 48 },
            { year: this.currentYear - 2, leafCount: 72 },
            { year: this.currentYear - 3, leafCount: 35 }
        ];

        demoYears.forEach((demoYear) => {
            const hasYear = this.reviewYears.some(item => Number(item.year) === demoYear.year);
            if (!hasYear) {
                this.reviewYears.push({
                    ...demoYear,
                    firstSubmission: `${demoYear.year}-01-12T09:00:00.000Z`,
                    lastSubmission: `${demoYear.year}-12-18T17:30:00.000Z`,
                    isCurrentYear: false,
                    isDemo: true
                });
            }
        });

        this.reviewYears.sort((a, b) => Number(b.year) - Number(a.year));
    }

    bindYearReviewControls() {
        if (this.yearReviewToggle) {
            this.yearReviewToggle.addEventListener('click', () => this.toggleYearReviewBook());
        }

        if (this.bookCloseButton) {
            this.bookCloseButton.addEventListener('click', () => this.closeYearReviewBook());
        }

        if (this.bookPrevButton) {
            this.bookPrevButton.addEventListener('click', () => this.turnReviewPage(-1));
        }

        if (this.bookNextButton) {
            this.bookNextButton.addEventListener('click', () => this.turnReviewPage(1));
        }

        if (this.bookViewButton) {
            this.bookViewButton.addEventListener('click', () => this.viewReviewYear());
        }

        if (this.bookLiveButton) {
            this.bookLiveButton.addEventListener('click', () => this.viewLiveYear());
        }
    }

    toggleYearReviewBook() {
        if (this.isBookOpen) {
            this.closeYearReviewBook();
        } else {
            this.openYearReviewBook();
        }
    }

    openYearReviewBook() {
        this.isBookOpen = true;
        if (this.yearReviewBook) {
            this.yearReviewBook.classList.add('open');
            this.yearReviewBook.setAttribute('aria-hidden', 'false');
        }
        if (this.yearReviewToggle) {
            this.yearReviewToggle.classList.add('active');
            this.yearReviewToggle.setAttribute('aria-expanded', 'true');
        }
    }

    closeYearReviewBook() {
        this.isBookOpen = false;
        if (this.yearReviewBook) {
            this.yearReviewBook.classList.remove('open');
            this.yearReviewBook.setAttribute('aria-hidden', 'true');
        }
        if (this.yearReviewToggle) {
            this.yearReviewToggle.classList.remove('active');
            this.yearReviewToggle.setAttribute('aria-expanded', 'false');
        }
    }

    turnReviewPage(direction) {
        if (!this.reviewYears.length || this.isBookFlipping) return;

        const nextIndex = (this.reviewIndex + direction + this.reviewYears.length) % this.reviewYears.length;
        const nextPage = this.reviewYears[nextIndex];

        this.animateBookFlip(direction, nextPage);

        window.setTimeout(() => {
            this.reviewIndex = nextIndex;
            this.renderYearReviewBook();
        }, 260);
    }

    animateBookFlip(direction, nextPage) {
        if (!this.yearReviewBook) return;

        this.yearReviewBook.classList.remove('flip-forward', 'flip-back');
        this.isBookFlipping = true;

        if (this.bookTurnYear && nextPage) {
            this.bookTurnYear.textContent = nextPage.year;
        }

        void this.yearReviewBook.offsetWidth;
        this.yearReviewBook.classList.add(direction > 0 ? 'flip-forward' : 'flip-back');

        window.setTimeout(() => {
            if (this.yearReviewBook) {
                this.yearReviewBook.classList.remove('flip-forward', 'flip-back');
            }
            this.isBookFlipping = false;
        }, 720);
    }

    async viewReviewYear() {
        const page = this.reviewYears[this.reviewIndex];
        if (!page) return;

        this.selectedYear = Number(page.year) || this.currentYear;
        this.isReviewMode = this.selectedYear !== this.currentYear;
        await this.fetchVisitorData(this.selectedYear);
        if (this.demoYearsEnabled && !this.visitors.length && page.isDemo) {
            this.visitors = this.createDemoVisitors(this.selectedYear, Number(page.leafCount) || 36);
        }
        this.updateTreeHeading();
        this.renderYearReviewBook();
        this.refreshTree();
    }

    async viewLiveYear() {
        this.selectedYear = this.currentYear;
        this.isReviewMode = false;
        await this.fetchVisitorData(this.currentYear);
        this.updateTreeHeading();
        this.refreshTree();
        this.renderYearReviewBook();
    }

    updateTreeHeading() {
        if (this.treeTitle) {
            this.treeTitle.textContent = this.isReviewMode
                ? `${this.selectedYear} ESG Tree Review`
                : '🌳 ESG Digital Tree';
        }

        if (this.treeSubtitle) {
            this.treeSubtitle.textContent = this.isReviewMode
                ? `Completed yearly tree with ${this.visitors.length} contribution${this.visitors.length === 1 ? '' : 's'}`
                : (this.activeCampaign?.treeSubtitle || `Growing with every visitor's contribution in ${this.currentYear}`);
        }
    }

    renderYearReviewBook() {
        if (!this.yearReviewBook || !this.bookYear || !this.bookCount || !this.reviewTreePreview) return;

        const page = this.reviewYears[this.reviewIndex] || {
            year: this.currentYear,
            leafCount: this.visitors.length,
            isCurrentYear: true
        };
        const leafCount = Number(page.leafCount) || 0;

        this.bookYear.textContent = page.year;
        this.bookCount.textContent = `${leafCount} ${leafCount === 1 ? 'leaf' : 'leaves'}`;
        this.reviewTreePreview.innerHTML = '';

        const dotCount = Math.min(leafCount, 90);
        for (let i = 0; i < dotCount; i++) {
            const dot = document.createElement('span');
            dot.className = 'review-leaf-dot';
            const random = this.createSeededRandom(`${page.year}|review-dot|${i}`);
            const angle = random() * Math.PI * 2;
            const radius = Math.sqrt(random());
            const x = 50 + Math.cos(angle) * radius * 33;
            const y = 35 + Math.sin(angle) * radius * 22;

            dot.style.left = `${x}%`;
            dot.style.top = `${y}%`;
            this.reviewTreePreview.appendChild(dot);
        }

        if (this.bookViewButton) {
            this.bookViewButton.textContent = Number(page.year) === this.currentYear ? 'View Live' : 'View Tree';
        }

        if (this.bookLiveButton) {
            this.bookLiveButton.classList.toggle('active', !this.isReviewMode);
        }
    }

    createDemoVisitors(year, count) {
        const badgeKeys = Object.keys(this.badgeLeafProfiles);
        return Array.from({ length: count }, (_, index) => {
            const badgeKey = badgeKeys[index % badgeKeys.length];
            const month = String((index % 12) + 1).padStart(2, '0');
            const day = String((index % 26) + 1).padStart(2, '0');

            return {
                id: `demo-${year}-${index + 1}`,
                name: `Visitor ${index + 1}`,
                visit_count: 1 + (index % 4),
                created_at: `${year}-${month}-${day}T10:00:00.000Z`,
                isVip: false,
                badgeKey,
                badgeName: this.badgeLeafProfiles[badgeKey].label,
                badgeColor: '',
                pledgeTopic: '',
                pledgeSnippet: 'Demo pledge snippet for the yearly review tree.',
                hasPublicName: false,
                privacyLabel: 'Demo visitor'
            };
        });
    }

    // ==================== LEAF DETAIL CARD ====================

    bindLeafDetailControls() {
        if (this.leafDetailClose) {
            this.leafDetailClose.addEventListener('click', () => this.closeLeafDetail());
        }
        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') this.closeLeafDetail();
        });
    }

    bindLeafClick() {
        if (!this.treeCanvas) return;

        let downX = 0;
        let downY = 0;

        this.treeCanvas.addEventListener('pointerdown', (event) => {
            downX = event.clientX;
            downY = event.clientY;
        });

        this.treeCanvas.addEventListener('pointerup', (event) => {
            // Ignore drags (orbit/zoom) — only treat tiny movements as clicks
            const moved = Math.hypot(event.clientX - downX, event.clientY - downY);
            if (moved > 6 || !this.treeScene) return;

            const hit = this.treeScene.pickLeaf(event.clientX, event.clientY);
            if (!hit || hit.visitorIndex === null || hit.visitorIndex === undefined) return;

            const visitor = this.visitors[hit.visitorIndex];
            if (visitor) this.openLeafDetail(visitor);
        });
    }

    formatLeafDate(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Date unavailable';
        return date.toLocaleDateString('en-SG', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    openLeafDetail(visitor) {
        if (!this.leafDetailCard) return;

        const badgeProfile = this.getBadgeLeafProfile(visitor);
        const badgeName = visitor.badgeName || badgeProfile.label || 'Feedback Contributor';
        const snippet = visitor.pledgeSnippet || 'No pledge snippet was shared for this leaf.';

        if (this.leafDetailPrivacy) {
            this.leafDetailPrivacy.textContent = visitor.privacyLabel || 'Leaf details';
        }
        if (this.leafDetailName) {
            this.leafDetailName.textContent = visitor.name || 'Anonymous visitor';
        }
        if (this.leafDetailBadge) {
            this.leafDetailBadge.textContent = badgeName;
            this.leafDetailBadge.style.setProperty('--leaf-detail-badge-color', this.getBadgeLeafColor(visitor));
        }
        if (this.leafDetailDate) {
            this.leafDetailDate.textContent = this.formatLeafDate(visitor.created_at);
        }
        if (this.leafDetailSnippet) {
            this.leafDetailSnippet.textContent = snippet;
        }

        this.leafDetailCard.classList.add('active');
        this.leafDetailCard.setAttribute('aria-hidden', 'false');
    }

    closeLeafDetail() {
        if (!this.leafDetailCard) return;
        this.leafDetailCard.classList.remove('active');
        this.leafDetailCard.setAttribute('aria-hidden', 'true');
    }

    // ==================== RENDERER HOOK ====================

    async initTreeScene() {
        if (this.treeScene || !this.treeCanvas) return;

        try {
            const { TreeScene } = await import('./treeScene.js');
            this.treeScene = new TreeScene();
            await this.treeScene.init(this.treeCanvas);
            this.treeScene.setStage(this.treeStage);
            this.refreshTree();
        } catch (error) {
            console.error('Failed to initialize Three.js tree scene:', error);
        }
    }

    // Build plain leaf descriptors for the Three.js scene.
    // Mirrors the 2D tree's image selection: VIP gold leaves, New/Old by
    // submission age, badge-preferred side, admin overrides, badge tint.
    buildLeafDescriptors() {
        return this.visitors.map((visitor, index) => {
            const isVip = Boolean(visitor.isVip) || this.isVipName(visitor.name);
            const badgeProfile = this.getBadgeLeafProfile(visitor);
            const visitorSeed = String(visitor.id ?? visitor.name ?? `visitor-${index}`);
            const seededRandom = this.createSeededRandom(`${visitorSeed}|leaf`);

            const side = badgeProfile.preferredSide || (seededRandom() > 0.5
                ? 'LeftLeaf.png'
                : 'RightLeaf.png');

            const createdAt = new Date(visitor.created_at);
            const diffInMinutes = (Date.now() - createdAt.getTime()) / 60000;

            let leafFile;
            if (isVip) {
                leafFile = 'Gold' + side;
            } else {
                leafFile = (diffInMinutes >= 0 && diffInMinutes <= 2 ? 'New' : 'Old') + side;
            }

            const leafBasePath = isVip ? '/assets/Tree/vip-leaf' : '/assets/Tree/leaf';
            const leafOverrideImage = isVip ? this.vipLeafOverrideImage : this.leafOverrideImage;
            const url = leafOverrideImage || `${leafBasePath}/${leafFile}`;

            const withinTintWindow = !isVip
                && Number.isFinite(createdAt.getTime())
                && (Date.now() - createdAt.getTime()) >= 0
                && (Date.now() - createdAt.getTime()) <= this.badgeTintDurationMs;
            const tint = withinTintWindow ? this.getBadgeLeafColor(visitor) : null;

            const baseLeafSize = 80 + ((visitor.visit_count || 1) * 5);
            const scale = isVip ? this.vipLeafDisplayScale : this.leafDisplayScale;
            const sizePx = Math.max(8, Math.round(baseLeafSize * (Number.isFinite(scale) ? scale : 1)));

            return {
                url,
                tint,
                sizePx,
                name: visitor.name || 'Anonymous',
                seed: `${visitorSeed}|leaf|${index}`,
                visitorIndex: index,
                opacity: this.leafOpacity
            };
        });
    }

    refreshTree() {
        // Reserved for the upcoming three.js leaf system.
        if (this.treeScene) {
            this.treeScene.setStage(this.treeStage);
            this.treeScene.refresh(this.buildLeafDescriptors());
        }
    }
}

// ==================== GLOBAL ====================

let treeManager;

// ==================== EVENT LISTENERS ====================

window.addEventListener('load', () => {
    treeManager = new TreeManager();
});

let treeRefreshTimer;

function triggerTreeVipRefresh() {
    if (!treeManager) return;

    Promise.all([
        treeManager.fetchVipNames(),
        treeManager.fetchYearReviewData(),
        treeManager.fetchVisitorData(treeManager.isReviewMode ? treeManager.selectedYear : treeManager.currentYear)
    ]).then(() => {
        treeManager.updateTreeHeading();
        treeManager.renderYearReviewBook();
        treeManager.refreshTree();
    }).catch((error) => {
        console.warn('VIP refresh failed:', error);
    });
}

function refreshTreeFromServer() {
    if (treeManager) {
        const yearToRefresh = treeManager.isReviewMode ? treeManager.selectedYear : treeManager.currentYear;

        Promise.all([
            treeManager.fetchParameterConfig(),
            treeManager.fetchVipNames(),
            treeManager.fetchYearReviewData(),
            treeManager.fetchVisitorData(yearToRefresh)
        ]).then(() => {
            treeManager.updateTreeHeading();
            treeManager.renderYearReviewBook();
            treeManager.refreshTree();
        }).catch((error) => {
            console.warn('Tree refresh failed:', error);
        }).finally(() => {
            scheduleTreeRefresh();
        });
    } else {
        scheduleTreeRefresh();
    }
}

function scheduleTreeRefresh() {
    window.clearTimeout(treeRefreshTimer);
    const interval = Math.max(5000, Number(treeManager?.leafRefreshInterval) || 30000);
    treeRefreshTimer = window.setTimeout(refreshTreeFromServer, interval);
}

scheduleTreeRefresh();

window.addEventListener('tree-vip-refresh', triggerTreeVipRefresh);
window.addEventListener('storage', (event) => {
    if (event.key === 'tree-vip-refresh') {
        triggerTreeVipRefresh();
    }
});

window.addEventListener('resize', () => {
    if (treeManager) {
        setTimeout(() => {
            treeManager.refreshTree();
        }, 150);
    }
});
