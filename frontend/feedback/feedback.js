
// ==================== 1. GLOBAL VARIABLES & CONSTANTS ====================
const LONG_TERM_RETENTION = 'longterm';
let selectedRetention = LONG_TERM_RETENTION;
let selectedTheme = 'nature';
let userData = {};
let stream = null;
let photoData = null;
// Boomerang capture state - changes made by nick
let captureMode = 'photo';
let boomerangFrames = [];
let restorableBoomerangFrames = []; // Keeps captured GIF frames when visitor previews a still photo (DONE BY NICK)
let boomerangPreviewInterval = null;
let boomerangPreviewPaused = false; // Boomerang preview pause/resume state (DONE BY NICK)
let boomerangPreviewPhotoElement = null; // Remember current GIF preview target (DONE BY NICK)
const BOOMERANG_FRAME_COUNT = 10;
const DEFAULT_BOOMERANG_FRAME_DELAY_MS = 90; // Admin-controlled boomerang default - changes made by nick
const BOOMERANG_GIF_MAX_FRAMES = 18; // Email-friendly animated GIF frame cap - changes made by nick
const BOOMERANG_QUALITY_PRESETS = { compact: 10, medium: 18, high: 24 }; // Admin quality presets (DONE BY NICK)
const GIF_RED_LEVELS = 6; // Balanced GIF colour palette to reduce boomerang discoloration - changes made by nick
const GIF_GREEN_LEVELS = 7; // Extra green level keeps skin and nature overlays less posterized - changes made by nick
const GIF_BLUE_LEVELS = 6; // More blue levels fixes purple/green cast in emailed GIFs - changes made by nick
let currentDevice = 'desktop'; // 'desktop' or 'mobile'
let inactivityTimer = null;
let idleWarningTimer = null;
let idleWarningInterval = null;
const INACTIVITY_TIMEOUT = 60000; // 1 minute kiosk reset timeout
const IDLE_WARNING_SECONDS = 10;
let countdownSeconds = null; // Loaded from backend when needed (DONE BY BERNISSA)
let overlayData = {}; // Store full overlay data including file paths from database 
let kioskParameters = {};
let kioskParametersLoadPromise = null;
let isMirrored = false; // to invert camera done by nick
let beautyFilterEnabled = true; // beauty filter toggle done by nick
let beautyFilterStrength = 'medium'; // visitor beauty filter strength - changes made by nick
let visitorCountdownEnabled = true;  // Countdown toggle on photo page
let photoStripEnabled = false;       // Photo strip toggle on photo page
let selectedFaceAccessory = 'none';
let faceLandmarker = null;
let faceLandmarkerLoadPromise = null;
let faceAccessoryAnimationFrame = null;
let latestFaceAccessoryLandmarks = null;
let latestFaceAccessoryVideoTime = -1;
const LOST_FOUND_PROGRESS_KEY = 'rpLostFoundFeedbackProgress'; // changes made by nick
const LOST_FOUND_PENDING_KEY = 'rpPendingLostFoundReports'; // changes made by nick
let lostFoundPhotoDataUrl = null; // Optional Lost & Found item photo payload (DONE BY NICK)
let lostFoundPhotoName = ''; // Original Lost & Found item photo filename (DONE BY NICK)
let lostFoundPhotoReadPromise = Promise.resolve(true); // Wait for Lost & Found photo reads before saving (DONE BY NICK)
const RP_BEAR_VOICE_KEY = 'rpBearVoiceEnabled'; // RP guide voice preference (DONE BY NICK)
let rpBearVoiceEnabled = localStorage.getItem(RP_BEAR_VOICE_KEY) === 'true'; // RP guide audio toggle (DONE BY NICK)
const MEDIAPIPE_TASKS_VISION_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest';
const MEDIAPIPE_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const FACE_LANDMARKER_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task';
// Swipeable animated face filter options - changes made by nick
const FACE_ACCESSORY_OPTIONS = [
    { id: 'none', label: 'No filter' },
    { id: 'glasses', label: 'Glasses' },
    { id: 'sparkle-glasses', label: 'Sparkle glasses' },
    { id: 'moustache', label: 'Moustache' },
    { id: 'hat', label: 'Hat' },
    { id: 'flower-crown', label: 'Flower crown' },
    { id: 'halo', label: 'Halo glow' },
    { id: 'blush', label: 'Blush' },
    { id: 'party', label: 'Party pop' },
    { id: 'rp-shades', label: 'RP shades' },
    { id: 'leaf-crown', label: 'Leaf crown' },
    { id: 'graduation', label: 'Graduation cap' }
];
const FACE_ACCESSORY_IDS = FACE_ACCESSORY_OPTIONS.map(option => option.id);
let faceFilterScrollTimer = null;
let qrRefreshTimer = null;
let landingVisitorCountTimer = null; // Live visitor count refresh loop (DONE BY NICK)
const BEAUTY_FILTER_PRESETS = {
    light: {
        liveFilter: 'brightness(1.08) contrast(0.92) saturate(1.12)',
        baseFilter: 'brightness(1.08) contrast(0.92) saturate(1.12)',
        smoothFilter: 'blur(3px) brightness(1.08) contrast(0.88) saturate(1.08)',
        detailFilter: 'contrast(1.02) saturate(1.04)',
        faceSmoothFilter: 'blur(6px) brightness(1.08) contrast(0.88) saturate(1.06)',
        smoothAlpha: 0.18,
        faceSmoothAlpha: 0.1,
        detailAlpha: 0.08,
        tintAlpha: 0.04,
        faceSlimRatio: 0.94
    },
    medium: {
        liveFilter: 'brightness(1.2) contrast(0.82) saturate(1.28) blur(0.8px)',
        baseFilter: 'brightness(1.2) contrast(0.82) saturate(1.28)',
        smoothFilter: 'blur(7px) brightness(1.18) contrast(0.78) saturate(1.2)',
        detailFilter: 'contrast(1.02) saturate(1.08)',
        faceSmoothFilter: 'blur(12px) brightness(1.16) contrast(0.78) saturate(1.12)',
        smoothAlpha: 0.38,
        faceSmoothAlpha: 0.18,
        detailAlpha: 0.12,
        tintAlpha: 0.08,
        faceSlimRatio: 0.84
    },
    strong: {
        liveFilter: 'brightness(1.28) contrast(0.74) saturate(1.38) blur(1.1px)',
        baseFilter: 'brightness(1.28) contrast(0.74) saturate(1.38)',
        smoothFilter: 'blur(10px) brightness(1.24) contrast(0.72) saturate(1.28)',
        detailFilter: 'contrast(1.03) saturate(1.1)',
        faceSmoothFilter: 'blur(16px) brightness(1.22) contrast(0.72) saturate(1.16)',
        smoothAlpha: 0.48,
        faceSmoothAlpha: 0.24,
        detailAlpha: 0.14,
        tintAlpha: 0.1,
        faceSlimRatio: 0.78
    }
}; // visitor-adjustable beauty filter presets - changes made by nick
const PLEDGE_COACH_TOPIC_SUGGESTIONS = {
    'climate-change': 'Take public transport or walk for 2 trips this week.',
    'renewable-energy': 'Switch off unused lights and chargers every day this week.',
    'sustainable-living': 'Bring a reusable bottle for 3 school days this week.',
    'ocean-conservation': 'Avoid single-use plastic for lunch 3 times this week.',
    'ethical-governance': 'Share one responsible sustainability habit with a friend this week.',
    'community-impact': 'Invite one friend to join a green habit with me this week.'
};
let pledgeCoachSuggestion = '';

const PLEDGE_TOPIC_LABELS = {
    'climate-change': 'Climate Change',
    'renewable-energy': 'Renewable Energy',
    'sustainable-living': 'Sustainable Living',
    'ocean-conservation': 'Ocean Conservation',
    'ethical-governance': 'Ethical Governance',
    'community-impact': 'Community Impact'
};

function getSelectedPledgeTopics() {
    return Array.from(document.querySelectorAll('input[name="pledge-topics"]:checked'))
        .map(input => input.value)
        .filter(value => PLEDGE_TOPIC_LABELS[value]);
}

function syncPledgeTopicField() {
    const selectedTopics = getSelectedPledgeTopics();
    const hiddenTopic = document.getElementById('pledge-topic');
    if (hiddenTopic) hiddenTopic.value = selectedTopics[0] || '';
    return selectedTopics;
}

function formatPledgeTopicLabel(topic) {
    return PLEDGE_TOPIC_LABELS[topic] || String(topic || '')
        .split('-')
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function formatPledgeTopicList(topics) {
    const labels = (Array.isArray(topics) ? topics : [])
        .map(formatPledgeTopicLabel)
        .filter(Boolean);
    return labels.join(', ');
}

const FLOW_STEPS = [
    { key: 'details', label: 'Details', pageIds: ['details-page'] },
    { key: 'feedback', label: 'Feedback', pageIds: ['feedback-page'] },
    { key: 'pledge', label: 'Pledge', pageIds: ['pledge-page'] },
    { key: 'photo', label: 'Photo', pageIds: ['photo-choice-page', 'photo-page', 'file-upload-page', 'style-page'] },
    { key: 'confirm', label: 'Confirm', pageIds: ['confirmation-page'] }
];
const FLOW_PAGE_IDS = FLOW_STEPS.flatMap(step => step.pageIds).concat(['thankyou-page']);
const FLOW_SLIDE_TRANSITION_MS = 380; // Smooth multi-step form slide timing - changes made by nick
let activeFlowPageId = null; // Track current visible form step for slide direction - changes made by nick
let flowSlideTransitionTimer = null; // Prevent overlapping page transition cleanup - changes made by nick
// Interactive RP teddy bear companion messages - changes made by nick
let rpBearSpeechTimer = null;
let rpBearInteractionCount = 0;
let rpBearLastPageId = null; // Guided companion page memory - changes made by nick
const RP_BEAR_PAGE_MESSAGES = {
    'details-page': 'Hi, I am Beary from RP. Add your name and email, then I will guide you onward.',
    'feedback-page': 'Time for feedback. Answer the cards honestly; quick answers are okay.',
    'pledge-page': 'Choose a focus and make one small pledge. I can suggest one if you tap a tip.',
    'photo-choice-page': 'Pick your keepsake moment. Photo, boomerang, upload, or skip all work.',
    'photo-page': 'Try a filter, look at the camera, then capture when you are ready.',
    'file-upload-page': 'Upload a clear photo and I will help you move to styling.',
    'style-page': 'Choose a frame you like. This is the memory we will email to you.',
    'confirmation-page': 'Final check. If everything looks good, submit and I will celebrate with you.',
    'thankyou-page': 'You did it. Thanks for adding your voice to the RP community.'
};
const RP_BEAR_TIPS = { // Step-by-step visitor guide tips - changes made by nick
    'details-page': [
        'Use the email you can check later so your keepsake reaches you.',
        'Your name helps personalize the visit summary.'
    ],
    'feedback-page': [
        'If a question has a star, answer it before continuing.',
        'For ratings, tap the option that feels closest. No overthinking needed.'
    ],
    'pledge-page': [
        'A strong pledge has an action, a number, and a timeframe.',
        'Example: Bring a reusable bottle for 3 school days this week.'
    ],
    'photo-choice-page': [
        'Boomerang creates a moving keepsake for your email.',
        'Skipping photo is okay; your feedback still counts.'
    ],
    'photo-page': [
        'Keep your face in the frame until the capture finishes.',
        'Swipe the filter tray to try different animated cosmetics.'
    ],
    'file-upload-page': [
        'Use a bright, clear image for the best frame result.',
        'After upload, choose a style for the final keepsake.'
    ],
    'style-page': [
        'The selected frame is applied before your email is sent.',
        'Boomerangs are saved as animated GIFs for email.'
    ],
    'confirmation-page': [
        'Check your email address before submitting.',
        'You can go back if anything needs changing.'
    ],
    'thankyou-page': [
        'Your email should arrive shortly if email sending is enabled.',
        'Tap home when you are ready for the next visitor.'
    ]
};
const RP_BEAR_LOCALIZED_MESSAGES = { // Multilingual RP guide messages (DONE BY NICK)
    zh: {
        'details-page': '你好，我是RP小熊。填好姓名和电邮，我会带你继续。',
        'feedback-page': '现在回答反馈问题。按真实想法选择就好。',
        'pledge-page': '选择一个环保重点，再写一个小承诺。',
        'photo-choice-page': '选择照片、动图、上传，或跳过照片。',
        'photo-page': '看向镜头，试试滤镜，准备好就拍照。',
        'file-upload-page': '上传清晰照片，然后继续选择样式。',
        'style-page': '选择你喜欢的相框，这会成为你的纪念照。',
        'confirmation-page': '最后检查一次。没问题就提交。',
        'thankyou-page': '完成了。谢谢你为RP社区发声。'
    },
    ms: {
        'details-page': 'Hai, saya Beary dari RP. Isi nama dan e-mel, kemudian saya bantu langkah seterusnya.',
        'feedback-page': 'Masa untuk maklum balas. Jawab dengan jujur dan ringkas.',
        'pledge-page': 'Pilih fokus dan tulis satu ikrar kecil yang boleh dibuat.',
        'photo-choice-page': 'Pilih foto, boomerang, muat naik, atau langkau foto.',
        'photo-page': 'Pandang kamera, cuba penapis, kemudian ambil foto.',
        'file-upload-page': 'Muat naik foto yang jelas, kemudian pilih gaya.',
        'style-page': 'Pilih bingkai kegemaran anda untuk kenangan ini.',
        'confirmation-page': 'Semak kali terakhir. Jika semuanya betul, hantar.',
        'thankyou-page': 'Selesai. Terima kasih kerana menyumbang kepada komuniti RP.'
    },
    ta: {
        'details-page': 'வணக்கம், நான் RP Beary. பெயரும் மின்னஞ்சலும் நிரப்புங்கள்; அடுத்த படிக்கு உதவுவேன்.',
        'feedback-page': 'இப்போது கருத்தை பகிருங்கள். உண்மையாகவும் சுருக்கமாகவும் பதிலளிக்கலாம்.',
        'pledge-page': 'ஒரு ESG கவனத்தைத் தேர்ந்து, சிறிய உறுதியை எழுதுங்கள்.',
        'photo-choice-page': 'புகைப்படம், பூமராங், பதிவேற்றம் அல்லது தவிர்க்கலாம்.',
        'photo-page': 'கேமராவை நோக்கி, வடிகட்டியை முயற்சி செய்து படம் எடுக்கவும்.',
        'file-upload-page': 'தெளிவான புகைப்படத்தை பதிவேற்றி, பாணியைத் தேர்ந்தெடுக்கவும்.',
        'style-page': 'உங்களுக்கு பிடித்த சட்டகத்தைத் தேர்ந்தெடுக்கவும்.',
        'confirmation-page': 'கடைசியாக சரிபார்க்கவும். சரி என்றால் சமர்ப்பிக்கவும்.',
        'thankyou-page': 'முடிந்தது. RP சமூகத்திற்காக உங்கள் குரலை பகிர்ந்ததற்கு நன்றி.'
    }
};
const RP_BEAR_LOCALIZED_TIPS = { // Multilingual RP guide tips (DONE BY NICK)
    zh: {
        'details-page': ['使用你能查看的电邮，这样纪念照会发送给你。'],
        'feedback-page': ['如果题目有星号，请先回答再继续。'],
        'pledge-page': ['好的承诺包含行动、数量和时间。'],
        'photo-page': ['拍摄结束前，请把脸保持在画面中。'],
        'style-page': ['选中的相框会用于最后的电邮纪念照。']
    },
    ms: {
        'details-page': ['Gunakan e-mel yang boleh anda semak supaya kenangan sampai kepada anda.'],
        'feedback-page': ['Jika soalan bertanda bintang, jawab dahulu sebelum teruskan.'],
        'pledge-page': ['Ikrar yang kuat ada tindakan, nombor dan tempoh masa.'],
        'photo-page': ['Pastikan muka anda dalam bingkai sehingga tangkapan selesai.'],
        'style-page': ['Bingkai yang dipilih akan digunakan dalam kenangan e-mel anda.']
    },
    ta: {
        'details-page': ['நினைவுப் படம் சேர வேண்டிய மின்னஞ்சலை பயன்படுத்துங்கள்.'],
        'feedback-page': ['நட்சத்திரம் உள்ள கேள்விக்கு தொடர்வதற்கு முன் பதிலளிக்கவும்.'],
        'pledge-page': ['வலுவான உறுதியில் செயல், எண், காலக்கெடு இருக்கும்.'],
        'photo-page': ['படம் எடுக்கும் வரை முகத்தை சட்டகத்துக்குள் வைத்திருக்கவும்.'],
        'style-page': ['தேர்ந்த சட்டகம் மின்னஞ்சல் நினைவில் பயன்படுத்தப்படும்.']
    }
};
const RP_BEAR_PAGE_ACTIONS = { // Interactive teddy guide quick actions - changes made by nick
    'details-page': [{ label: 'What next?', message: 'Fill in your details, then tap Continue to Feedback.' }],
    'feedback-page': [{ label: 'Help', message: 'Answer each visible question. I will point out anything missing.' }],
    'pledge-page': [{ label: 'Pledge tip', message: 'Try: I will do one clear action at least 3 times this week.' }],
    'photo-choice-page': [{ label: 'Boomerang?', message: 'Boomerang records a short moving keepsake and sends it as a GIF.' }],
    'photo-page': [{ label: 'Photo tip', message: 'Face the camera, stay still for a moment, then tap Capture.' }],
    'file-upload-page': [{ label: 'Upload tip', message: 'Choose a clear photo, then continue to style selection.' }],
    'style-page': [{ label: 'Style tip', message: 'Pick the frame you like best. I will remember it for the email.' }],
    'confirmation-page': [{ label: 'Check', message: 'Name, email, pledge, answers, and photo are ready for final submit.' }],
    'thankyou-page': [{ label: 'Yay', message: 'Thank you for finishing the visit. That was a smooth run.' }]
};
const RP_BEAR_CELEBRATIONS = [
    'Nice, that step is done.',
    'Good progress. I am right here with you.',
    'That was smooth. Next stop coming up.',
    'Great, you are moving through the form nicely.'
];

function getStepForPage(pageId) {
    return FLOW_STEPS.find(step => step.pageIds.includes(pageId));
}

function getFlowPageOrderIndex(pageId) {
    const index = FLOW_PAGE_IDS.indexOf(pageId);
    return index === -1 ? FLOW_PAGE_IDS.length : index;
}

function getVisibleFlowPageId() {
    return FLOW_PAGE_IDS.find(id => {
        const page = document.getElementById(id);
        return page && page.style.display !== 'none';
    }) || null;
}

function clearFlowSlideClasses(page) {
    if (!page) return;
    page.classList.remove(
        'flow-slide-transitioning',
        'flow-slide-enter-right',
        'flow-slide-enter-left',
        'flow-slide-exit-left',
        'flow-slide-exit-right'
    );
}

function shouldSkipFlowSlideTransition(currentPage, nextPage) {
    return !currentPage ||
        !nextPage ||
        currentPage === nextPage ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function updateProgressIndicator(activePageId) {
    const activeStep = getStepForPage(activePageId);
    if (!activeStep) return;

    const activeIndex = FLOW_STEPS.findIndex(step => step.key === activeStep.key);
    document.querySelectorAll('.step-progress').forEach(progress => {
        progress.querySelectorAll('.progress-step').forEach((stepEl, index) => {
            stepEl.classList.toggle('active', index === activeIndex);
            stepEl.classList.toggle('complete', index < activeIndex);
        });
    });
}

function getRpBearLanguageCode() { // Speech language mapping for RP guide (DONE BY NICK)
    const language = typeof currentLanguage === 'string' ? currentLanguage : 'en';
    return {
        en: 'en-SG',
        zh: 'zh-CN',
        ms: 'ms-MY',
        ta: 'ta-IN'
    }[language] || 'en-SG';
}

function getRpBearPageMessage(pageId) { // Multilingual RP guide message resolver (DONE BY NICK)
    const language = typeof currentLanguage === 'string' ? currentLanguage : 'en';
    return RP_BEAR_LOCALIZED_MESSAGES[language]?.[pageId] ||
        RP_BEAR_PAGE_MESSAGES[pageId] ||
        'I am here if you need a nudge.';
}

function speakRpBearMessage(message) { // Optional RP guide voice prompt (DONE BY NICK)
    if (!rpBearVoiceEnabled || !('speechSynthesis' in window) || !message) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = getRpBearLanguageCode();
    utterance.rate = 0.96;
    utterance.pitch = 1.04;
    window.speechSynthesis.speak(utterance);
}

function updateRpBearVoiceToggle() { // RP guide voice toggle UI (DONE BY NICK)
    const toggle = document.getElementById('rp-bear-voice-toggle');
    if (!toggle) return;
    toggle.setAttribute('aria-pressed', rpBearVoiceEnabled ? 'true' : 'false');
    toggle.classList.toggle('active', rpBearVoiceEnabled);
    toggle.innerHTML = `
        <i class="fa-solid ${rpBearVoiceEnabled ? 'fa-volume-high' : 'fa-volume-xmark'}" aria-hidden="true"></i>
        <span>Voice</span>
    `;
}

function toggleRpBearVoice() { // Visitor-controlled RP guide audio toggle (DONE BY NICK)
    rpBearVoiceEnabled = !rpBearVoiceEnabled;
    localStorage.setItem(RP_BEAR_VOICE_KEY, String(rpBearVoiceEnabled));
    updateRpBearVoiceToggle();
    setRpBearSpeech(rpBearVoiceEnabled ? 'Voice guide is on.' : 'Voice guide is off.', true);
}

function setRpBearSpeech(message, shouldPop = false) { // changes made by nick
    const companion = document.getElementById('rp-bear-companion');
    const speech = document.getElementById('rp-bear-speech');
    if (!companion || !speech) return;

    speech.textContent = message;
    speakRpBearMessage(message);
    companion.classList.add('is-speaking');

    if (shouldPop) {
        companion.classList.remove('is-excited', 'is-waving');
        void companion.offsetWidth;
        companion.classList.add('is-excited', 'is-waving');
    }

    if (rpBearSpeechTimer) {
        clearTimeout(rpBearSpeechTimer);
    }

    rpBearSpeechTimer = setTimeout(() => {
        companion.classList.remove('is-speaking', 'is-excited', 'is-waving');
        rpBearSpeechTimer = null;
    }, shouldPop ? 3600 : 2600);
}

function getRpBearStepText(pageId) { // changes made by nick
    const step = getStepForPage(pageId);
    if (!step) {
        return pageId === 'thankyou-page' ? 'Complete' : 'Guide';
    }

    const stepIndex = FLOW_STEPS.findIndex(item => item.key === step.key);
    return `Step ${stepIndex + 1} of ${FLOW_STEPS.length}: ${step.label}`;
}

function getRpBearTip(pageId) { // changes made by nick
    const language = typeof currentLanguage === 'string' ? currentLanguage : 'en';
    const tips = RP_BEAR_LOCALIZED_TIPS[language]?.[pageId] || RP_BEAR_TIPS[pageId] || ['Tap me any time for a small hint.'];
    const tipIndex = rpBearInteractionCount % tips.length;
    return tips[tipIndex];
}

function renderRpBearActions(pageId) { // changes made by nick
    const actions = document.getElementById('rp-bear-actions');
    if (!actions) return;

    const pageActions = RP_BEAR_PAGE_ACTIONS[pageId] || [{ label: 'Tip', message: getRpBearTip(pageId) }];
    actions.innerHTML = pageActions.map((action, index) => `
        <span
            class="rp-bear-action"
            data-bear-action-index="${index}"
        >${action.label}</span>
    `).join('');
}

function setRpBearMood(mood) { // changes made by nick
    const companion = document.getElementById('rp-bear-companion');
    if (!companion) return;
    companion.classList.remove('mood-thinking', 'mood-success', 'mood-alert');
    if (mood) companion.classList.add(`mood-${mood}`);
}

function cheerRpBear(message) { // changes made by nick
    setRpBearMood('success');
    setRpBearSpeech(message, true);
    setTimeout(() => setRpBearMood(null), 2400);
}

function nudgeRpBear(message) { // changes made by nick
    setRpBearMood('alert');
    setRpBearSpeech(message, true);
    setTimeout(() => setRpBearMood(null), 3000);
}

function updateRpBearCompanion(pageId) { // changes made by nick
    const companion = document.getElementById('rp-bear-companion');
    const progress = document.getElementById('rp-bear-progress');
    if (!companion) return;

    const shouldShow = FLOW_PAGE_IDS.includes(pageId);
    companion.hidden = !shouldShow;

    if (!shouldShow) {
        companion.classList.remove('is-speaking', 'is-excited', 'is-waving', 'mood-thinking', 'mood-success', 'mood-alert');
        rpBearLastPageId = null;
        return;
    }

    if (progress) progress.textContent = getRpBearStepText(pageId);
    renderRpBearActions(pageId);
    setRpBearMood(pageId === 'confirmation-page' ? 'thinking' : null);
    setRpBearSpeech(getRpBearPageMessage(pageId), pageId !== rpBearLastPageId);
    rpBearLastPageId = pageId;
}

function setupRpBearCompanion() { // changes made by nick
    const companion = document.getElementById('rp-bear-companion');
    if (!companion) return;

    companion.addEventListener('click', (event) => {
        const voiceToggle = event.target.closest('#rp-bear-voice-toggle');
        if (voiceToggle) {
            event.preventDefault();
            toggleRpBearVoice();
            resetInactivityTimer();
            return;
        }

        const actionTarget = event.target.closest('.rp-bear-action');
        const pageId = activeFlowPageId || getVisibleFlowPageId();
        if (actionTarget) {
            const pageActions = RP_BEAR_PAGE_ACTIONS[pageId] || [];
            const action = pageActions[Number(actionTarget.dataset.bearActionIndex)] || { message: getRpBearTip(pageId) };
            setRpBearSpeech(action.message, true);
            resetInactivityTimer();
            return;
        }

        const message = getRpBearTip(pageId);
        rpBearInteractionCount += 1;
        setRpBearSpeech(message, true);
        resetInactivityTimer();
    });

    companion.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            companion.click();
        }
    });

    updateRpBearVoiceToggle();
}

function updateLostFoundShortcut(pageId) { // changes made by nick
    const shortcut = document.getElementById('lost-found-shortcut');
    if (!shortcut) return;
    shortcut.hidden = !FLOW_PAGE_IDS.includes(pageId);
}

function collectLostFoundFeedbackProgress() { // changes made by nick
    const formValues = {};
    document.querySelectorAll('input, textarea, select').forEach((field) => {
        if (!field.id && !field.name) return;
        if (field.closest('#lost-found-modal')) return;

        const key = field.id || field.name;
        if (field.type === 'checkbox') {
            if (!formValues[key]) formValues[key] = [];
            if (field.checked) formValues[key].push(field.value);
            return;
        }
        if (field.type === 'radio') {
            if (field.checked) formValues[key] = field.value;
            return;
        }
        formValues[key] = field.value;
    });

    return {
        savedAt: new Date().toISOString(),
        activePageId: activeFlowPageId || getVisibleFlowPageId(),
        selectedRetention,
        selectedTheme,
        captureMode,
        selectedFaceAccessory,
        userData: { ...userData },
        hasPhoto: Boolean(photoData || userData.processedPhoto || userData.photoId || userData.processedPhotoId),
        formValues
    };
}

function saveLostFoundFeedbackProgress() { // changes made by nick
    try {
        sessionStorage.setItem(LOST_FOUND_PROGRESS_KEY, JSON.stringify(collectLostFoundFeedbackProgress()));
    } catch (error) {
        console.warn('Unable to save feedback progress before Lost & Found:', error);
    }
}

function openLostFoundModal() { // changes made by nick
    saveLostFoundFeedbackProgress();
    hideIdleWarning();

    const modal = document.getElementById('lost-found-modal');
    const status = document.getElementById('lost-found-status');
    const itemInput = document.getElementById('lost-found-item');
    if (!modal) return;

    if (status) status.textContent = '';
    updateLostFoundSyncStatus();
    modal.style.display = 'flex';
    document.body.classList.add('lost-found-open');
    if (itemInput) itemInput.focus();
    resetInactivityTimer();
}

function closeLostFoundModal() { // changes made by nick
    const modal = document.getElementById('lost-found-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    document.body.classList.remove('lost-found-open');
    resetInactivityTimer();
}

function updateLostFoundSyncStatus() { // Offline Lost & Found queue status (DONE BY NICK)
    const panel = document.getElementById('lost-found-sync-panel');
    const label = document.getElementById('lost-found-sync-status');
    if (!panel || !label) return;

    const pendingCount = getPendingLostFoundReports().length;
    panel.hidden = pendingCount === 0;
    label.textContent = pendingCount === 0
        ? 'No queued reports.'
        : `${pendingCount} report${pendingCount === 1 ? '' : 's'} waiting to sync.`;
}

function clearLostFoundPhoto(clearInput = true) { // Clear optional item photo preview (DONE BY NICK)
    lostFoundPhotoDataUrl = null;
    lostFoundPhotoName = '';
    lostFoundPhotoReadPromise = Promise.resolve(true);
    const input = document.getElementById('lost-found-photo');
    const preview = document.getElementById('lost-found-photo-preview');
    const previewImg = document.getElementById('lost-found-photo-preview-img');
    if (clearInput && input) input.value = '';
    if (previewImg) previewImg.removeAttribute('src');
    if (preview) preview.hidden = true;
}

function setupLostFoundPhotoPreview() { // Optional item photo reader (DONE BY NICK)
    const input = document.getElementById('lost-found-photo');
    const preview = document.getElementById('lost-found-photo-preview');
    const previewImg = document.getElementById('lost-found-photo-preview-img');
    const status = document.getElementById('lost-found-status');
    if (!input || !preview || !previewImg) return;

    input.addEventListener('change', () => {
        const file = input.files?.[0];
        clearLostFoundPhoto(false); // Keep the selected file available while FileReader loads it (DONE BY NICK)
        if (!file) return;

        const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
        const maxBytes = 2 * 1024 * 1024;
        if (!allowedTypes.has(file.type)) {
            clearLostFoundPhoto();
            if (status) status.textContent = 'Please upload a PNG, JPEG, GIF, or WebP item photo.';
            return;
        }
        if (file.size > maxBytes) {
            clearLostFoundPhoto();
            if (status) status.textContent = 'Item photo must be 2MB or smaller.';
            return;
        }

        const reader = new FileReader();
        if (status) status.textContent = 'Preparing item photo...';
        lostFoundPhotoReadPromise = new Promise((resolve) => {
            reader.onload = () => {
                lostFoundPhotoDataUrl = String(reader.result || '');
                lostFoundPhotoName = file.name;
                previewImg.src = lostFoundPhotoDataUrl;
                preview.hidden = false;
                if (status) status.textContent = 'Item photo attached.';
                resolve(true);
            };
            reader.onerror = () => {
                clearLostFoundPhoto();
                if (status) status.textContent = 'Could not read that item photo. Try another image.';
                resolve(false);
            };
            reader.readAsDataURL(file);
        });
    });
}

function getPendingLostFoundReports() { // changes made by nick
    try {
        return JSON.parse(localStorage.getItem(LOST_FOUND_PENDING_KEY) || '[]');
    } catch (error) {
        console.warn('Unable to read pending Lost & Found reports:', error);
        return [];
    }
}

function savePendingLostFoundReport(report, feedbackProgress) { // changes made by nick
    try {
        const pendingReports = getPendingLostFoundReports();
        pendingReports.push({
            report,
            feedbackProgress,
            queuedAt: new Date().toISOString()
        });
        localStorage.setItem(LOST_FOUND_PENDING_KEY, JSON.stringify(pendingReports.slice(-50)));
        updateLostFoundSyncStatus();
    } catch (error) {
        console.warn('Unable to queue Lost & Found report locally:', error);
        const photoFreeReport = { ...report, itemPhotoDataUrl: null, itemPhotoName: '' };
        try {
            const pendingReports = getPendingLostFoundReports();
            pendingReports.push({
                report: photoFreeReport,
                feedbackProgress,
                queuedAt: new Date().toISOString()
            });
            localStorage.setItem(LOST_FOUND_PENDING_KEY, JSON.stringify(pendingReports.slice(-50)));
            updateLostFoundSyncStatus();
        } catch (fallbackError) {
            console.warn('Unable to queue photo-free Lost & Found report locally:', fallbackError);
        }
    }
}

async function postLostFoundReport(report, feedbackProgress) { // changes made by nick
    const response = await fetch('/api/feedback/lost-found', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report, feedbackProgress })
    });
    const responseText = await response.text();
    let data = {};

    try {
        data = responseText ? JSON.parse(responseText) : {};
    } catch (error) {
        data = { error: responseText.slice(0, 140) };
    }

    if (!response.ok || !data.success) {
        throw new Error(data.error || `Server returned ${response.status}`);
    }

    return data;
}

function lostFoundReportNeedsPhotoWarning(report, result) { // Detect old backend responses that ignored the uploaded item photo (DONE BY NICK)
    return Boolean(report?.itemPhotoDataUrl) && !Boolean(result?.itemPhotoPath);
}

async function syncPendingLostFoundReports() { // changes made by nick
    const pendingReports = getPendingLostFoundReports();
    if (!pendingReports.length) return;

    const remainingReports = [];
    for (const pending of pendingReports) {
        try {
            await postLostFoundReport(pending.report, pending.feedbackProgress);
        } catch (error) {
            remainingReports.push(pending);
        }
    }

    localStorage.setItem(LOST_FOUND_PENDING_KEY, JSON.stringify(remainingReports));
    updateLostFoundSyncStatus();
}

async function submitLostFoundReport(event) { // changes made by nick
    event.preventDefault();

    const type = document.querySelector('input[name="lost-found-type"]:checked')?.value || 'lost';
    const item = document.getElementById('lost-found-item')?.value.trim() || '';
    const location = document.getElementById('lost-found-location')?.value.trim() || '';
    const contact = document.getElementById('lost-found-contact')?.value.trim() || '';
    const details = document.getElementById('lost-found-details')?.value.trim() || '';
    const status = document.getElementById('lost-found-status');

    if (!item || !location || !contact) {
        if (status) status.textContent = 'Please fill in the item, location, and contact fields.';
        return;
    }

    let feedbackProgress = null;
    let report = null;

    try {
        const hasSelectedPhoto = Boolean(document.getElementById('lost-found-photo')?.files?.[0]);
        if (status) status.textContent = hasSelectedPhoto ? 'Saving report and photo...' : 'Saving report...';
        await lostFoundPhotoReadPromise;

        feedbackProgress = collectLostFoundFeedbackProgress();
        report = {
            type,
            item,
            location,
            contact,
            details,
            itemPhotoDataUrl: lostFoundPhotoDataUrl,
            itemPhotoName: lostFoundPhotoName,
            activePageId: feedbackProgress.activePageId,
            submittedAt: new Date().toISOString()
        };

        const result = await postLostFoundReport(report, feedbackProgress);
        await syncPendingLostFoundReports();
        if (status) {
            status.textContent = lostFoundReportNeedsPhotoWarning(report, result)
                ? `Report saved, but the server did not save the photo. Please restart the kiosk/backend server, then submit again. Tracking code: ${result.trackingCode || result.reportId}.`
                : `Report saved. Tracking code: ${result.trackingCode || result.reportId}. You can return to your feedback form now.`;
        }
        const form = document.getElementById('lost-found-form');
        if (form) form.reset();
        clearLostFoundPhoto();
        const lostOption = document.querySelector('input[name="lost-found-type"][value="lost"]');
        if (lostOption) lostOption.checked = true;
    } catch (error) {
        console.warn('Unable to save Lost & Found report:', error);
        if (report && feedbackProgress) savePendingLostFoundReport(report, feedbackProgress);
        if (status) {
            status.textContent = 'Saved on this kiosk. It will sync to admin when the server is available.';
        }
    }
    updateLostFoundSyncStatus();
    resetInactivityTimer();
}

function setupLostFoundModal() { // changes made by nick
    const modal = document.getElementById('lost-found-modal');
    if (!modal) return;

    syncPendingLostFoundReports();
    setupLostFoundPhotoPreview();
    updateLostFoundSyncStatus();

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeLostFoundModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.style.display === 'flex') {
            closeLostFoundModal();
        }
    });
}

function hideLandingPages() {
    ['land-page-no-qrcode', 'land-page-qrcode'].forEach(id => {
        const page = document.getElementById(id);
        if (page) page.style.display = 'none';
    });
}

function showLandingPages() {
    if (flowSlideTransitionTimer) {
        clearTimeout(flowSlideTransitionTimer);
        flowSlideTransitionTimer = null;
    }

    FLOW_PAGE_IDS.forEach(id => {
        const page = document.getElementById(id);
        if (page) {
            clearFlowSlideClasses(page);
            page.style.display = 'none';
        }
    });
    activeFlowPageId = null; // Reset slide tracking when returning to landing - changes made by nick
    closeLostFoundModal();
    updateRpBearCompanion(null);
    updateLostFoundShortcut(null);
    applyFormUIConfig();
    loadLandingVisitorCount(); // Refresh live visitor count on start screen (DONE BY NICK)
}

function showFlowPage(pageId) {
    // Stop boomerang animation when leaving the style preview - changes made by nick
    if (pageId !== 'style-page') {
        stopBoomerangPreview();
    }
    if (pageId !== 'photo-page') {
        stopFaceAccessoryPreview();
    }

    hideLandingPages();
    const nextPage = document.getElementById(pageId);
    const currentPageId = activeFlowPageId || getVisibleFlowPageId();
    const currentPage = currentPageId ? document.getElementById(currentPageId) : null;

    if (flowSlideTransitionTimer) {
        clearTimeout(flowSlideTransitionTimer);
        flowSlideTransitionTimer = null;
    }

    if (shouldSkipFlowSlideTransition(currentPage, nextPage)) {
        FLOW_PAGE_IDS.forEach(id => {
            const page = document.getElementById(id);
            if (!page) return;
            clearFlowSlideClasses(page);
            page.style.display = id === pageId ? 'flex' : 'none';
        });
        activeFlowPageId = pageId;
        updateProgressIndicator(pageId);
        updateRpBearCompanion(pageId);
        updateLostFoundShortcut(pageId);
        return;
    }

    const isForward = getFlowPageOrderIndex(pageId) >= getFlowPageOrderIndex(currentPageId);

    FLOW_PAGE_IDS.forEach(id => {
        const page = document.getElementById(id);
        if (!page) return;
        clearFlowSlideClasses(page);
        if (id !== currentPageId && id !== pageId) {
            page.style.display = 'none';
        }
    });

    currentPage.style.display = 'flex';
    nextPage.style.display = 'flex';
    currentPage.classList.add('flow-slide-transitioning');
    nextPage.classList.add(
        'flow-slide-transitioning',
        isForward ? 'flow-slide-enter-right' : 'flow-slide-enter-left'
    );

    // Force the browser to apply the off-screen starting position before sliding in.
    void nextPage.offsetWidth;

    requestAnimationFrame(() => {
        currentPage.classList.add(isForward ? 'flow-slide-exit-left' : 'flow-slide-exit-right');
        nextPage.classList.remove(isForward ? 'flow-slide-enter-right' : 'flow-slide-enter-left');
    });

    flowSlideTransitionTimer = window.setTimeout(() => {
        clearFlowSlideClasses(currentPage);
        clearFlowSlideClasses(nextPage);
        currentPage.style.display = 'none';
        nextPage.style.display = 'flex';
        activeFlowPageId = pageId;
        updateRpBearCompanion(pageId);
        updateLostFoundShortcut(pageId);
        flowSlideTransitionTimer = null;
    }, FLOW_SLIDE_TRANSITION_MS);

    activeFlowPageId = pageId;
    updateProgressIndicator(pageId);
    updateRpBearCompanion(pageId);
    updateLostFoundShortcut(pageId);
}

function clearValidationMessages() {
    document.querySelectorAll('.field-error, .form-alert').forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
        el.classList.remove('is-visible'); // Reset inline notice animation state - changes made by nick
    });
    document.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    const group = field.closest('.form-group') || field.closest('.question-group');
    if (group) group.classList.add('has-error');

    let error = group ? group.querySelector('.field-error') : null;
    if (!error && group) {
        error = document.createElement('p');
        error.className = 'field-error';
        group.appendChild(error);
    }
    if (error) {
        error.textContent = message;
        error.style.display = 'block';
    }

    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    field.focus({ preventScroll: true });
}

function showFormAlert(formId, message) {
    const alert = document.getElementById(formId);
    if (!alert) return;
    alert.textContent = message;
    alert.style.display = 'block';
    alert.classList.add('is-visible'); // Styled inline notice instead of browser alert - changes made by nick
    alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showVisitorNotice(formId, message, bearMessage = '') { // Replace disruptive browser alerts with inline notices - changes made by nick
    showFormAlert(formId, message);
    if (bearMessage) {
        nudgeRpBear(bearMessage);
    }
}

function initializeProgressIndicators() {
    FLOW_STEPS.forEach((step) => {
        step.pageIds.forEach(pageId => {
            const page = document.getElementById(pageId);
            const card = page?.querySelector('.consent-card, .feedback-form-card, .photo-card, .style-card');
            if (!card || card.querySelector('.step-progress')) return;

            const progress = document.createElement('nav');
            progress.className = 'step-progress';
            progress.setAttribute('aria-label', 'Feedback progress');
            const progressLabels = getDynamicLanguageText().flowSteps;
            progress.innerHTML = FLOW_STEPS.map(item => `
                <div class="progress-step" data-step="${item.key}">
                    <span class="progress-dot"></span>
                    <span class="progress-label">${progressLabels[item.key] || item.label}</span>
                </div>
            `).join('');
            card.prepend(progress);
        });
    });
}


// facial detection (Done by Yu Kang)
const FACE_API_MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model';
let faceDetectionReady = false;
let faceDetectionLoadPromise = null;

function updateFaceDetectionStatus(message, type = 'info', statusElementId = 'face-detection-status') {
    const statusElement = document.getElementById(statusElementId);
    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.className = `face-detection-status ${type}`;
}

async function ensureFaceDetectionReady() {
    if (faceDetectionReady) {
        return true;
    }

    if (faceDetectionLoadPromise) {
        return faceDetectionLoadPromise;
    }

    if (typeof faceapi === 'undefined') {
        throw new Error('face-api.js is not loaded.');
    }

    updateFaceDetectionStatus('Loading face detection...', 'loading');

    faceDetectionLoadPromise = faceapi.nets.tinyFaceDetector
        .loadFromUri(FACE_API_MODEL_URL)
        .then(() => {
            faceDetectionReady = true;
            updateFaceDetectionStatus('Face detection ready.', 'success');
            return true;
        })
        .catch((error) => {
            console.error('Failed to load face detection model:', error);
            updateFaceDetectionStatus('Face detection unavailable. Check network and try again.', 'error');
            throw new Error('Unable to load face detection model. Please check internet access and retry.');
        })
        .finally(() => {
            faceDetectionLoadPromise = null;
        });

    return faceDetectionLoadPromise;
}

async function detectFaceInCurrentFrame() {
    await ensureFaceDetectionReady();

    const video = document.getElementById('video');
    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error('Camera preview is not ready yet.');
    }

    const detection = await faceapi.detectSingleFace(
        video,
        new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.5
        })
    );

    return detection; // return face box for beauty filter done by nick
}

// Feature to detect face in uploaded image (mobile) - done by Yu Kang
function loadImageElement(dataUrl) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Unable to load uploaded image for face detection.'));
        image.src = dataUrl;
    });
}

async function detectFaceInImageData(dataUrl) {
    await ensureFaceDetectionReady();

    const image = await loadImageElement(dataUrl);
    const detection = await faceapi.detectSingleFace(
        image,
        new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.5
        })
    );

    return detection; // return face box for beauty filter done by nick
}

async function ensureFaceLandmarkerReady() {
    if (faceLandmarker) {
        return faceLandmarker;
    }

    if (faceLandmarkerLoadPromise) {
        return faceLandmarkerLoadPromise;
    }

    faceLandmarkerLoadPromise = import(MEDIAPIPE_TASKS_VISION_URL)
        .then(async ({ FaceLandmarker, FilesetResolver }) => {
            updateFaceDetectionStatus('Loading AR face effects...', 'loading');
            const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
            faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: FACE_LANDMARKER_MODEL_URL,
                    delegate: 'GPU'
                },
                runningMode: 'VIDEO',
                numFaces: 1,
                minFaceDetectionConfidence: 0.5,
                minFacePresenceConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            updateFaceDetectionStatus('Face detection ready.', 'success');
            return faceLandmarker;
        })
        .catch((error) => {
            console.error('Failed to load MediaPipe Face Landmarker:', error);
            updateFaceDetectionStatus('Face effects unavailable. Photo capture still works.', 'error');
            throw error;
        })
        .finally(() => {
            faceLandmarkerLoadPromise = null;
        });

    return faceLandmarkerLoadPromise;
}

function getFaceAccessoryLandmarksFromResult(result) {
    return result?.faceLandmarks?.[0] || result?.face_landmarks?.[0] || null;
}

function detectFaceAccessoryLandmarks(video) {
    if (!faceLandmarker || !video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        return null;
    }

    const result = faceLandmarker.detectForVideo(video, performance.now());
    return getFaceAccessoryLandmarksFromResult(result);
}

function clearFaceAccessoryCanvas() {
    const canvas = document.getElementById('face-accessory-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width || canvas.clientWidth, canvas.height || canvas.clientHeight);
}

function resizeFaceAccessoryCanvas(video, canvas) {
    if (!video || !canvas) return false;

    const width = video.videoWidth || canvas.clientWidth;
    const height = video.videoHeight || canvas.clientHeight;
    if (!width || !height) return false;

    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }

    return true;
}

function getLandmarkPoint(landmarks, index, width, height) {
    const landmark = landmarks?.[index];
    if (!landmark) return null;

    return {
        x: landmark.x * width,
        y: landmark.y * height,
        z: landmark.z || 0
    };
}

function getFaceAccessoryGeometry(landmarks, width, height) {
    const leftEyeOuter = getLandmarkPoint(landmarks, 33, width, height);
    const rightEyeOuter = getLandmarkPoint(landmarks, 263, width, height);
    const noseTip = getLandmarkPoint(landmarks, 1, width, height);
    const upperLip = getLandmarkPoint(landmarks, 13, width, height);
    const forehead = getLandmarkPoint(landmarks, 10, width, height);
    const chin = getLandmarkPoint(landmarks, 152, width, height);
    const leftCheek = getLandmarkPoint(landmarks, 234, width, height);
    const rightCheek = getLandmarkPoint(landmarks, 454, width, height);

    if (!leftEyeOuter || !rightEyeOuter || !noseTip) {
        return null;
    }

    const eyeCenter = {
        x: (leftEyeOuter.x + rightEyeOuter.x) / 2,
        y: (leftEyeOuter.y + rightEyeOuter.y) / 2
    };
    const eyeDistance = Math.hypot(rightEyeOuter.x - leftEyeOuter.x, rightEyeOuter.y - leftEyeOuter.y);
    const angle = Math.atan2(rightEyeOuter.y - leftEyeOuter.y, rightEyeOuter.x - leftEyeOuter.x);
    const faceHeight = forehead && chin ? Math.max(eyeDistance * 1.9, Math.abs(chin.y - forehead.y)) : eyeDistance * 2.2;

    return {
        angle,
        eyeCenter,
        eyeDistance,
        faceHeight,
        noseTip,
        upperLip: upperLip || { x: noseTip.x, y: noseTip.y + eyeDistance * 0.35 },
        forehead: forehead || { x: eyeCenter.x, y: eyeCenter.y - eyeDistance * 0.85 },
        leftCheek: leftCheek || { x: eyeCenter.x - eyeDistance * 0.48, y: noseTip.y + eyeDistance * 0.2 },
        rightCheek: rightCheek || { x: eyeCenter.x + eyeDistance * 0.48, y: noseTip.y + eyeDistance * 0.2 }
    };
}

function withAccessoryTransform(ctx, center, angle, drawFn) {
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(angle);
    drawFn();
    ctx.restore();
}

function drawGlassesAccessory(ctx, geometry) { // black round spectacles - changes made by nick
    const lensRadius = geometry.eyeDistance * 0.27;
    const lensOffset = geometry.eyeDistance * 0.34;
    const center = {
        x: geometry.eyeCenter.x,
        y: geometry.eyeCenter.y + geometry.eyeDistance * 0.03
    };

    withAccessoryTransform(ctx, center, geometry.angle, () => {
        ctx.lineWidth = Math.max(8, geometry.eyeDistance * 0.085);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#111827';

        ctx.beginPath();
        ctx.arc(-lensOffset, 0, lensRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(lensOffset, 0, lensRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = Math.max(7, geometry.eyeDistance * 0.07);
        ctx.beginPath();
        ctx.moveTo(-lensOffset + lensRadius * 0.86, -lensRadius * 0.06);
        ctx.quadraticCurveTo(0, -lensRadius * 0.34, lensOffset - lensRadius * 0.86, -lensRadius * 0.06);
        ctx.stroke();

        ctx.lineWidth = Math.max(6, geometry.eyeDistance * 0.055);
        ctx.strokeStyle = 'rgba(17, 24, 39, 0.78)';
        ctx.beginPath();
        ctx.moveTo(-lensOffset - lensRadius * 0.92, -lensRadius * 0.18);
        ctx.quadraticCurveTo(-lensOffset - lensRadius * 1.55, -lensRadius * 0.26, -lensOffset - lensRadius * 1.82, lensRadius * 0.34);
        ctx.moveTo(lensOffset + lensRadius * 0.92, -lensRadius * 0.18);
        ctx.quadraticCurveTo(lensOffset + lensRadius * 1.55, -lensRadius * 0.26, lensOffset + lensRadius * 1.82, lensRadius * 0.34);
        ctx.stroke();
    });
}

function drawSparkleGlassesAccessory(ctx, geometry, time) { // changes made by nick
    drawGlassesAccessory(ctx, geometry);
    const sparkleCenter = {
        x: geometry.eyeCenter.x + Math.cos(geometry.angle) * geometry.eyeDistance * 0.54,
        y: geometry.eyeCenter.y + Math.sin(geometry.angle) * geometry.eyeDistance * 0.54 - geometry.eyeDistance * 0.16
    };
    const pulse = 0.78 + Math.sin(time / 180) * 0.22;

    withAccessoryTransform(ctx, sparkleCenter, geometry.angle + time / 520, () => {
        ctx.fillStyle = `rgba(250, 204, 21, ${0.74 + pulse * 0.22})`;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
        ctx.lineWidth = Math.max(2, geometry.eyeDistance * 0.018);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const radius = (i % 2 === 0 ? geometry.eyeDistance * 0.16 : geometry.eyeDistance * 0.055) * pulse;
            const angle = (Math.PI * 2 * i) / 8;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    });
}

function drawMoustacheAccessory(ctx, geometry) {
    const width = geometry.eyeDistance * 0.84;
    const height = geometry.eyeDistance * 0.23;
    const center = {
        x: geometry.noseTip.x,
        y: geometry.upperLip.y + geometry.eyeDistance * 0.1
    };

    withAccessoryTransform(ctx, center, geometry.angle, () => {
        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-width * 0.2, -height, -width * 0.48, -height * 0.65, -width * 0.5, height * 0.12);
        ctx.bezierCurveTo(-width * 0.35, height * 0.35, -width * 0.15, height * 0.18, 0, height * 0.04);
        ctx.bezierCurveTo(width * 0.15, height * 0.18, width * 0.35, height * 0.35, width * 0.5, height * 0.12);
        ctx.bezierCurveTo(width * 0.48, -height * 0.65, width * 0.2, -height, 0, 0);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.beginPath();
        ctx.ellipse(-width * 0.2, -height * 0.12, width * 0.13, height * 0.1, -0.35, 0, Math.PI * 2);
        ctx.ellipse(width * 0.2, -height * 0.12, width * 0.13, height * 0.1, 0.35, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawHatAccessory(ctx, geometry) {
    const brimWidth = geometry.eyeDistance * 1.42;
    const brimHeight = geometry.eyeDistance * 0.18;
    const crownWidth = geometry.eyeDistance * 0.88;
    const crownHeight = geometry.faceHeight * 0.3;
    const center = {
        x: geometry.forehead.x,
        y: geometry.forehead.y - geometry.eyeDistance * 0.34
    };

    withAccessoryTransform(ctx, center, geometry.angle, () => {
        ctx.fillStyle = '#111827';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.lineWidth = Math.max(2, geometry.eyeDistance * 0.025);

        ctx.beginPath();
        ctx.roundRect(-crownWidth / 2, -crownHeight, crownWidth, crownHeight, crownWidth * 0.08);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#4f46e5';
        ctx.fillRect(-crownWidth / 2, -crownHeight * 0.28, crownWidth, crownHeight * 0.14);

        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.ellipse(0, 0, brimWidth / 2, brimHeight / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    });
}

function drawFlowerCrownAccessory(ctx, geometry, time) { // changes made by nick
    const flowerCount = 7;
    const center = {
        x: geometry.forehead.x,
        y: geometry.forehead.y - geometry.eyeDistance * 0.28
    };
    const colors = ['#fb7185', '#facc15', '#a78bfa', '#34d399', '#f472b6'];

    withAccessoryTransform(ctx, center, geometry.angle, () => {
        for (let i = 0; i < flowerCount; i++) {
            const progress = flowerCount === 1 ? 0 : i / (flowerCount - 1);
            const x = (progress - 0.5) * geometry.eyeDistance * 1.22;
            const arch = Math.sin(progress * Math.PI) * geometry.eyeDistance * 0.16;
            const y = -arch + Math.sin(time / 360 + i) * geometry.eyeDistance * 0.018;
            const radius = geometry.eyeDistance * (0.08 + (i % 2) * 0.015);

            ctx.fillStyle = colors[i % colors.length];
            for (let petal = 0; petal < 5; petal++) {
                const angle = (Math.PI * 2 * petal) / 5;
                ctx.beginPath();
                ctx.ellipse(
                    x + Math.cos(angle) * radius * 0.78,
                    y + Math.sin(angle) * radius * 0.78,
                    radius * 0.58,
                    radius * 0.38,
                    angle,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            }

            ctx.fillStyle = '#fef3c7';
            ctx.beginPath();
            ctx.arc(x, y, radius * 0.38, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function drawHaloAccessory(ctx, geometry, time) { // changes made by nick
    const center = {
        x: geometry.forehead.x,
        y: geometry.forehead.y - geometry.eyeDistance * (0.62 + Math.sin(time / 430) * 0.04)
    };

    withAccessoryTransform(ctx, center, geometry.angle, () => {
        ctx.lineWidth = Math.max(5, geometry.eyeDistance * 0.06);
        ctx.strokeStyle = '#facc15';
        ctx.shadowColor = 'rgba(250, 204, 21, 0.82)';
        ctx.shadowBlur = geometry.eyeDistance * 0.18;
        ctx.beginPath();
        ctx.ellipse(0, 0, geometry.eyeDistance * 0.52, geometry.eyeDistance * 0.14, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    });
}

function drawBlushAccessory(ctx, geometry, time) { // changes made by nick
    const alpha = 0.38 + Math.sin(time / 420) * 0.08;
    const cheekRadiusX = geometry.eyeDistance * 0.18;
    const cheekRadiusY = geometry.eyeDistance * 0.1;
    const cheeks = [
        { point: geometry.leftCheek, offset: -geometry.eyeDistance * 0.04 },
        { point: geometry.rightCheek, offset: geometry.eyeDistance * 0.04 }
    ];

    cheeks.forEach(({ point, offset }) => {
        withAccessoryTransform(ctx, { x: point.x, y: point.y + offset }, geometry.angle, () => {
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, cheekRadiusX);
            gradient.addColorStop(0, `rgba(244, 114, 182, ${alpha})`);
            gradient.addColorStop(1, 'rgba(244, 114, 182, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.ellipse(0, 0, cheekRadiusX, cheekRadiusY, 0, 0, Math.PI * 2);
            ctx.fill();
        });
    });
}

function drawPartyAccessory(ctx, geometry, time) { // changes made by nick
    const center = {
        x: geometry.forehead.x,
        y: geometry.forehead.y - geometry.eyeDistance * 0.42
    };
    const wiggle = Math.sin(time / 180) * 0.1;

    withAccessoryTransform(ctx, center, geometry.angle + wiggle, () => {
        const hatHeight = geometry.eyeDistance * 0.78;
        const hatWidth = geometry.eyeDistance * 0.48;
        const gradient = ctx.createLinearGradient(0, -hatHeight, 0, 0);
        gradient.addColorStop(0, '#60a5fa');
        gradient.addColorStop(0.5, '#f472b6');
        gradient.addColorStop(1, '#22c55e');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, -hatHeight);
        ctx.lineTo(hatWidth / 2, 0);
        ctx.lineTo(-hatWidth / 2, 0);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.lineWidth = Math.max(2, geometry.eyeDistance * 0.025);
        for (let i = 1; i <= 3; i++) {
            const y = -hatHeight + (hatHeight * i) / 4;
            ctx.beginPath();
            ctx.moveTo(-hatWidth * 0.28, y);
            ctx.lineTo(hatWidth * 0.28, y + geometry.eyeDistance * 0.08);
            ctx.stroke();
        }

        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(0, -hatHeight, geometry.eyeDistance * 0.1, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawRpShadesAccessory(ctx, geometry) { // RP shades face filter (DONE BY NICK)
    const lensWidth = geometry.eyeDistance * 0.42;
    const lensHeight = geometry.eyeDistance * 0.26;
    const lensOffset = geometry.eyeDistance * 0.33;
    const center = {
        x: geometry.eyeCenter.x,
        y: geometry.eyeCenter.y + geometry.eyeDistance * 0.04
    };

    withAccessoryTransform(ctx, center, geometry.angle, () => {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = '#0f766e';
        ctx.lineWidth = Math.max(4, geometry.eyeDistance * 0.04);

        [-lensOffset, lensOffset].forEach((x) => {
            ctx.beginPath();
            ctx.roundRect(x - lensWidth / 2, -lensHeight / 2, lensWidth, lensHeight, lensHeight * 0.28);
            ctx.fill();
            ctx.stroke();
        });

        ctx.beginPath();
        ctx.moveTo(-lensOffset + lensWidth / 2, -lensHeight * 0.08);
        ctx.lineTo(lensOffset - lensWidth / 2, -lensHeight * 0.08);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = `700 ${Math.max(12, geometry.eyeDistance * 0.12)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('RP', 0, 0);
    });
}

function drawLeafCrownAccessory(ctx, geometry, time) { // ESG leaf crown face filter (DONE BY NICK)
    const center = {
        x: geometry.forehead.x,
        y: geometry.forehead.y - geometry.eyeDistance * 0.32
    };

    withAccessoryTransform(ctx, center, geometry.angle, () => {
        for (let i = 0; i < 9; i++) {
            const progress = i / 8;
            const x = (progress - 0.5) * geometry.eyeDistance * 1.36;
            const y = -Math.sin(progress * Math.PI) * geometry.eyeDistance * 0.2 + Math.sin(time / 400 + i) * geometry.eyeDistance * 0.02;
            const rotation = (progress - 0.5) * 0.7;
            const leafWidth = geometry.eyeDistance * 0.16;
            const leafHeight = geometry.eyeDistance * 0.28;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rotation);
            ctx.fillStyle = i % 2 === 0 ? '#16a34a' : '#34d399';
            ctx.beginPath();
            ctx.ellipse(0, 0, leafWidth / 2, leafHeight / 2, -0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.55)';
            ctx.lineWidth = Math.max(1, geometry.eyeDistance * 0.012);
            ctx.beginPath();
            ctx.moveTo(0, -leafHeight * 0.36);
            ctx.lineTo(0, leafHeight * 0.36);
            ctx.stroke();
            ctx.restore();
        }
    });
}

function drawGraduationAccessory(ctx, geometry, time) { // Graduation cap face filter (DONE BY NICK)
    const center = {
        x: geometry.forehead.x,
        y: geometry.forehead.y - geometry.eyeDistance * 0.42
    };

    withAccessoryTransform(ctx, center, geometry.angle, () => {
        const capWidth = geometry.eyeDistance * 1.22;
        const capHeight = geometry.eyeDistance * 0.34;
        ctx.fillStyle = '#111827';
        ctx.strokeStyle = 'rgba(255,255,255,0.28)';
        ctx.lineWidth = Math.max(2, geometry.eyeDistance * 0.02);

        ctx.beginPath();
        ctx.moveTo(0, -capHeight * 0.62);
        ctx.lineTo(capWidth / 2, -capHeight * 0.08);
        ctx.lineTo(0, capHeight * 0.48);
        ctx.lineTo(-capWidth / 2, -capHeight * 0.08);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0f766e';
        ctx.fillRect(-capWidth * 0.24, capHeight * 0.04, capWidth * 0.48, capHeight * 0.32);

        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = Math.max(2, geometry.eyeDistance * 0.018);
        ctx.beginPath();
        ctx.moveTo(capWidth * 0.08, -capHeight * 0.14);
        ctx.quadraticCurveTo(capWidth * 0.28, capHeight * 0.18, capWidth * 0.25, capHeight * (0.7 + Math.sin(time / 260) * 0.08));
        ctx.stroke();

        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(capWidth * 0.25, capHeight * 0.72, geometry.eyeDistance * 0.045, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawFaceAccessory(ctx, landmarks, width, height, time = performance.now()) {
    if (selectedFaceAccessory === 'none' || !landmarks) {
        return;
    }

    const geometry = getFaceAccessoryGeometry(landmarks, width, height);
    if (!geometry) {
        return;
    }

    if (selectedFaceAccessory === 'glasses') {
        drawGlassesAccessory(ctx, geometry);
    } else if (selectedFaceAccessory === 'sparkle-glasses') {
        drawSparkleGlassesAccessory(ctx, geometry, time);
    } else if (selectedFaceAccessory === 'moustache') {
        drawMoustacheAccessory(ctx, geometry);
    } else if (selectedFaceAccessory === 'hat') {
        drawHatAccessory(ctx, geometry);
    } else if (selectedFaceAccessory === 'flower-crown') {
        drawFlowerCrownAccessory(ctx, geometry, time);
    } else if (selectedFaceAccessory === 'halo') {
        drawHaloAccessory(ctx, geometry, time);
    } else if (selectedFaceAccessory === 'blush') {
        drawBlushAccessory(ctx, geometry, time);
    } else if (selectedFaceAccessory === 'party') {
        drawPartyAccessory(ctx, geometry, time);
    } else if (selectedFaceAccessory === 'rp-shades') {
        drawRpShadesAccessory(ctx, geometry);
    } else if (selectedFaceAccessory === 'leaf-crown') {
        drawLeafCrownAccessory(ctx, geometry, time);
    } else if (selectedFaceAccessory === 'graduation') {
        drawGraduationAccessory(ctx, geometry, time);
    }
}

function drawFaceAccessoryForCameraView(ctx, landmarks, width, height) {
    ctx.save();
    if (isMirrored) {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
    }
    drawFaceAccessory(ctx, landmarks, width, height, performance.now());
    ctx.restore();
}

function renderLiveFaceAccessory() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('face-accessory-canvas');
    if (!video || !canvas || !stream) {
        clearFaceAccessoryCanvas();
        faceAccessoryAnimationFrame = null;
        return;
    }

    if (resizeFaceAccessoryCanvas(video, canvas)) {
        const ctx = canvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (selectedFaceAccessory !== 'none') {
            if (video.currentTime !== latestFaceAccessoryVideoTime) {
                latestFaceAccessoryLandmarks = detectFaceAccessoryLandmarks(video);
                latestFaceAccessoryVideoTime = video.currentTime;
            }
            drawFaceAccessoryForCameraView(ctx, latestFaceAccessoryLandmarks, canvas.width, canvas.height);
        }
    }

    faceAccessoryAnimationFrame = requestAnimationFrame(renderLiveFaceAccessory);
}

async function startFaceAccessoryPreview() {
    stopFaceAccessoryPreview();
    clearFaceAccessoryCanvas();

    if (selectedFaceAccessory === 'none') {
        return;
    }

    try {
        await ensureFaceLandmarkerReady();
        renderLiveFaceAccessory();
    } catch (error) {
        console.warn('Face accessory preview disabled:', error.message);
    }
}

function stopFaceAccessoryPreview() {
    if (faceAccessoryAnimationFrame) {
        cancelAnimationFrame(faceAccessoryAnimationFrame);
        faceAccessoryAnimationFrame = null;
    }
    latestFaceAccessoryLandmarks = null;
    latestFaceAccessoryVideoTime = -1;
    clearFaceAccessoryCanvas();
}

function updateFaceAccessoryButtons() {
    document.querySelectorAll('.face-filter-card').forEach((button) => {
        const isActive = button.dataset.accessory === selectedFaceAccessory;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    const activeLabel = document.getElementById('face-filter-active');
    const option = FACE_ACCESSORY_OPTIONS.find(item => item.id === selectedFaceAccessory);
    if (activeLabel && option) {
        activeLabel.textContent = option.label;
    }
}

function scrollSelectedFaceFilterIntoView(behavior = 'smooth') { // changes made by nick
    const selectedButton = document.querySelector(`.face-filter-card[data-accessory="${selectedFaceAccessory}"]`);
    if (selectedButton) {
        selectedButton.scrollIntoView({ behavior, block: 'nearest', inline: 'center' });
    }
}

function selectFaceAccessory(accessory, shouldScroll = true) {
    if (!FACE_ACCESSORY_IDS.includes(accessory)) {
        return;
    }

    selectedFaceAccessory = accessory;
    userData.selectedFaceAccessory = accessory; // Store face filter choice for Nick analytics (DONE BY NICK)
    updateFaceAccessoryButtons();
    if (shouldScroll) {
        scrollSelectedFaceFilterIntoView();
    }
    if (stream) {
        startFaceAccessoryPreview();
    } else {
        clearFaceAccessoryCanvas();
    }
    resetInactivityTimer();
}

function getCenteredFaceFilterAccessory() { // changes made by nick
    const selector = document.getElementById('face-filter-selector');
    if (!selector) {
        return selectedFaceAccessory;
    }

    const selectorBox = selector.getBoundingClientRect();
    const centerX = selectorBox.left + selectorBox.width / 2;
    let nearest = null;
    let nearestDistance = Infinity;

    selector.querySelectorAll('.face-filter-card').forEach((button) => {
        const box = button.getBoundingClientRect();
        const distance = Math.abs((box.left + box.width / 2) - centerX);
        if (distance < nearestDistance) {
            nearest = button;
            nearestDistance = distance;
        }
    });

    return nearest?.dataset.accessory || selectedFaceAccessory;
}

function setupFaceAccessorySelector() { // swipeable filter selector - changes made by nick
    const selector = document.getElementById('face-filter-selector');

    document.querySelectorAll('.face-filter-card').forEach((button) => {
        button.addEventListener('click', () => {
            selectFaceAccessory(button.dataset.accessory || 'none');
        });
    });

    if (selector) {
        selector.addEventListener('scroll', () => {
            if (faceFilterScrollTimer) {
                clearTimeout(faceFilterScrollTimer);
            }

            faceFilterScrollTimer = setTimeout(() => {
                const centeredAccessory = getCenteredFaceFilterAccessory();
                if (centeredAccessory !== selectedFaceAccessory) {
                    selectFaceAccessory(centeredAccessory, false);
                }
            }, 120);
        }, { passive: true });
    }

    updateFaceAccessoryButtons();
    requestAnimationFrame(() => scrollSelectedFaceFilterIntoView('auto'));
}

async function getCurrentFaceAccessoryLandmarks() {
    if (selectedFaceAccessory === 'none') {
        return null;
    }

    const video = document.getElementById('video');
    if (!video) {
        return null;
    }

    try {
        await ensureFaceLandmarkerReady();
        latestFaceAccessoryLandmarks = detectFaceAccessoryLandmarks(video) || latestFaceAccessoryLandmarks;
        return latestFaceAccessoryLandmarks;
    } catch (error) {
        console.warn('Unable to detect landmarks for selected face accessory:', error.message);
        return null;
    }
}

async function capturePhotoIfFaceDetected() {
    try {
        updateFaceDetectionStatus('Checking for face...', 'loading');

        const faceDetection = await detectFaceInCurrentFrame(); // reuse face box for slimming filter done by nick
        if (!faceDetection) {
            updateFaceDetectionStatus('No face detected. Position your face in frame and try again.', 'error');
            showVisitorNotice('photo-form-alert', 'No face detected. Please position your face clearly in the camera frame and capture again.', 'I could not see a face clearly. Move into the frame and try again.');
            return false;
        }

        updateFaceDetectionStatus('Face detected. Capturing photo...', 'success');
        const faceAccessoryLandmarks = await getCurrentFaceAccessoryLandmarks();
        await takePhoto(faceDetection, faceAccessoryLandmarks); // pass face box into beauty filter done by nick
        return true;
    } catch (error) {
        console.error('Face detection check failed:', error);
        updateFaceDetectionStatus('Face detection failed. Please try again.', 'error');
        showVisitorNotice('photo-form-alert', `Face detection failed: ${error.message}`, 'The face check had trouble. Try again with brighter lighting.');
        return false;
    }
}


// ==================== 2. INITIALIZATION & SETUP FUNCTIONS ====================

// Load dynamic QR code from server
async function loadDynamicQRCode() {
    try {
        const kioskId = window.location.hostname || 'default-kiosk';
        const response = await fetch(`/api/kiosk/generate-qr?kiosk_id=${encodeURIComponent(kioskId)}`);
        const data = await response.json();

        if (data.success && data.qrSvg) {
            const qrContainer = document.querySelector('.qr-code');
            if (qrContainer) {
                // Replace the dummy QR code with dynamic one
                qrContainer.innerHTML = data.qrSvg;

                // Update the description with the actual IP
                const qrDescription = document.querySelector('.qr-description');
                if (qrDescription) {
                    qrDescription.innerHTML = `
                        Scan to open<br>
                        This QR refreshes automatically and expires in about 30 seconds.
                    `; //: <strong>${data.url}</strong> (Put under qrcode)
                }

                console.log('Dynamic QR code loaded:', data.url);
            }
        }
    } catch (error) {
        console.log('Using static QR code (fallback):', error.message);
        // Keep the existing dummy QR code if dynamic loading fails
    }
}

function startQrRefreshLoop() {
    if (qrRefreshTimer) {
        clearInterval(qrRefreshTimer);
    }

    qrRefreshTimer = setInterval(() => {
        loadDynamicQRCode();
    }, 25000);
}

function setLandingVisitorCount(totalVisitors, nextVisitorNumber) { // Render start-screen live visitor count (DONE BY NICK)
    const totalText = formatVisitorCount(totalVisitors);
    const nextText = formatVisitorCount(nextVisitorNumber);

    document.querySelectorAll('.landing-visitor-count').forEach((element) => {
        element.classList.remove('is-loaded');
        void element.offsetWidth;
        element.classList.add('is-loaded');
    });
    document.querySelectorAll('[data-visitor-count-value]').forEach((element) => {
        element.textContent = totalText;
    });
    document.querySelectorAll('[data-next-visitor-value]').forEach((element) => {
        element.textContent = nextText;
    });
}

async function loadLandingVisitorCount() { // Fetch live count for landing page (DONE BY NICK)
    try {
        const response = await fetch('/api/feedback/visitor-count', {
            headers: { 'Cache-Control': 'no-cache' }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Visitor count unavailable');
        }

        setLandingVisitorCount(data.totalVisitors, data.nextVisitorNumber);
    } catch (error) {
        try {
            const treeResponse = await fetch('/api/tree', {
                headers: { 'Cache-Control': 'no-cache' }
            });
            const treeVisitors = await treeResponse.json();
            const totalVisitors = Array.isArray(treeVisitors) ? treeVisitors.length : null;
            setLandingVisitorCount(totalVisitors, Number.isFinite(Number(totalVisitors)) ? Number(totalVisitors) + 1 : null);
        } catch (fallbackError) {
            console.warn('Landing visitor count unavailable:', error.message, fallbackError.message);
            setLandingVisitorCount(null, null);
        }
    }
}

function startLandingVisitorCountLoop() { // Keep start-screen count live (DONE BY NICK)
    if (landingVisitorCountTimer) {
        clearInterval(landingVisitorCountTimer);
    }

    loadLandingVisitorCount();
    landingVisitorCountTimer = setInterval(loadLandingVisitorCount, 30000);
}

// Detect if user is on mobile or desktop
function detectDeviceType() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    currentDevice = isMobile ? 'mobile' : 'desktop';
    console.log('Detected device:', currentDevice);

    // Update UI classes for device-specific styling
    document.body.classList.add(`device-${currentDevice}`);
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    applyFormUIConfig();
    kioskParametersLoadPromise = loadKioskParameters();

    // Check if mobile
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        // Add class to body to show content after scaling is ready
        setTimeout(() => {
            document.body.classList.add('scale-applied');

            // Force reflow to ensure smooth transition
            void document.body.offsetHeight;
        }, 50);
    }

    // Handle page transitions
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.type === 'childList') {
                // When page changes, ensure scaling is maintained
                if (isMobile && !document.body.classList.contains('scale-applied')) {
                    document.body.classList.add('scale-applied');
                }
            }
        });
    });

    // Observe body for page changes
    observer.observe(document.body, {
        childList: true,
        subtree: false
    });
});

document.addEventListener('DOMContentLoaded', function () {
    // Load dynamic QR code
    loadDynamicQRCode();
    startQrRefreshLoop();
    startLandingVisitorCountLoop(); // Start-screen live visitor count (DONE BY NICK)
    initializeProgressIndicators();
    updateCaptureModeButtons();

    // Detect device type
    detectDeviceType();

    const pledgeTextarea = document.getElementById('pledge-text');
    if (pledgeTextarea) {
        pledgeTextarea.addEventListener('input', function () {
            document.getElementById('char-count').textContent = this.value.length;
            updatePledgeCoach();
            resetInactivityTimer(); // Reset timer on user input
        });
    }

    document.querySelectorAll('input[name="pledge-topics"]').forEach((topicInput) => {
        topicInput.addEventListener('change', function () {
            syncPledgeTopicField();
            updatePledgeCoach();
            resetInactivityTimer();
        });
    });

    updatePledgeCoach();

    // Add event listener for capture button
    const captureBtn = document.getElementById('capture-btn');
    if (captureBtn) {
        captureBtn.addEventListener('click', capturePhoto);
    }
    const mirrorBtn = document.getElementById('mirror-btn');
    if (mirrorBtn) mirrorBtn.addEventListener('click', toggleMirror);

    // Beauty filter setting done by nick
    setupBeautyFilterSettings();
    setupFaceAccessorySelector();
    setupRpBearCompanion(); // changes made by nick
    setupLostFoundModal(); // changes made by nick

    // Load overlay options from database
    loadOverlayOptions();

    // Load feedback questions from database
    loadFeedbackQuestions();

    // Start inactivity timer
    startInactivityTimer();

    if (isCelebrationDemoMode()) {
        Promise.resolve(kioskParametersLoadPromise)
            .finally(() => window.setTimeout(showCelebrationDemoIfRequested, 120));
    }
});


// ==================== 3. INACTIVITY TIMER FUNCTIONS ====================

// Start 1-minute inactivity countdown
function startInactivityTimer() {
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
    }
    if (idleWarningTimer) {
        clearTimeout(idleWarningTimer);
    }
    if (idleWarningInterval) {
        clearInterval(idleWarningInterval);
    }
    hideIdleWarning();

    idleWarningTimer = setTimeout(() => {
        showIdleWarning();
    }, Math.max(0, INACTIVITY_TIMEOUT - (IDLE_WARNING_SECONDS * 1000)));

    inactivityTimer = setTimeout(() => {
        returnToLandingPage();
    }, INACTIVITY_TIMEOUT);

    console.log('Inactivity timer started: 1 minute');
}

// Reset timer on user interaction
function resetInactivityTimer() {
    if (document.body.classList.contains('submitting-feedback')) {
        return;
    }
    startInactivityTimer();
}

function showIdleWarning() {
    const modal = document.getElementById('idle-timeout-modal');
    const countdown = document.getElementById('idle-countdown');
    if (!modal || !countdown) return;

    let remaining = IDLE_WARNING_SECONDS;
    countdown.textContent = remaining;
    modal.style.display = 'flex';

    idleWarningInterval = setInterval(() => {
        remaining -= 1;
        countdown.textContent = Math.max(0, remaining);
        if (remaining <= 0 && idleWarningInterval) {
            clearInterval(idleWarningInterval);
            idleWarningInterval = null;
        }
    }, 1000);
}

function hideIdleWarning() {
    const modal = document.getElementById('idle-timeout-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function stayOnForm() {
    resetInactivityTimer();
}

// Return to landing page when timeout reached
function returnToLandingPage() {
    console.log('Inactivity timeout reached - returning to landing page');
    // Reset boomerang state on kiosk timeout - changes made by nick
    stopBoomerangPreview();

    // Stop camera stream if active
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }

    // Clear any existing timer
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
    }
    if (idleWarningTimer) {
        clearTimeout(idleWarningTimer);
        idleWarningTimer = null;
    }
    if (idleWarningInterval) {
        clearInterval(idleWarningInterval);
        idleWarningInterval = null;
    }
    hideIdleWarning();
    clearValidationMessages();

    // Reset all data
    selectedRetention = LONG_TERM_RETENTION;
    selectedTheme = 'nature';
    selectedFaceAccessory = 'none';
    userData = {};
    photoData = null;
    captureMode = 'photo';
    boomerangFrames = [];
    clearRestorableBoomerang();
    selectedFaceAccessory = 'none'; // Reset face filter between visitors (DONE BY NICK)
    userData.selectedFaceAccessory = 'none'; // Reset filter analytics state (DONE BY NICK)
    updateCaptureModeButtons();
    updateFaceAccessoryButtons();
    setupKeepsakeDownload({}); // Clear previous visitor download state (DONE BY NICK)
    updateFaceAccessoryButtons();
    scrollSelectedFaceFilterIntoView('auto');

    // Reset forms
    document.querySelectorAll('form').forEach(form => form.reset());
    syncPledgeTopicField();
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));

    // Reset character counter if it exists
    const charCount = document.getElementById('char-count');
    if (charCount) charCount.textContent = '0';

    // Reset proceed button if it exists
    const proceedBtn = document.getElementById('proceedBtn');
    if (proceedBtn) proceedBtn.disabled = true;

    showLandingPages();

    // Show notification
    showTimeoutNotification();

    console.log('✅ Successfully returned to landing page');
}

// Show timeout notification message
function showTimeoutNotification() {
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fef3c7;
        border: 2px solid #f59e0b;
        border-radius: 12px;
        padding: 16px 20px;
        color: #92400e;
        font-weight: 600;
        z-index: 10000;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        max-width: 300px;
    `;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 6V10L12 12" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
                <circle cx="10" cy="10" r="8" stroke="#f59e0b" stroke-width="2"/>
            </svg>
            <span>Session timed out. Please start again.</span>
        </div>
    `;

    document.body.appendChild(notification);

    // Remove notification after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}


// ==================== 4. QUESTION MANAGEMENT FUNCTIONS ====================

// Load questions from the database
async function loadFeedbackQuestions() {
    try {
        const response = await fetch('/api/feedback/questions');
        const data = await response.json();

        if (data.success && data.questions.length > 0) {
            updateFeedbackForm(data.questions);
        } else {
            // Show message if no questions found
            showNoQuestionsMessage();
        }
    } catch (error) {
        console.error('Error loading questions:', error);
        showNoQuestionsMessage();
    }
}

// Update the feedback form with ALL questions from database
function updateFeedbackForm(questions) {
    const container = document.getElementById('questions-container');
    if (!container) {
        console.error('Questions container not found');
        return;
    }

    // Clear container
    container.innerHTML = '';

    if (!questions || questions.length === 0) {
        console.log('No questions found');
        showNoQuestionsMessage();
        return;
    }

    console.log(`Loading ${questions.length} questions from database`);

    // Add ALL questions from database
    questions.forEach((question) => {
        if (!question.is_active) return;

        const questionNumber = question.display_order;
        const questionElement = createQuestionElement(question, questionNumber);
        container.appendChild(questionElement);
    });

    // Add event listeners
    setTimeout(() => {
        initializeQuestionEventListeners();
    }, 100);
}

// Create question element based on question type
function createQuestionElement(question, questionNumber) {
    const questionGroup = document.createElement('div');
    questionGroup.className = 'question-group';
    questionGroup.setAttribute('data-question-id', question.id);

    const requiredIndicator = question.is_required ? ' *' : '';
    const translatedQuestionText = translateKnownDynamicText(question.question_text);
    const answerPlaceholder = getDynamicLanguageText().answerPlaceholder;

    let questionHTML = `
        <label class="question-label" data-question-number="${questionNumber}" data-original-text="${question.question_text}" data-required="${question.is_required ? 'true' : 'false'}">${questionNumber}. ${translatedQuestionText}${requiredIndicator}</label>
    `;

    // Generate appropriate input based on question type
    switch (question.question_type) {
        case 'text':
            questionHTML += `
                <textarea 
                    id="q${question.id}" 
                    name="q${question.id}" 
                    rows="4" 
                    placeholder="${answerPlaceholder}"  
                    ${question.is_required ? 'required' : ''}
                    oninput="resetInactivityTimer()"
                ></textarea>
            `;
            break;

        case 'yesno':
            questionHTML += `
                <div style="display: flex; gap: 15px; margin-top: 10px;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input 
                            type="radio" 
                            name="q${question.id}" 
                            value="yes" 
                            ${question.is_required ? 'required' : ''}
                            onclick="resetInactivityTimer()"
                        >
                        <span data-dynamic-option data-original-text="Yes">${getDynamicLanguageText().yes}</span>
                    </label>
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input 
                            type="radio" 
                            name="q${question.id}" 
                            value="no"
                            onclick="resetInactivityTimer()"
                        >
                        <span data-dynamic-option data-original-text="No">${getDynamicLanguageText().no}</span>
                    </label>
                </div>
            `;
            break;

        case 'rating':
            questionHTML += `
                <div class="rating-buttons" style="margin-top: 10px;">
                    ${[1, 2, 3, 4, 5].map(star => `
                        <button 
                            type="button" 
                            class="rating-btn question-rating" 
                            data-question-id="${question.id}"
                            data-rating="${star}"
                            onclick="selectQuestionRating(${question.id}, ${star}, this); resetInactivityTimer()"
                            ${question.is_required ? 'data-required="true"' : ''}
                        >
                            ${star}
                        </button>
                    `).join('')}
                </div>
                <input 
                    type="hidden" 
                    id="q${question.id}" 
                    name="q${question.id}" 
                    ${question.is_required ? 'required' : ''}
                >
            `;
            break;

        case 'choice':
            if (question.options && question.options.length > 0) {
                questionHTML += `
                    <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 10px;">
                        ${question.options.map(option => `
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input 
                                    type="radio" 
                                    name="q${question.id}" 
                                    value="${option.option_label}"
                                    ${question.is_required ? 'required' : ''}
                                    onclick="resetInactivityTimer()"
                                >
                                <span data-dynamic-option data-original-text="${option.option_label}">${translateKnownDynamicText(option.option_label)}</span>
                            </label>
                        `).join('')}
                    </div>
                `;
            }
            break;

        default:
            questionHTML += `
                <textarea 
                    id="q${question.id}" 
                    name="q${question.id}" 
                    rows="4" 
                    placeholder="${answerPlaceholder}" 
                    ${question.is_required ? 'required' : ''}
                    oninput="resetInactivityTimer()"
                ></textarea>
            `;
    }

    questionGroup.innerHTML = questionHTML;
    return questionGroup;
}

// Handle star rating selection for dynamic questions
function selectQuestionRating(questionId, rating, element) {
    // Remove selected class from all buttons in this question group
    const questionGroup = element.closest('.question-group');
    const buttons = questionGroup.querySelectorAll('.question-rating');
    buttons.forEach(btn => btn.classList.remove('selected'));

    // Add selected class to clicked button
    element.classList.add('selected');

    // Update the hidden input
    const hiddenInput = document.getElementById(`q${questionId}`);
    if (hiddenInput) {
        hiddenInput.value = rating;
    }

    console.log(`Selected rating ${rating} for question ${questionId}`);
}

// Initialize event listeners for dynamic questions
function initializeQuestionEventListeners() {
    console.log('Question event listeners initialized');
}

// Show message when no questions exist
function showNoQuestionsMessage() {
    const container = document.getElementById('questions-container');
    if (!container) return;
    const dynamicText = getDynamicLanguageText();

    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #64748b;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 16px;">
                <circle cx="12" cy="12" r="10" stroke="#94a3b8" stroke-width="1.5"/>
                <path d="M12 8V12M12 16H12.01" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <h3 style="color: #475569; margin-bottom: 8px;">${dynamicText.noQuestionsTitle}</h3>
            <p>${dynamicText.noQuestionsDescription}</p>
        </div>
    `;

    // Disable submit button
    const submitBtn = document.querySelector('#feedback-page .consent-button');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = dynamicText.noQuestionsButton;
    }
}

// Helper function to determine question type
function getQuestionType(questionElement) {
    if (questionElement.querySelector('textarea')) return 'text';
    if (questionElement.querySelector('.question-rating')) return 'rating';
    if (questionElement.querySelector('input[type="radio"]')) {
        // Check if it's yes/no or multiple choice
        const radios = questionElement.querySelectorAll('input[type="radio"]');
        const values = Array.from(radios).map(radio => radio.value);
        if (values.includes('yes') && values.includes('no')) {
            return 'yesno';
        } else {
            return 'choice';
        }
    }
    return 'unknown';
}

// Validate that all required questions are answered
function validateRequiredQuestions() {
    if (getValidationRules().requiredQuestionsEnabled === false) {
        return true;
    }

    const requiredQuestions = document.querySelectorAll('#questions-container .question-group[data-question-id]');

    for (const question of requiredQuestions) {
        const questionId = question.getAttribute('data-question-id');
        const isRequired = question.querySelector('[required]') !== null;

        if (isRequired) {
            const questionType = getQuestionType(question);
            let hasAnswer = false;

            switch (questionType) {
                case 'text':
                    const textarea = question.querySelector('textarea');
                    hasAnswer = textarea && textarea.value.trim() !== '';
                    break;

                case 'yesno':
                case 'choice':
                    const selectedRadio = question.querySelector('input[type="radio"]:checked');
                    hasAnswer = selectedRadio !== null;
                    break;

                case 'rating':
                    const hiddenInput = question.querySelector('input[type="hidden"]');
                    hasAnswer = hiddenInput && hiddenInput.value !== '';
                    break;
            }

            if (!hasAnswer) {
                // Scroll to the question and highlight it
                question.scrollIntoView({ behavior: 'smooth', block: 'center' });
                question.classList.add('has-error');
                const label = question.querySelector('.question-label')?.textContent?.replace('*', '').trim() || 'this question';
                let error = question.querySelector('.field-error');
                if (!error) {
                    error = document.createElement('p');
                    error.className = 'field-error';
                    question.appendChild(error);
                }
                error.textContent = `Please answer ${label}.`;
                error.style.display = 'block';

                // Remove highlight after 3 seconds
                setTimeout(() => {
                    question.classList.remove('has-error');
                }, 3000);

                return false;
            }
        }
    }

    return true;
}

function getPledgeCoachDefaultSuggestion(topic) {
    return PLEDGE_COACH_TOPIC_SUGGESTIONS[topic] || 'Bring a reusable bottle for 3 school days this week.';
}

function hasPledgeTimeframe(text) {
    return /\b(today|tomorrow|daily|every day|this week|weekly|weekend|month|for \d+|[1-9]\d?\s*(day|days|week|weeks|time|times))\b/i.test(text);
}

function hasPledgeActionQuantity(text) {
    return /\b\d+\b/.test(text) || /\b(one|two|three|four|five|once|twice)\b/i.test(text);
}

function hasSpecificPledgeAction(text) {
    return /\b(bring|carry|use|reuse|recycle|sort|reduce|avoid|switch|turn off|save|walk|take|share|invite|finish|choose|buy|donate|volunteer|clean)\b/i.test(text);
}

function getPledgeQuality(text) {
    const hasText = Boolean(text.trim());
    const action = hasText && hasSpecificPledgeAction(text);
    const measure = hasText && hasPledgeActionQuantity(text);
    const timeframe = hasText && hasPledgeTimeframe(text);
    const score = [action, measure, timeframe].filter(Boolean).length;

    return {
        action,
        measure,
        timeframe,
        score,
        label: score === 3 ? 'Action-ready' : score === 2 ? 'Almost there' : score === 1 ? 'Good start' : 'Needs details'
    };
}

function getPledgeCoachReason(quality, suggestionMatchesText) {
    if (quality.score === 3 && suggestionMatchesText) {
        return 'Strong pledge: it has a clear action, measurable target, and timeframe.';
    }

    const missing = [];
    if (!quality.action) missing.push('a clear action');
    if (!quality.measure) missing.push('a measurable target');
    if (!quality.timeframe) missing.push('a timeframe');

    if (!missing.length) {
        return 'Better because it keeps the pledge clear and easy to try.';
    }

    return `Better because it adds ${missing.join(', ')}.`;
}

function buildSpecificPledgeSuggestion(rawText, topic) {
    const text = rawText.trim();
    if (!text) {
        return getPledgeCoachDefaultSuggestion(topic);
    }

    const cleaned = text
        .replace(/^i\s+(pledge|will|promise|want)\s+(to\s+)?/i, '')
        .replace(/[.!?]+$/g, '')
        .trim();

    if (!cleaned) {
        return getPledgeCoachDefaultSuggestion(topic);
    }

    if (/reusable bottle|water bottle|bottle/i.test(cleaned)) {
        return 'Bring a reusable bottle for 3 school days this week.';
    }
    if (/recycl|sort waste|waste/i.test(cleaned)) {
        return 'Sort my waste correctly after lunch 3 times this week.';
    }
    if (/food|leftover|finish/i.test(cleaned)) {
        return 'Take only what I can finish for 3 meals this week.';
    }
    if (/light|electric|charger|energy|switch/i.test(cleaned)) {
        return 'Switch off unused lights and chargers every day this week.';
    }
    if (/plastic|straw|bag|cup/i.test(cleaned)) {
        return 'Avoid single-use plastic for lunch 3 times this week.';
    }
    if (/friend|classmate|community|share/i.test(cleaned)) {
        return 'Share one sustainability habit with a friend this week.';
    }

    return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)} at least 3 times this week.`;
}

function updatePledgeCoach() {
    const textarea = document.getElementById('pledge-text');
    const topicSelect = document.getElementById('pledge-topic');
    const feedback = document.getElementById('pledge-coach-feedback');
    const suggestion = document.getElementById('pledge-coach-suggestion');
    const applyBtn = document.getElementById('apply-pledge-suggestion-btn');
    const score = document.getElementById('pledge-quality-score');
    const label = document.getElementById('pledge-quality-label');
    const fill = document.getElementById('pledge-quality-fill');
    const actionCheck = document.getElementById('pledge-check-action');
    const measureCheck = document.getElementById('pledge-check-measure');
    const timeCheck = document.getElementById('pledge-check-time');
    const reason = document.getElementById('pledge-coach-reason');

    if (!textarea || !feedback || !suggestion || !applyBtn) return;

    const text = textarea.value.trim();
    const selectedTopics = syncPledgeTopicField();
    const topic = selectedTopics[0] || (topicSelect ? topicSelect.value : '');
    const wordCount = text ? text.split(/\s+/).length : 0;
    const quality = getPledgeQuality(text);
    pledgeCoachSuggestion = buildSpecificPledgeSuggestion(text, topic);

    if (!text) {
        feedback.textContent = selectedTopics.length > 1
            ? `Good range. You selected ${selectedTopics.length} focus areas; write one action that connects them.`
            : topic
                ? 'Good topic. Start with one action, then make it specific enough to try this week.'
                : 'Choose a focus area or type a pledge. The coach will make it more specific.';
    } else if (wordCount < 4) {
        feedback.textContent = 'Nice start. Add a clear action so you know exactly what to do.';
    } else if (!hasPledgeActionQuantity(text) || !hasPledgeTimeframe(text)) {
        feedback.textContent = 'Make it more specific with a number and a timeframe.';
    } else {
        feedback.textContent = 'This is clear and actionable. You can use it as it is.';
        pledgeCoachSuggestion = text;
    }

    const suggestionMatchesText = pledgeCoachSuggestion === text;
    if (score) score.textContent = `Pledge strength: ${quality.score}/3`;
    if (label) label.textContent = quality.label;
    if (fill) fill.style.width = `${(quality.score / 3) * 100}%`;
    if (actionCheck) actionCheck.classList.toggle('complete', quality.action);
    if (measureCheck) measureCheck.classList.toggle('complete', quality.measure);
    if (timeCheck) timeCheck.classList.toggle('complete', quality.timeframe);
    if (reason) reason.textContent = getPledgeCoachReason(quality, suggestionMatchesText);

    suggestion.textContent = pledgeCoachSuggestion;
    applyBtn.disabled = !pledgeCoachSuggestion || suggestionMatchesText;
}

function applyPledgeCoachSuggestion() {
    const textarea = document.getElementById('pledge-text');
    const charCount = document.getElementById('char-count');
    if (!textarea || !pledgeCoachSuggestion) return;

    textarea.value = pledgeCoachSuggestion.slice(0, Number(textarea.maxLength) || 500);
    if (charCount) charCount.textContent = textarea.value.length;
    updatePledgeCoach();
    cheerRpBear('Nice pledge upgrade. That one is much easier to act on.');
    resetInactivityTimer();
}

// ==================== 5. FORM SUBMISSION FUNCTIONS ====================

// Submit feedback form with dynamic questions
function submitFeedback(event) {
    event.preventDefault();
    clearValidationMessages();

    // Collect all answers
    userData.answers = {};

    const allQuestions = document.querySelectorAll('#questions-container .question-group[data-question-id]');
    allQuestions.forEach(question => {
        const questionId = question.getAttribute('data-question-id');
        const questionType = getQuestionType(question);

        let answerValue = '';

        switch (questionType) {
            case 'text':
                const textarea = question.querySelector('textarea');
                answerValue = textarea ? textarea.value : '';
                break;

            case 'yesno':
                const selectedRadio = question.querySelector('input[type="radio"]:checked');
                answerValue = selectedRadio ? selectedRadio.value : '';
                break;

            case 'rating':
                const hiddenInput = question.querySelector('input[type="hidden"]');
                answerValue = hiddenInput ? hiddenInput.value : '';
                break;

            case 'choice':
                const selectedChoice = question.querySelector('input[type="radio"]:checked');
                answerValue = selectedChoice ? selectedChoice.value : '';
                break;
        }

        userData.answers[questionId] = answerValue;
        userData[`q${questionId}`] = answerValue; // for backward compatibility
    });

    // Validate required questions
    if (!validateRequiredQuestions()) {
        showFormAlert('feedback-form-alert', getDynamicLanguageText().requiredQuestion);
        nudgeRpBear('One question still needs an answer. I moved you to it.');
        return;
    }

    if (getFeatureFlags().pledgeEnabled === false) {
        cheerRpBear('Feedback captured. Pledge is skipped by settings, so we can move ahead.');
        skipPledge();
        return;
    }

    cheerRpBear('Feedback done. Let us turn that into a small action.');
    showFlowPage('pledge-page');
    resetInactivityTimer();
}

// Submit user details form
function submitDetails(event) {
    event.preventDefault();
    clearValidationMessages();
    const rules = getValidationRules();
    const nameInput = document.getElementById('user-name');
    const emailInput = document.getElementById('user-email');
    userData.name = nameInput.value.trim();
    userData.email = emailInput.value.trim();

    if (rules.nameRequired !== false && !userData.name) {
        showFieldError('user-name', 'Please enter your name so we can add it to your submission.');
        nudgeRpBear('Start with your name here. Then we can keep moving.');
        return;
    }

    if (userData.name && userData.name.length < Number(rules.nameMinLength || 0)) {
        showFieldError('user-name', `Please enter at least ${rules.nameMinLength} characters.`);
        nudgeRpBear('Your name needs a little more detail before we continue.');
        return;
    }

    if (userData.name && userData.name.length > Number(rules.nameMaxLength || 9999)) {
        showFieldError('user-name', `Please keep your name within ${rules.nameMaxLength} characters.`);
        nudgeRpBear('That name is a bit too long for the form. Try shortening it.');
        return;
    }

    if (rules.emailRequired !== false && !userData.email) {
        showFieldError('user-email', 'Please enter your email so we can send your RP memory photo.');
        nudgeRpBear('Add your email so your keepsake can find you later.');
        return;
    }

    if (userData.email && !matchesConfiguredPattern(userData.email, rules.emailPattern)) {
        showFieldError('user-email', 'Please enter a valid email address, for example name@example.com.');
        nudgeRpBear('That email looks incomplete. Try something like name@example.com.');
        return;
    }

    cheerRpBear('Details saved. You are ready for the feedback questions.');
    showFlowPage('feedback-page');
    resetInactivityTimer();
}

// Show the photo choice step after pledge instead of forcing photo capture - changes made by nick
function continueAfterPledgeChoice() {
    cheerRpBear(userData.pledgeSkipped ? 'No worries, pledge skipped. Your feedback still matters.' : 'Pledge saved. Now choose your keepsake moment.');
    showFlowPage('photo-choice-page');
    resetInactivityTimer();
}

// Clear optional photo state when the visitor skips photo - changes made by nick
function clearPhotoCaptureData() {
    photoData = null;
    userData.photoId = null;
    userData.processedPhotoId = null;
    userData.processedPhoto = null;
    userData.processedBoomerangFrames = null; // Clear backend GIF frame payload - changes made by nick
    userData.boomerangFrameDelayMs = null; // Clear backend GIF timing payload - changes made by nick
    userData.boomerangQuality = null; // Clear GIF quality metadata (DONE BY NICK)
    boomerangFrames = [];
    clearRestorableBoomerang();
    stopBoomerangPreview();
    stopFaceAccessoryPreview();
}

// Continue into camera/upload when visitor chooses to take photo - changes made by nick
function startPhotoFlow() {
    const flags = getFeatureFlags();
    const rules = getValidationRules();
    userData.photoSkipped = false;

    if (flags.cameraCaptureEnabled === false && flags.photoUploadEnabled === false) {
        if (rules.photoRequired !== false) {
            showVisitorNotice('photo-choice-form-alert', 'Photo capture is currently disabled. Please ask an administrator to disable the photo requirement or re-enable capture.', 'Photo is required, but capture is disabled. A staff member can help.');
            return;
        }
        showFlowPage('confirmation-page');
        updateConfirmationDetails();
        resetInactivityTimer();
        return;
    }

    // MOBILE: Use file upload instead of camera
    if (currentDevice === 'mobile') {
        if (flags.photoUploadEnabled === false) {
            if (rules.photoRequired !== false) {
                showVisitorNotice('photo-choice-form-alert', 'Mobile photo upload is currently disabled. Please ask an administrator to disable the photo requirement or re-enable uploads.', 'Upload is disabled right now. Please ask a staff member for help.');
                return;
            }
            showFlowPage('confirmation-page');
            updateConfirmationDetails();
        } else {
            showFlowPage('file-upload-page');
        }
    } else {
        // DESKTOP: Use camera as before
        if (flags.cameraCaptureEnabled === false) {
            if (rules.photoRequired !== false) {
                showVisitorNotice('photo-choice-form-alert', 'Desktop camera capture is currently disabled. Please ask an administrator to disable the photo requirement or re-enable camera capture.', 'Camera capture is disabled right now. Please ask a staff member for help.');
                return;
            }
            showFlowPage('confirmation-page');
            updateConfirmationDetails();
        } else {
            setRpBearSpeech('Camera time. Try a filter, then I will cheer when your photo is captured.', true);
            showFlowPage('photo-page');
            initializeCamera();
        }
    }

    resetInactivityTimer();
}

// Let visitor skip photo and go straight to confirmation - changes made by nick
function skipPhoto() {
    clearPhotoCaptureData();
    userData.photoSkipped = true;
    userData.captureMode = 'none';
    showFlowPage('confirmation-page');
    updateConfirmationDetails();
    setRpBearSpeech('Photo skipped. I brought you to the final check.', true);
    resetInactivityTimer();
}

// Submit pledge and redirect to appropriate photo method
// Added explicit pledge topic selection support and validation - done by XY
function submitPledge(event) {
    event.preventDefault();
    clearValidationMessages();
    const rules = getValidationRules();
    userData.pledge = document.getElementById('pledge-text').value.trim();
    userData.pledgeTopics = syncPledgeTopicField();
    userData.pledgeTopic = userData.pledgeTopics[0] || '';
    userData.pledgeSkipped = false;

    if (rules.pledgeRequired !== false && !userData.pledge) {
        showFieldError('pledge-text', 'Write one short action you will try. You can also skip the pledge below.');
        nudgeRpBear('Write one short action, or use Skip Pledge if you prefer.');
        return;
    }

    if (userData.pledge && userData.pledge.length < Number(rules.pledgeMinLength || 0)) {
        showFieldError('pledge-text', `Please write at least ${rules.pledgeMinLength} characters.`);
        nudgeRpBear('Your pledge is nearly there. Add a few more words.');
        return;
    }

    if (userData.pledge && userData.pledge.length > Number(rules.pledgeMaxLength || 9999)) {
        showFieldError('pledge-text', `Please keep your pledge within ${rules.pledgeMaxLength} characters.`);
        nudgeRpBear('That pledge is too long. Keep it short and actionable.');
        return;
    }

    if (rules.pledgeTopicRequired !== false && userData.pledgeTopics.length === 0) {
        showFieldError('pledge-topic-options', 'Choose at least one sustainability focus before continuing.');
        nudgeRpBear('Choose one focus area so I know what your pledge supports.');
        return;
    }

    continueAfterPledgeChoice();
}

function skipPledge() {
    userData.pledge = '';
    userData.pledgeTopic = '';
    userData.pledgeTopics = [];
    userData.pledgeSkipped = true;

    const pledgeText = document.getElementById('pledge-text');
    const pledgeTopic = document.getElementById('pledge-topic');
    const charCount = document.getElementById('char-count');
    if (pledgeText) pledgeText.value = '';
    if (pledgeTopic) pledgeTopic.value = '';
    document.querySelectorAll('input[name="pledge-topics"]').forEach(input => {
        input.checked = false;
    });
    if (charCount) charCount.textContent = '0';
    updatePledgeCoach();

    continueAfterPledgeChoice();
}


// ==================== 6. PHOTO HANDLING FUNCTIONS ====================

// Handle photo upload from file input (mobile) - with face detection validation (Done by Yu Kang)
async function handlePhotoUpload(event) {
    const file = event.target.files[0];
    const rules = getValidationRules();
    const allowedFormats = rules.allowedPhotoFormats || ['jpeg', 'jpg', 'png', 'webp'];
    const maxPhotoFileSizeMb = Number(rules.maxPhotoFileSizeMb) || 5;

    if (!file) {
        return;
    }

    // Validate it's an image file
    const fileExtension = (file.name.split('.').pop() || '').toLowerCase();
    if (!file.type.match('image.*') || !allowedFormats.includes(fileExtension)) {
        showVisitorNotice('upload-form-alert', `Please upload an allowed image file (${allowedFormats.join(', ')}).`, 'That file type is not accepted. Choose a photo file instead.');
        return;
    }

    if (file.size > maxPhotoFileSizeMb * 1024 * 1024) {
        showVisitorNotice('upload-form-alert', `File is too large. Please upload an image smaller than ${maxPhotoFileSizeMb}MB.`, 'That photo is too large. Try a smaller image.');
        return;
    }

    const previewContainer = document.getElementById('photo-preview');
    const continueBtn = document.getElementById('upload-continue-btn');
    const uploadFaceDetectionStatus = document.getElementById('upload-face-detection-status');

    // Reset preview state before validation.
    photoData = null;
    previewContainer.style.display = 'none';
    continueBtn.disabled = true;
    updateFaceDetectionStatus('Checking uploaded photo for a face...', 'loading', uploadFaceDetectionStatus);

    const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Error reading the file. Please try again.'));
        reader.readAsDataURL(file);
    }).catch((error) => {
        showVisitorNotice('upload-form-alert', error.message, 'I could not read that file. Try another photo.');
        updateFaceDetectionStatus('Could not read image. Please try again.', 'error', uploadFaceDetectionStatus);
        return null;
    });

    if (!dataUrl) {
        return;
    }

    try {
        const faceDetection = await detectFaceInImageData(dataUrl); // reuse face box for upload beauty filter done by nick
        if (!faceDetection) {
            event.target.value = '';
            updateFaceDetectionStatus('No face detected. Please retake and upload a clearer face photo.', 'error', uploadFaceDetectionStatus);
            showVisitorNotice('upload-form-alert', 'No face detected. Please retake the photo and make sure your face is clearly visible.', 'I could not spot a face in that upload. Try a brighter, clearer photo.');
            return;
        }

        // Apply the local beauty filter to uploaded mobile photos.
        const uploadedImage = await loadImageElement(dataUrl);
        photoData = createBeautyFilteredPhotoDataUrl(uploadedImage, faceDetection);
        // Uploaded mobile photos are treated as normal photos - changes made by nick
        userData.photoSkipped = false;
        userData.captureMode = 'photo';
        userData.boomerangQuality = null; // Uploaded still photos are not GIF quality tracked (DONE BY NICK)
        boomerangFrames = [];
        clearRestorableBoomerang();
        userData.processedBoomerangFrames = null; // Clear backend GIF frames for uploaded still photos - changes made by nick
        userData.boomerangFrameDelayMs = null; // Clear backend GIF timing for uploaded still photos - changes made by nick

        const previewImg = document.getElementById('uploaded-photo-preview');
        previewImg.src = photoData;
        previewContainer.style.display = 'block';
        continueBtn.disabled = false;
        updateFaceDetectionStatus('Face detected. Photo accepted.', 'success', uploadFaceDetectionStatus);
        cheerRpBear('Photo accepted. Nice, now choose a style for it.');

        // Auto-scroll to show preview
        previewContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        resetInactivityTimer();

    } catch (error) {
        console.error('Face detection failed for uploaded image:', error);
        event.target.value = '';
        photoData = null;
        previewContainer.style.display = 'none';
        continueBtn.disabled = true;
        updateFaceDetectionStatus('Face detection failed. Please try again.', 'error', uploadFaceDetectionStatus);
        showVisitorNotice('upload-form-alert', `Face detection failed: ${error.message}`, 'The upload check had trouble. Try another clear photo.');
    }
}

// Continue to style page from upload (mobile)
function continueToStyleFromUpload() {
    if (!photoData) {
        showFormAlert('upload-form-alert', 'Please add a clear photo before choosing a style.');
        nudgeRpBear('Add a clear photo first, then I can help you style it.');
        return;
    }

    cheerRpBear('Great upload. Let us make it look good with a frame.');
    showFlowPage('style-page');
    resetInactivityTimer();

    // Update the preview immediately
    updatePreviewWithCutout();
}

// Retake photo from upload page (mobile)
function retakePhotoFromUpload() {
    // Reset file input
    document.getElementById('photo-input').value = '';
    document.getElementById('photo-preview').style.display = 'none';
    document.getElementById('upload-continue-btn').disabled = true;
    updateFaceDetectionStatus('Upload a photo to run face detection.', 'info', 'upload-face-detection-status');
    photoData = null;
    // Clear boomerang preview frames when retaking an uploaded photo - changes made by nick
    boomerangFrames = [];
    clearRestorableBoomerang();
    userData.processedBoomerangFrames = null; // Clear backend GIF frames on upload retake - changes made by nick
    userData.boomerangFrameDelayMs = null; // Clear backend GIF timing on upload retake - changes made by nick
    userData.boomerangQuality = null; // Clear GIF quality metadata on upload retake (DONE BY NICK)

    // Trigger click on file input again
    document.getElementById('photo-input').click();
}

// Beauty filter canvas helpers done by nick
function getBeautyFaceRegion(faceDetection, width, height) {
    if (!faceDetection || !faceDetection.box) {
        return null;
    }

    const box = faceDetection.box;
    const expandedWidth = box.width * 1.48;
    const expandedHeight = box.height * 1.68;
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    const faceWidth = Math.min(expandedWidth, width);
    const faceHeight = Math.min(expandedHeight, height);
    const faceX = Math.max(0, Math.min(width - faceWidth, centerX - faceWidth / 2));
    const faceY = Math.max(0, Math.min(height - faceHeight, centerY - faceHeight * 0.46));

    return {
        x: faceX,
        y: faceY,
        width: faceWidth,
        height: faceHeight
    };
}

// Face acne cover and slimming beauty filter done by nick
function drawFaceBeautyPass(ctx, sourceCanvas, faceRegion) {
    if (!faceRegion) {
        return;
    }

    const beautyPreset = getBeautyFilterPreset();
    const centerX = faceRegion.x + faceRegion.width / 2;
    const centerY = faceRegion.y + faceRegion.height / 2;
    const radiusX = faceRegion.width / 2;
    const radiusY = faceRegion.height / 2;
    const passCanvas = document.createElement('canvas');
    const passCtx = passCanvas.getContext('2d');
    passCanvas.width = sourceCanvas.width;
    passCanvas.height = sourceCanvas.height;

    const smoothCanvas = document.createElement('canvas');
    const smoothCtx = smoothCanvas.getContext('2d');
    smoothCanvas.width = sourceCanvas.width;
    smoothCanvas.height = sourceCanvas.height;
    smoothCtx.filter = beautyPreset.faceSmoothFilter;
    smoothCtx.drawImage(sourceCanvas, 0, 0);

    // Cover acne and uneven texture with a feathered face-only smoothing pass done by nick
    passCtx.globalAlpha = 0.62;
    passCtx.drawImage(smoothCanvas, 0, 0);

    // Slim face by redrawing the detected face area slightly narrower done by nick
    const slimWidth = faceRegion.width * beautyPreset.faceSlimRatio;
    const slimX = faceRegion.x + (faceRegion.width - slimWidth) / 2;
    passCtx.globalAlpha = 0.48;
    passCtx.filter = 'brightness(1.06) contrast(0.92) saturate(1.06)';
    passCtx.drawImage(
        sourceCanvas,
        faceRegion.x,
        faceRegion.y,
        faceRegion.width,
        faceRegion.height,
        slimX,
        faceRegion.y,
        slimWidth,
        faceRegion.height
    );

    // Blend a final soft skin-tone veil over the face done by nick
    passCtx.globalAlpha = 0.1;
    passCtx.filter = 'none';
    passCtx.globalCompositeOperation = 'screen';
    passCtx.fillStyle = '#ffd6c6';
    passCtx.fillRect(faceRegion.x, faceRegion.y, faceRegion.width, faceRegion.height);

    // Feather the face pass so there is no visible oval edge done by nick
    passCtx.globalCompositeOperation = 'destination-in';
    const mask = passCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(radiusX, radiusY));
    mask.addColorStop(0, 'rgba(0, 0, 0, 0.92)');
    mask.addColorStop(0.58, 'rgba(0, 0, 0, 0.76)');
    mask.addColorStop(0.82, 'rgba(0, 0, 0, 0.28)');
    mask.addColorStop(1, 'rgba(0, 0, 0, 0)');
    passCtx.fillStyle = mask;
    passCtx.fillRect(
        faceRegion.x - radiusX * 0.2,
        faceRegion.y - radiusY * 0.2,
        faceRegion.width * 1.4,
        faceRegion.height * 1.4
    );

    ctx.drawImage(passCanvas, 0, 0);
}

function drawPhotoWithBeautyFilter(ctx, image, x, y, width, height, faceDetection = null) {
    if (!beautyFilterEnabled) {
        ctx.drawImage(image, x, y, width, height);
        return;
    }

    const beautyPreset = getBeautyFilterPreset();
    const sourceCanvas = document.createElement('canvas');
    const sourceCtx = sourceCanvas.getContext('2d');
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    sourceCtx.drawImage(image, 0, 0, width, height);

    ctx.save();
    ctx.filter = beautyPreset.baseFilter;
    ctx.drawImage(sourceCanvas, x, y, width, height);

    // Stronger beauty smoothing layer done by nick
    ctx.globalAlpha = faceDetection ? beautyPreset.faceSmoothAlpha : beautyPreset.smoothAlpha;
    ctx.filter = beautyPreset.smoothFilter;
    ctx.drawImage(sourceCanvas, x, y, width, height);

    // Restore some edges so the photo does not look overly blurry done by nick
    ctx.globalAlpha = beautyPreset.detailAlpha;
    ctx.filter = beautyPreset.detailFilter;
    ctx.drawImage(sourceCanvas, x, y, width, height);

    // Subtle warm tint for healthier skin tone done by nick
    ctx.globalAlpha = beautyPreset.tintAlpha;
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = '#ffd8c8';
    ctx.fillRect(x, y, width, height);
    ctx.restore();

    const faceRegion = getBeautyFaceRegion(faceDetection, width, height);
    drawFaceBeautyPass(ctx, sourceCanvas, faceRegion);
}

// Scale face detection box coordinates based on image scaling done by nick
function scaleFaceDetectionBox(faceDetection, scale) {
    if (!faceDetection || !faceDetection.box) {
        return faceDetection;
    }

    return {
        ...faceDetection,
        box: {
            x: faceDetection.box.x * scale,
            y: faceDetection.box.y * scale,
            width: faceDetection.box.width * scale,
            height: faceDetection.box.height * scale
        }
    };
}

// Beauty filter for uploaded image data done by nick
function createBeautyFilteredPhotoDataUrl(image, faceDetection = null) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const sourceWidth = image.naturalWidth || image.videoWidth || image.width;
    const sourceHeight = image.naturalHeight || image.videoHeight || image.height;
    const maxProcessedDimension = 1600;
    const scale = Math.min(1, maxProcessedDimension / Math.max(sourceWidth, sourceHeight));

    canvas.width = Math.round(sourceWidth * scale);
    canvas.height = Math.round(sourceHeight * scale);

    const scaledFaceDetection = scale < 1 ? scaleFaceDetectionBox(faceDetection, scale) : faceDetection;
    drawPhotoWithBeautyFilter(ctx, image, 0, 0, canvas.width, canvas.height, scaledFaceDetection);
    return canvas.toDataURL('image/png');
}

// Update photo/boomerang selector buttons - changes made by nick
function updateCaptureModeButtons() {
    const photoModeBtn = document.getElementById('photo-mode-btn');
    const boomerangModeBtn = document.getElementById('boomerang-mode-btn');
    const captureText = document.getElementById('capture-photo-text');

    if (photoModeBtn) {
        const isPhoto = captureMode === 'photo';
        photoModeBtn.classList.toggle('active', isPhoto);
        photoModeBtn.setAttribute('aria-pressed', isPhoto ? 'true' : 'false');
    }

    if (boomerangModeBtn) {
        const isBoomerang = captureMode === 'boomerang';
        boomerangModeBtn.classList.toggle('active', isBoomerang);
        boomerangModeBtn.setAttribute('aria-pressed', isBoomerang ? 'true' : 'false');
    }

    if (captureText) {
        captureText.textContent = captureMode === 'boomerang' ? 'Capture Boomerang' : 'Capture Photo';
    }
}

// Select normal photo or boomerang mode - changes made by nick
function selectCaptureMode(mode) {
    if (!['photo', 'boomerang'].includes(mode)) {
        return;
    }

    captureMode = mode;
    userData.captureMode = mode;
    userData.boomerangQuality = mode === 'boomerang' ? getBoomerangQualityPreset() : null; // Track quality only for boomerangs (DONE BY NICK)
    updateCaptureModeButtons();
    setRpBearSpeech(
        mode === 'boomerang'
            ? 'Boomerang selected. I will save it as a moving GIF for your email.'
            : 'Photo selected. We will capture one polished keepsake.',
        true
    );
    resetInactivityTimer();
}

// Stop looping boomerang preview animation - changes made by nick
function stopBoomerangPreview() {
    if (boomerangPreviewInterval) {
        clearInterval(boomerangPreviewInterval);
        boomerangPreviewInterval = null;
    }
    boomerangPreviewPaused = false;
    boomerangPreviewPhotoElement = null;
    updateBoomerangPreviewControls(false);
}

// Capture one current camera frame for photo or boomerang - changes made by nick
function captureVideoFrameDataUrl(faceDetection = null, faceAccessoryLandmarks = null) {
    const video = document.getElementById('video');
    const canvas = document.getElementById('photo-canvas');
    const context = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (isMirrored) {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
    }

    drawPhotoWithBeautyFilter(context, video, 0, 0, canvas.width, canvas.height, faceDetection);
    drawFaceAccessory(context, faceAccessoryLandmarks, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
}

// Small delay helper for boomerang frame capture - changes made by nick
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Read admin-controlled boomerang animation speed - changes made by nick
function getBoomerangFrameDelayMs() {
    const configuredDelay = Number(kioskParameters.photoSettings?.boomerangFrameDelayMs);
    if (!Number.isFinite(configuredDelay)) {
        return DEFAULT_BOOMERANG_FRAME_DELAY_MS;
    }

    return Math.max(40, Math.min(300, configuredDelay));
}

function getBoomerangQualityPreset() { // Read admin-controlled boomerang quality (DONE BY NICK)
    const preset = String(kioskParameters.photoSettings?.boomerangQuality || 'medium').toLowerCase();
    return BOOMERANG_QUALITY_PRESETS[preset] ? preset : 'medium';
}

function getBoomerangMaxFrames() { // Quality preset to GIF frame cap (DONE BY NICK)
    return BOOMERANG_QUALITY_PRESETS[getBoomerangQualityPreset()] || BOOMERANG_GIF_MAX_FRAMES;
}

function hasRestorableBoomerang() { // Check if still-photo preview can return to GIF preview (DONE BY NICK)
    return restorableBoomerangFrames.length > 0;
}

function clearRestorableBoomerang() { // Clear stored GIF preview frames when replacing capture (DONE BY NICK)
    restorableBoomerangFrames = [];
}

function updateBoomerangPreviewControls(visible = (userData.captureMode === 'boomerang' && boomerangFrames.length > 0) || hasRestorableBoomerang()) { // Style preview controls (DONE BY NICK)
    const controls = document.getElementById('boomerang-preview-controls');
    const toggleBtn = document.getElementById('boomerang-toggle-preview-btn');
    const retakeBtn = document.getElementById('boomerang-retake-btn');
    const useStillBtn = document.getElementById('boomerang-use-still-btn');
    const useVideoBtn = document.getElementById('boomerang-use-video-btn');
    const showingBoomerang = userData.captureMode === 'boomerang' && boomerangFrames.length > 0;
    const canRestoreBoomerang = userData.captureMode !== 'boomerang' && hasRestorableBoomerang();
    const shouldShowControls = Boolean(visible && (showingBoomerang || canRestoreBoomerang));

    if (controls) controls.hidden = !shouldShowControls;
    if (toggleBtn) {
        toggleBtn.hidden = !showingBoomerang;
        toggleBtn.innerHTML = boomerangPreviewPaused
            ? '<i class="fa-solid fa-play" aria-hidden="true"></i><span>Play GIF Preview</span>'
            : '<i class="fa-solid fa-pause" aria-hidden="true"></i><span>Pause GIF Preview</span>';
    }
    if (retakeBtn) retakeBtn.hidden = !shouldShowControls;
    if (useStillBtn) useStillBtn.hidden = !showingBoomerang;
    if (useVideoBtn) useVideoBtn.hidden = !canRestoreBoomerang;
}

function toggleBoomerangPreviewPlayback() { // Pause or resume animated preview (DONE BY NICK)
    const previewPhoto = boomerangPreviewPhotoElement || document.getElementById('preview-photo');
    if (!previewPhoto || !boomerangFrames.length) return;

    if (boomerangPreviewInterval) {
        clearInterval(boomerangPreviewInterval);
        boomerangPreviewInterval = null;
        boomerangPreviewPaused = true;
        updateBoomerangPreviewControls(true);
        return;
    }

    boomerangPreviewPaused = false;
    startBoomerangPreview(previewPhoto);
}

function switchBoomerangToStillPhoto() { // Convert boomerang capture to still preview (DONE BY NICK)
    if (!boomerangFrames.length) return;
    restorableBoomerangFrames = boomerangFrames.slice(); // Preserve GIF so visitor can switch back (DONE BY NICK)
    photoData = restorableBoomerangFrames[Math.floor(restorableBoomerangFrames.length / 2)] || restorableBoomerangFrames[0];
    boomerangFrames = [];
    userData.captureMode = 'photo';
    userData.boomerangQuality = null;
    userData.processedBoomerangFrames = null;
    userData.boomerangFrameDelayMs = null;
    captureMode = 'photo';
    stopBoomerangPreview();
    updateCaptureModeButtons();
    updatePreviewWithCutout();
    updateBoomerangPreviewControls(true);
    setRpBearSpeech('Switched to a still photo. You can keep this frame or retake it.', true);
    resetInactivityTimer();
}

function switchStillPhotoToBoomerang() { // Restore moving GIF preview after using still photo (DONE BY NICK)
    if (!hasRestorableBoomerang()) return;

    boomerangFrames = restorableBoomerangFrames.slice();
    photoData = boomerangFrames[Math.floor(boomerangFrames.length / 2)] || boomerangFrames[0];
    userData.captureMode = 'boomerang';
    userData.boomerangQuality = getBoomerangQualityPreset();
    userData.processedBoomerangFrames = null;
    userData.boomerangFrameDelayMs = null;
    captureMode = 'boomerang';
    updateCaptureModeButtons();
    updatePreviewWithCutout();
    setRpBearSpeech('Boomerang restored. Your keepsake will move again.', true);
    resetInactivityTimer();
}

// Capture a short forward/backward boomerang sequence - changes made by nick
async function captureBoomerangIfFaceDetected() {
    try {
        updateFaceDetectionStatus('Checking for face...', 'loading');

        const faceDetection = await detectFaceInCurrentFrame();
        if (!faceDetection) {
            updateFaceDetectionStatus('No face detected. Position your face in frame and try again.', 'error');
            showVisitorNotice('photo-form-alert', 'No face detected. Please position your face clearly in the camera frame and capture again.', 'I could not see a face clearly. Move into the frame and try again.');
            return false;
        }

        const cameraContainer = document.getElementById('camera-container');
        if (cameraContainer) {
            cameraContainer.classList.add('boomerang-capturing');
        }

        updateFaceDetectionStatus('Recording boomerang...', 'loading');

        const frames = [];
        const boomerangFrameDelayMs = getBoomerangFrameDelayMs(); // changes made by nick
        for (let i = 0; i < BOOMERANG_FRAME_COUNT; i++) {
            const faceAccessoryLandmarks = await getCurrentFaceAccessoryLandmarks();
            frames.push(captureVideoFrameDataUrl(faceDetection, faceAccessoryLandmarks));
            await wait(boomerangFrameDelayMs);
        }

        boomerangFrames = frames.concat(frames.slice(1, -1).reverse());
        clearRestorableBoomerang();
        userData.photoSkipped = false;
        userData.captureMode = 'boomerang';
        userData.boomerangQuality = getBoomerangQualityPreset(); // Store selected quality for analytics (DONE BY NICK)
        userData.processedBoomerangFrames = null; // Rebuild backend GIF frames from this new recording - changes made by nick
        userData.boomerangFrameDelayMs = null; // Rebuild backend GIF timing from this new recording - changes made by nick
        photoData = frames[Math.floor(frames.length / 2)] || frames[0];

        if (cameraContainer) {
            cameraContainer.classList.remove('boomerang-capturing');
        }

        updateFaceDetectionStatus('Boomerang captured.', 'success');
        cheerRpBear('Boomerang captured. This will move in your email.');

        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }

        continueToStyle();
        return true;
    } catch (error) {
        console.error('Boomerang capture failed:', error);
        const cameraContainer = document.getElementById('camera-container');
        if (cameraContainer) {
            cameraContainer.classList.remove('boomerang-capturing');
        }
        updateFaceDetectionStatus('Boomerang capture failed. Please try again.', 'error');
        showVisitorNotice('photo-form-alert', `Boomerang capture failed: ${error.message}`, 'Boomerang capture stumbled. Let us try one more time.');
        return false;
    }
}

let photoStripDataUrl = null; // remembers which photoData is a strip (auto-false after any retake/upload)
function shouldContainPhoto(dataUrl) {
    return Boolean(photoStripDataUrl) && dataUrl === photoStripDataUrl;
}

async function captureStripIfFaceDetected() {
    const STRIP_SHOTS = 3;          // 1 x 3
    const STRIP_GAP_MS = 1200;
    const CELL_ASPECT = 4 / 3;      // shape of each photo in the strip (like your sample)
    const CELL_OUT_WIDTH = 640;     // output size of each photo, keeps the upload small
    try {
        updateFaceDetectionStatus('Checking for face...', 'loading');
        const faceDetection = await detectFaceInCurrentFrame();
        if (!faceDetection) {
            updateFaceDetectionStatus('No face detected. Position your face in frame and try again.', 'error');
            showVisitorNotice('photo-form-alert', 'No face detected. Please position your face clearly in the camera frame and capture again.', 'I could not see a face clearly. Move into the frame and try again.');
            return false;
        }

        const shots = [];
        for (let i = 0; i < STRIP_SHOTS; i++) {
            updateFaceDetectionStatus(`Photo ${i + 1} of ${STRIP_SHOTS}...`, 'loading');
            const landmarks = await getCurrentFaceAccessoryLandmarks();
            shots.push(captureVideoFrameDataUrl(faceDetection, landmarks));
            if (i < STRIP_SHOTS - 1) await wait(STRIP_GAP_MS);
        }

        const images = await Promise.all(shots.map(src => loadImageElement(src)));
        const srcW = images[0].naturalWidth;
        const srcH = images[0].naturalHeight;

        // centre-crop each shot to CELL_ASPECT
        let cropW = srcW;
        let cropH = srcW / CELL_ASPECT;
        if (cropH > srcH) { cropH = srcH; cropW = srcH * CELL_ASPECT; }
        const cropX = (srcW - cropW) / 2;
        const cropY = (srcH - cropH) / 2;

        const cellW = CELL_OUT_WIDTH;
        const cellH = Math.round(CELL_OUT_WIDTH / CELL_ASPECT);
        const gap = 12;

        const canvas = document.createElement('canvas');
        canvas.width = cellW + gap * 2;
        canvas.height = cellH * STRIP_SHOTS + gap * (STRIP_SHOTS + 1);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        images.forEach((img, i) => {
            ctx.drawImage(img, cropX, cropY, cropW, cropH, gap, gap + i * (cellH + gap), cellW, cellH);
        });

        photoData = canvas.toDataURL('image/png');
        photoStripDataUrl = photoData;
        userData.photoSkipped = false;
        userData.captureMode = 'photo';
        boomerangFrames = [];
        clearRestorableBoomerang();
        userData.processedBoomerangFrames = null;
        userData.boomerangFrameDelayMs = null;
        userData.boomerangQuality = null;
        stopFaceAccessoryPreview();

        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }

        updateFaceDetectionStatus('Photo strip captured.', 'success');
        cheerRpBear('Photo strip captured. Let us pick a frame.');
        continueToStyle();
        return true;
    } catch (error) {
        console.error('Photo strip capture failed:', error);
        updateFaceDetectionStatus('Photo strip failed. Please try again.', 'error');
        showVisitorNotice('photo-form-alert', `Photo strip failed: ${error.message}`, 'The photo strip stumbled. Let us try again.');
        return false;
    }
}
//Done by Yu Kang - Capture photo only when a face is detected
function getBeautyFilterPreset() {
    return BEAUTY_FILTER_PRESETS[beautyFilterStrength] || BEAUTY_FILTER_PRESETS.medium;
}

function setBeautyFilterSetting(value) {
    if (value === 'off') {
        beautyFilterEnabled = false;
        beautyFilterStrength = 'medium';
    } else if (BEAUTY_FILTER_PRESETS[value]) {
        beautyFilterEnabled = true;
        beautyFilterStrength = value;
    }

    updateBeautyFilterSettings();
}

// Beauty filter setting state done by nick
function updateBeautyFilterSettings() {
    const video = document.getElementById('video');
    const settingValue = beautyFilterEnabled ? beautyFilterStrength : 'off';
    const settingControls = document.querySelectorAll('#beauty-select, #beauty-filter-setting, #upload-beauty-filter-setting');
    userData.beautyFilterStrength = settingValue; // Store visitor beauty setting for Nick analytics (DONE BY NICK)

    if (video) {
        video.style.filter = beautyFilterEnabled ? getBeautyFilterPreset().liveFilter : '';
    }

    settingControls.forEach((control) => {
        control.value = settingValue;
    });
}

function setupBeautyFilterSettings() {
    const settingControls = document.querySelectorAll('#beauty-select, #beauty-filter-setting, #upload-beauty-filter-setting');
    settingControls.forEach((control) => {
        control.addEventListener('change', () => {
            setBeautyFilterSetting(control.value);
            resetInactivityTimer();
        });
    });

    updateBeautyFilterSettings();
}

// Initialize camera with mobile device check
async function initializeCamera() {
    if (getFeatureFlags().cameraCaptureEnabled === false) {
        return;
    }

    // Don't initialize camera for mobile users
    if (currentDevice === 'mobile') {
        return;
    }

    try {
        console.log('Initializing camera for device:', currentDevice);

        // Stop any existing stream
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }

        // Get camera stream with device-specific constraints
        const constraints = {
            video: {
                facingMode: 'user',
                width: { ideal: currentDevice === 'mobile' ? 720 : 1280 },
                height: { ideal: currentDevice === 'mobile' ? 1280 : 720 }
            }
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);

        const video = document.getElementById('video');
        video.srcObject = stream;
        updateBeautyFilterSettings(); // apply live beauty filter preview done by nick

        // facial detection (Done by Yu Kang)
        await ensureFaceDetectionReady();
        startFaceAccessoryPreview();

        // Show camera
        document.getElementById('camera-container').style.display = 'block';

        console.log('Camera initialized for', currentDevice);

        // Add event listener to video for user interaction
        video.addEventListener('click', resetInactivityTimer);
        setRpBearSpeech('Camera is ready. Try a filter, then tap Capture when you like the look.', true);

    } catch (error) {
        console.error('Camera error:', error);
        nudgeRpBear('I could not open the camera. Check permission or ask a staff member.');
        if (error.name === 'NotAllowedError') {
            showVisitorNotice('photo-form-alert', 'Camera access was denied. Please allow camera permissions to take a photo.', 'Camera permission is blocked. Please allow access or ask a staff member.');
        }
    }
}

// Capture photo with countdown timer (desktop) or redirect to upload (mobile)
async function capturePhoto() {
    const flags = getFeatureFlags();

    if (flags.cameraCaptureEnabled === false && currentDevice !== 'mobile') {
        showFormAlert('photo-form-alert', 'Camera capture is currently disabled.');
        nudgeRpBear('Camera capture is disabled right now.');
        return;
    }

    // For mobile, redirect to file upload
    if (currentDevice === 'mobile') {
        if (flags.photoUploadEnabled === false) {
            showFormAlert('photo-form-alert', 'Photo upload is currently disabled.');
            nudgeRpBear('Photo upload is disabled right now.');
            return;
        }
        showFlowPage('file-upload-page');
        resetInactivityTimer();
        return;
    }

    try {
        const captureBtn = document.getElementById('capture-btn');
        const countdownOverlay = document.getElementById('countdown-overlay');
        const countdownText = document.getElementById('countdown-text');

        if (!stream) {
            showVisitorNotice('photo-form-alert', 'Camera not ready. Please wait for camera to initialize.', 'Camera is still warming up. Give it a moment, then try again.');
            return;
        }

        // Use selected capture mode after countdown finishes - changes made by nick
        const runSelectedCapture = () => {
            if (captureMode === 'boomerang') return captureBoomerangIfFaceDetected();
            return photoStripEnabled ? captureStripIfFaceDetected() : capturePhotoIfFaceDetected();
        };

        // Disable capture button during countdown
        captureBtn.disabled = true;
        setRpBearSpeech(captureMode === 'boomerang' ? 'Hold still. I am recording your boomerang.' : 'Smile. I am getting your photo ready.', true);

        // Load countdown from backend if not yet loaded
        if (countdownSeconds === null) {
            await loadCountdownTimer();
        }

        let countdown = Number.isInteger(countdownSeconds) ? countdownSeconds : 0;
        if (!visitorCountdownEnabled) countdown = 0;
        if (photoStripEnabled && captureMode !== 'boomerang') countdown = 0;   // strip runs its own 3-2-1 per shot

        if (!visitorCountdownEnabled) countdown = 0;

        // If admin set to 0, take photo immediately (no countdown overlay)
        if (countdown === 0) {

            // facial detection (Done by Yu Kang)
            await runSelectedCapture();
            captureBtn.disabled = false;
            return;
        }

        // Show countdown overlay
        countdownText.textContent = countdown;
        countdownOverlay.style.display = 'flex';
        console.log('Starting countdown:', countdown);

        const countdownInterval = setInterval(async () => {
            countdown--;

            if (countdown <= 0) {
                clearInterval(countdownInterval);
                countdownOverlay.style.display = 'none';
                console.log('Countdown finished, taking photo...');

                // facial detection (Done by Yu Kang)
                // Take the photo only when a face is detected
                await runSelectedCapture();

                // Re-enable capture button
                captureBtn.disabled = false;
                return;
            }

            countdownText.textContent = countdown;
            console.log('Countdown:', countdown);
        }, 1000);
    } catch (error) {
        console.error('Error in capturePhoto:', error);
        showVisitorNotice('photo-form-alert', 'Error capturing photo: ' + error.message, 'Photo capture had trouble. Please try again.');
    }
}

// Take photo from camera stream (desktop)
async function takePhoto(faceDetection = null, faceAccessoryLandmarks = null) { // face-aware beauty capture done by nick
    // Normal photo capture shares frame drawing with boomerang - changes made by nick
    photoData = captureVideoFrameDataUrl(faceDetection, faceAccessoryLandmarks);
    userData.photoSkipped = false;
    userData.captureMode = 'photo';
    boomerangFrames = [];
    clearRestorableBoomerang();
    userData.processedBoomerangFrames = null; // Clear backend GIF frames for normal photo mode - changes made by nick
    userData.boomerangFrameDelayMs = null; // Clear backend GIF timing for normal photo mode - changes made by nick
    userData.boomerangQuality = null; // Clear GIF quality metadata for normal photo mode (DONE BY NICK)
    stopFaceAccessoryPreview();

    // Stop camera stream after taking photo
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }

    // Immediately go to style page (don't save photo yet)
    cheerRpBear('Photo captured. Let us pick a frame.');
    continueToStyle();
}
// mirror function done by nick
function toggleMirror() {
    const video = document.getElementById('video');
    const mirrorBtn = document.getElementById('mirror-btn');

    isMirrored = !isMirrored;
    if (video) video.classList.toggle('mirror', isMirrored);
    if (mirrorBtn) {
        mirrorBtn.textContent = isMirrored ? 'Normal View' : 'Mirror View';
        mirrorBtn.setAttribute('aria-pressed', String(isMirrored));
    }
}

// Continue to style page after photo capture
function continueToStyle() {
    if (photoData) {
        // Update the preview with properly positioned photo
        updatePreviewWithCutout();

        showFlowPage('style-page');
        resetInactivityTimer();
    } else {
        showFormAlert('photo-form-alert', 'Please capture a clear photo before choosing a style.');
        nudgeRpBear('Capture a clear photo first, then I will help with the frame.');
    }
}

// Save original photo to server
function saveOriginalPhoto() {
    if (!photoData) return Promise.resolve();

    return fetch('/api/feedback/save-photo', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            photo: photoData,
            userName: userData.name || 'anonymous',
            device: currentDevice
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success === false || data.error) {
                throw new Error(data.error || 'Original photo could not be saved.');
            }
            console.log('Original photo saved successfully:', data);
            userData.photoId = data.filename;
            userData.device = currentDevice;
            return data;
        })
        .catch(error => {
            console.error('Error saving original photo:', error);
            throw error;
        });
}

// Save processed photo with overlay to server
function saveProcessedPhoto() {
    if (!userData.processedPhoto) return Promise.resolve();

    return fetch('/api/feedback/save-processed-photo', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            photo: userData.processedPhoto,
            boomerangFrames: userData.captureMode === 'boomerang' ? userData.processedBoomerangFrames : null, // Backend creates final GIF from frames - changes made by nick
            boomerangFrameDelayMs: userData.captureMode === 'boomerang' ? userData.boomerangFrameDelayMs : null, // Preserve boomerang playback speed - changes made by nick
            userName: userData.name || 'anonymous',
            device: currentDevice,
            theme: selectedTheme,
            captureMode: userData.captureMode || captureMode,
            expectedFormat: userData.captureMode === 'boomerang' ? 'gif' : 'png' // Force boomerang email keepsake to save as GIF - changes made by nick
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success === false || data.error) {
                throw new Error(data.error || 'Processed photo could not be saved.');
            }
            console.log('Processed photo saved:', data);
            if (userData.captureMode === 'boomerang' && !String(data.filename || '').toLowerCase().endsWith('.gif')) {
                throw new Error('Boomerang was not saved as a GIF. Please try capturing it again.');
            }
            userData.processedPhotoId = data.filename;
            userData.processedPhoto = null; // Avoid resending large GIF/PNG data in final submission - changes made by nick
            userData.processedBoomerangFrames = null; // Avoid resending large boomerang frames in final submission - changes made by nick
            return data;
        })
        .catch(error => {
            console.error('Error saving processed photo:', error);
            throw error;
        });
}


// ==================== 7. OVERLAY & THEME FUNCTIONS ====================

// Load overlay options from database
async function loadOverlayOptions() {
    const overlayOptions = document.getElementById('overlay-options');
    if (!overlayOptions) return;

    try {
        if (kioskParametersLoadPromise) {
            await kioskParametersLoadPromise;
        }

        // Fetch overlays from the API
        const response = await fetch('/api/feedback/overlays');
        const data = await response.json();

        if (data.success && data.overlays.length > 0) {
            // Clear existing options
            overlayOptions.innerHTML = '';

            // Store overlay data including file paths for later use 
            overlayData = {};
            data.overlays.forEach(overlay => {
                overlayData[overlay.theme_id] = {
                    desktop_filename: overlay.desktop_filename,
                    mobile_filename: overlay.mobile_filename,
                    display_name: overlay.display_name
                };
            });
            console.log('Loaded overlay data from database:', overlayData);

            // Create theme options from database data
            data.overlays.forEach(overlay => {
                const themeOption = document.createElement('div');
                themeOption.className = 'theme-option';
                themeOption.onclick = () => selectTheme(overlay.theme_id, themeOption);

                // Generate a consistent color based on theme_id
                const color = generateColorFromThemeId(overlay.theme_id);

                themeOption.innerHTML = `
                    <div class="theme-swatch" style="background: ${color};"></div>
                    <div class="theme-name">${overlay.display_name}</div>
                `;

                overlayOptions.appendChild(themeOption);
            });

            // Select configured default theme when available; otherwise use the first theme.
            setTimeout(() => {
                const defaultThemeId = kioskParameters.visualAssets?.defaultOverlayTheme;
                const defaultIndex = data.overlays.findIndex(overlay => overlay.theme_id === defaultThemeId);
                const selectedIndex = defaultIndex >= 0 ? defaultIndex : 0;
                const themeElement = document.querySelectorAll('.theme-option')[selectedIndex];

                if (themeElement && data.overlays[selectedIndex]) {
                    const selectedOverlay = data.overlays[selectedIndex];
                    selectTheme(selectedOverlay.theme_id, themeElement);

                    // Update the selected overlay name display
                    document.getElementById('selected-overlay-name').textContent = selectedOverlay.display_name;
                }
            }, 100);

        } else {
            // Fallback to default themes if no overlays in database
            loadDefaultOverlayOptions();
        }
    } catch (error) {
        console.error('Error loading overlays:', error);
        // Fallback to default themes
        loadDefaultOverlayOptions();
    }
}

// Fallback function for default overlays
function loadDefaultOverlayOptions() {
    const overlayOptions = document.getElementById('overlay-options');
    if (!overlayOptions) return;

    const defaultThemes = [
        { theme_id: 'nature', display_name: 'Nature Theme' },
        { theme_id: 'modern', display_name: 'Modern Theme' },
        { theme_id: 'vintage', display_name: 'Vintage Theme' }
    ];

    defaultThemes.forEach(theme => {
        const themeOption = document.createElement('div');
        themeOption.className = 'theme-option';
        themeOption.onclick = () => selectTheme(theme.theme_id, themeOption);

        const color = generateColorFromThemeId(theme.theme_id);

        themeOption.innerHTML = `
            <div class="theme-swatch" style="background: ${color};"></div>
            <div class="theme-name">${theme.display_name}</div>
        `;

        overlayOptions.appendChild(themeOption);
    });

    // Select first default theme
    setTimeout(() => {
        const firstTheme = document.querySelector('.theme-option');
        if (firstTheme) {
            selectTheme(defaultThemes[0].theme_id, firstTheme);
            document.getElementById('selected-overlay-name').textContent = defaultThemes[0].display_name;
        }
    }, 100);
}

// Generate consistent colors from theme_id
function generateColorFromThemeId(themeId) {
    const colors = [
        '#10b981', '#22c55e', '#06b6d4', '#84cc16', '#3b82f6',
        '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#6366f1'
    ];

    // Simple hash to get consistent color for same theme_id
    let hash = 0;
    for (let i = 0; i < themeId.length; i++) {
        hash = themeId.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % colors.length;
    return colors[index];
}

// Select theme and update preview
function selectTheme(theme, element) {
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    element.classList.add('selected');
    selectedTheme = theme;

    // Update the selected overlay name display
    const selectedOption = element.querySelector('.theme-name');
    if (selectedOption) {
        document.getElementById('selected-overlay-name').textContent = selectedOption.textContent;
    }

    // Update preview with selected theme and device
    updateThemePreview();
    resetInactivityTimer();
}

// Update theme preview with correct file paths from database 
function updateThemePreview() {
    const overlayImage = document.getElementById('selected-overlay');

    // Get the correct path from overlayData (from database)
    let overlayPath;
    if (overlayData[selectedTheme]) {
        // Use the path from database - this works on both Windows and Linux
        overlayPath = currentDevice === 'mobile'
            ? overlayData[selectedTheme].mobile_filename
            : overlayData[selectedTheme].desktop_filename;
        console.log('Using database path for theme:', selectedTheme, '| Path:', overlayPath);
    } else {
        // Fallback to constructed path for default themes
        overlayPath = `/assets/overlays/${currentDevice === 'mobile' ? 'MobileOverlay' : 'DesktopOverlay'}/${selectedTheme}Theme${currentDevice === 'mobile' ? 'Mobile' : 'Desktop'}.png`;
        console.log('Using constructed path (fallback) for theme:', selectedTheme, '| Path:', overlayPath);
    }

    console.log('Loading overlay from:', overlayPath);
    overlayImage.src = overlayPath;

    // Add error handler to help debug
    overlayImage.onerror = function () {
        console.error('❌ Failed to load overlay:', overlayPath);
        console.error('Current device:', currentDevice);
        console.error('Selected theme:', selectedTheme);
        console.error('Available overlay data:', overlayData);
    };

    // Also update the preview photo if it exists
    updatePreviewWithCutout();
}

// Render one photo or boomerang frame into the overlay cutout - changes made by nick
function renderPreviewPhotoFrame(frameDataUrl, previewPhoto) {
    return new Promise((resolve) => {
        const previewCanvas = document.createElement('canvas');
        const ctx = previewCanvas.getContext('2d');

        // Set canvas size to match preview frame
        const previewDimensions = {
            'desktop': { width: 800, height: 450 },
            'mobile': { width: 324, height: 405 }
        };

        const dimensions = previewDimensions[currentDevice];
        previewCanvas.width = dimensions.width;
        previewCanvas.height = dimensions.height;

        // Cutout dimensions and positions for preview (scaled down from original)
        const cutoutSpecs = {
            'desktop': {
                cutoutWidth: 640,  // 1536 * (800/1920)
                cutoutHeight: 360, // 864 * (450/1080)
                cutoutX: 80,       // 192 * (800/1920)
                cutoutY: 23        // 55 * (450/1080)
            },
            'mobile': {
                cutoutWidth: 259,  // 864 * (324/1080)
                cutoutHeight: 324, // 1080 * (405/1350)
                cutoutX: 32,       // 108 * (324/1080)
                cutoutY: 15        // 51 * (405/1350)
            }
        };

        const cutout = cutoutSpecs[currentDevice];

        const img = new Image();
        img.onload = function () {
            // Fill background with white
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

            // Calculate scaling to fill the cutout (cover style)
            const scale = (shouldContainPhoto(frameDataUrl) ? Math.min : Math.max)(
                cutout.cutoutWidth / img.width,
                cutout.cutoutHeight / img.height
            );

            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;

            // Center the scaled image in the cutout
            const x = cutout.cutoutX + (cutout.cutoutWidth - scaledWidth) / 2;
            const y = cutout.cutoutY + (cutout.cutoutHeight - scaledHeight) / 2;

            // Draw the scaled photo in the cutout area
            ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

            // Update the preview image
            previewPhoto.src = previewCanvas.toDataURL('image/png');
            resolve();

            console.log('Preview updated with cutout positioning');
        };

        img.src = frameDataUrl;
    });
}

// Loop boomerang frames on the style preview page - changes made by nick
async function startBoomerangPreview(previewPhoto) {
    stopBoomerangPreview();

    if (!boomerangFrames.length) {
        return;
    }

    boomerangPreviewPhotoElement = previewPhoto;
    boomerangPreviewPaused = false;
    updateBoomerangPreviewControls(true);
    let frameIndex = 0;
    await renderPreviewPhotoFrame(boomerangFrames[frameIndex], previewPhoto);

    boomerangPreviewInterval = setInterval(() => {
        frameIndex = (frameIndex + 1) % boomerangFrames.length;
        renderPreviewPhotoFrame(boomerangFrames[frameIndex], previewPhoto);
    }, getBoomerangFrameDelayMs());
}

// Update preview with cutout and overlay positioning
function updatePreviewWithCutout() {
    const previewPhoto = document.getElementById('preview-photo');
    const overlayImage = document.getElementById('selected-overlay');

    if (!previewPhoto || !overlayImage || !photoData) return;

    // Animate the preview when the visitor captured a boomerang - changes made by nick
    if (userData.captureMode === 'boomerang' && boomerangFrames.length) {
        startBoomerangPreview(previewPhoto);
        return;
    }

    stopBoomerangPreview();
    updateBoomerangPreviewControls(hasRestorableBoomerang());
    renderPreviewPhotoFrame(photoData, previewPhoto);
}

function getGifCutoutLayout() { // changes made by nick
    const isMobile = currentDevice === 'mobile';
    const canvasWidth = isMobile ? 360 : 480;
    const canvasHeight = isMobile ? 450 : 270;
    const scaleX = canvasWidth / (isMobile ? 1080 : 1920);
    const scaleY = canvasHeight / (isMobile ? 1350 : 1080);
    const sourceCutout = isMobile
        ? { cutoutWidth: 864, cutoutHeight: 1080, cutoutX: 108, cutoutY: 51 }
        : { cutoutWidth: 1536, cutoutHeight: 864, cutoutX: 192, cutoutY: 55 };

    return {
        canvasWidth,
        canvasHeight,
        cutout: {
            cutoutWidth: sourceCutout.cutoutWidth * scaleX,
            cutoutHeight: sourceCutout.cutoutHeight * scaleY,
            cutoutX: sourceCutout.cutoutX * scaleX,
            cutoutY: sourceCutout.cutoutY * scaleY
        }
    };
}

function getOverlayPathForCurrentTheme() { // changes made by nick
    if (overlayData[selectedTheme]) {
        return currentDevice === 'mobile'
            ? overlayData[selectedTheme].mobile_filename
            : overlayData[selectedTheme].desktop_filename;
    }

    return `/assets/overlays/${currentDevice === 'mobile' ? 'MobileOverlay' : 'DesktopOverlay'}/${selectedTheme}Theme${currentDevice === 'mobile' ? 'Mobile' : 'Desktop'}.png`;
}

function loadImageElement(src) { // changes made by nick
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Unable to load image: ${src}`));
        image.src = src;
    });
}

function writeGifWord(bytes, value) { // changes made by nick
    bytes.push(value & 0xff, (value >> 8) & 0xff);
}

function writeGifString(bytes, value) { // changes made by nick
    for (let i = 0; i < value.length; i++) {
        bytes.push(value.charCodeAt(i));
    }
}

function getGifPalette() { // changes made by nick
    const palette = [];
    for (let red = 0; red < GIF_RED_LEVELS; red++) {
        for (let green = 0; green < GIF_GREEN_LEVELS; green++) {
            for (let blue = 0; blue < GIF_BLUE_LEVELS; blue++) {
                palette.push(
                    Math.round((red / (GIF_RED_LEVELS - 1)) * 255),
                    Math.round((green / (GIF_GREEN_LEVELS - 1)) * 255),
                    Math.round((blue / (GIF_BLUE_LEVELS - 1)) * 255)
                );
            }
        }
    }

    // GIF global colour tables must contain 256 entries; pad the unused slots. changes made by nick
    while (palette.length < 256 * 3) {
        palette.push(0, 0, 0);
    }
    return palette;
}

function imageDataToGifIndexes(imageData) { // changes made by nick
    const source = imageData.data;
    const indexes = new Uint8Array(imageData.width * imageData.height);
    for (let sourceIndex = 0, targetIndex = 0; sourceIndex < source.length; sourceIndex += 4, targetIndex++) {
        const red = Math.round((source[sourceIndex] / 255) * (GIF_RED_LEVELS - 1));
        const green = Math.round((source[sourceIndex + 1] / 255) * (GIF_GREEN_LEVELS - 1));
        const blue = Math.round((source[sourceIndex + 2] / 255) * (GIF_BLUE_LEVELS - 1));
        indexes[targetIndex] = (red * GIF_GREEN_LEVELS * GIF_BLUE_LEVELS) + (green * GIF_BLUE_LEVELS) + blue;
    }
    return indexes;
}

function lzwEncodeGifIndexes(indexes, minCodeSize = 8) { // changes made by nick
    const clearCode = 1 << minCodeSize;
    const endCode = clearCode + 1;
    let codeSize = minCodeSize + 1;
    let bitBuffer = 0;
    let bitCount = 0;
    const output = [];

    function writeCode(code) {
        bitBuffer |= code << bitCount;
        bitCount += codeSize;
        while (bitCount >= 8) {
            output.push(bitBuffer & 0xff);
            bitBuffer >>= 8;
            bitCount -= 8;
        }
    }

    // Use frequent clear codes instead of a growing dictionary so boomerang GIFs
    // stay valid across strict email clients such as Gmail mobile. changes made by nick
    writeCode(clearCode);
    let codesSinceClear = 0;
    for (let i = 0; i < indexes.length; i++) {
        writeCode(indexes[i]);
        codesSinceClear += 1;
        if (codesSinceClear >= 120 && i < indexes.length - 1) {
            writeCode(clearCode);
            codesSinceClear = 0;
            codeSize = minCodeSize + 1;
        }
    }

    writeCode(endCode);
    if (bitCount > 0) {
        output.push(bitBuffer & 0xff);
    }

    return output;
}

function writeGifSubBlocks(bytes, data) { // changes made by nick
    for (let index = 0; index < data.length; index += 255) {
        const block = data.slice(index, index + 255);
        bytes.push(block.length, ...block);
    }
    bytes.push(0);
}

function buildAnimatedGifDataUrl(frameImageDataList, delayMs) { // changes made by nick
    const width = frameImageDataList[0].width;
    const height = frameImageDataList[0].height;
    const bytes = [];
    const palette = getGifPalette();
    const delay = Math.max(2, Math.round(delayMs / 10));

    writeGifString(bytes, 'GIF89a');
    writeGifWord(bytes, width);
    writeGifWord(bytes, height);
    bytes.push(0xf7, 0, 0);
    bytes.push(...palette);
    bytes.push(0x21, 0xff, 0x0b);
    writeGifString(bytes, 'NETSCAPE2.0');
    bytes.push(0x03, 0x01);
    writeGifWord(bytes, 0);
    bytes.push(0);

    frameImageDataList.forEach((frameImageData) => {
        bytes.push(0x21, 0xf9, 0x04, 0x04);
        writeGifWord(bytes, delay);
        bytes.push(0, 0);
        bytes.push(0x2c);
        writeGifWord(bytes, 0);
        writeGifWord(bytes, 0);
        writeGifWord(bytes, width);
        writeGifWord(bytes, height);
        bytes.push(0);
        bytes.push(8);
        writeGifSubBlocks(bytes, lzwEncodeGifIndexes(imageDataToGifIndexes(frameImageData), 8));
    });

    bytes.push(0x3b);

    let binary = '';
    const chunkSize = 8192;
    for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
    }

    return `data:image/gif;base64,${btoa(binary)}`;
}

async function createBoomerangProcessedFrames() { // Backend-ready boomerang frames - changes made by nick
    const layout = getGifCutoutLayout();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const overlayPath = getOverlayPathForCurrentTheme();
    const overlayImg = await loadImageElement(overlayPath);
    const frameStep = Math.max(1, Math.ceil(boomerangFrames.length / getBoomerangMaxFrames()));
    const selectedFrames = boomerangFrames.filter((_, index) => index % frameStep === 0);
    const frameImageDataList = [];

    canvas.width = layout.canvasWidth;
    canvas.height = layout.canvasHeight;

    for (const frameDataUrl of selectedFrames) {
        const frameImg = await loadImageElement(frameDataUrl);
        const scale = Math.max(
            layout.cutout.cutoutWidth / frameImg.width,
            layout.cutout.cutoutHeight / frameImg.height
        );
        const scaledWidth = frameImg.width * scale;
        const scaledHeight = frameImg.height * scale;
        const x = layout.cutout.cutoutX + (layout.cutout.cutoutWidth - scaledWidth) / 2;
        const y = layout.cutout.cutoutY + (layout.cutout.cutoutHeight - scaledHeight) / 2;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(frameImg, x, y, scaledWidth, scaledHeight);
        ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
        frameImageDataList.push(canvas.toDataURL('image/png'));
    }

    return {
        frames: frameImageDataList,
        delayMs: getBoomerangFrameDelayMs() * frameStep
    };
}

// Process final photo with overlay for final submission
function processFinalPhoto() {
    return new Promise((resolve, reject) => {
        if (!photoData) {
            resolve();
            return;
        }

        if (userData.captureMode === 'boomerang' && boomerangFrames.length) {
            // Send composited frames to the backend so sharp creates the final GIF - changes made by nick
            createBoomerangProcessedFrames()
                .then((boomerangPayload) => {
                    if (!boomerangPayload.frames.length) {
                        throw new Error('Boomerang frames could not be prepared.');
                    }
                    userData.processedBoomerangFrames = boomerangPayload.frames;
                    userData.boomerangFrameDelayMs = boomerangPayload.delayMs;
                    userData.processedPhoto = boomerangPayload.frames[0]; // Still preview fallback while backend creates GIF - changes made by nick
                    console.log('Final boomerang frames prepared for backend GIF generation');
                    resolve();
                })
                .catch((error) => {
                    console.error('Boomerang frame processing failed:', error);
                    userData.processedBoomerangFrames = null;
                    userData.processedPhoto = null;
                    reject(error);
                });
            return;
        }

        processFinalPhotoFromStillFrame().then(resolve);
    });
}

function processFinalPhotoFromStillFrame() { // changes made by nick
    return new Promise((resolve) => {
        if (!photoData) {
            resolve();
            return;
        }

        // Create a canvas to combine photo and overlay
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas size based on device (full size)
        const deviceDimensions = {
            'desktop': { width: 1920, height: 1080 },
            'mobile': { width: 1080, height: 1350 }
        };

        const dimensions = deviceDimensions[currentDevice];
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;

        // Cutout dimensions and positions based on device (full size)
        const cutoutSpecs = {
            'desktop': {
                cutoutWidth: 1536,
                cutoutHeight: 864,
                cutoutX: 192,
                cutoutY: 55
            },
            'mobile': {
                cutoutWidth: 864,
                cutoutHeight: 1080,
                cutoutX: 108,
                cutoutY: 51
            }
        };

        const cutout = cutoutSpecs[currentDevice];

        // Load the original photo
        const img = new Image();
        img.onload = function () {
            // Fill background with white
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Calculate scaling to fill the cutout (cover style)
            const scale = (shouldContainPhoto(photoData) ? Math.min : Math.max)(
                cutout.cutoutWidth / img.width,
                cutout.cutoutHeight / img.height
            );

            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;

            // Centre the scaled image in the cutout
            const x = cutout.cutoutX + (cutout.cutoutWidth - scaledWidth) / 2;
            const y = cutout.cutoutY + (cutout.cutoutHeight - scaledHeight) / 2;

            // Draw the scaled photo in the cutout area
            ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

            // Load and apply the overlay (border)
            const overlayImg = new Image();
            overlayImg.onload = function () {
                // Draw the overlay on top (this should be the border with transparent cutout)
                ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);

                // Save the final processed photo data (but don't save to server yet)
                userData.processedPhoto = canvas.toDataURL('image/png');

                console.log('Final photo processed with overlay and proper cutout positioning');
                resolve();
            };

            const overlayPath = getOverlayPathForCurrentTheme(); // changes made by nick
            console.log('Processing final photo with overlay:', overlayPath);
            overlayImg.src = overlayPath;

            // If overlay fails to load, still proceed with the base photo
            overlayImg.onerror = function () {
                console.error('❌ Failed to load overlay for final processing:', overlayPath);
                console.error('Current device:', currentDevice);
                console.error('Selected theme:', selectedTheme);
                console.error('Available overlay data:', overlayData);
                userData.processedPhoto = canvas.toDataURL('image/png');
                resolve();
            };
        };

        img.src = photoData;
    });
}


// ==================== 8. PAGE NAVIGATION FUNCTIONS ====================

// Show consent page from landing page
function showConsentPage() {
    clearValidationMessages();
    selectedRetention = LONG_TERM_RETENTION;
    showFlowPage('details-page');
    resetInactivityTimer();
}

// Select retention option on consent page
function selectOption(option, element) {
    clearValidationMessages();
    document.querySelectorAll('.retention-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    element.classList.add('selected');
    selectedRetention = LONG_TERM_RETENTION;
    const proceedBtn = document.getElementById('proceedBtn');
    if (proceedBtn) proceedBtn.disabled = false;
    resetInactivityTimer();
}

// Show details page from consent page
function showDetailsPage() {
    selectedRetention = LONG_TERM_RETENTION;
    showFlowPage('details-page');
    resetInactivityTimer();
}

// Retake photo from style page
function retakePhotoFromStyle() {
    boomerangFrames = [];
    clearRestorableBoomerang();
    userData.processedBoomerangFrames = null; // Clear previous GIF payload when retaking from style page (DONE BY NICK)
    userData.boomerangFrameDelayMs = null; // Clear previous GIF timing when retaking from style page (DONE BY NICK)
    stopBoomerangPreview();

    // Show appropriate photo page based on device
    if (currentDevice === 'mobile') {
        // For mobile users, go to file upload page
        showFlowPage('file-upload-page');
    } else {
        // For desktop users, go to camera capture page
        showFlowPage('photo-page');
        // Reinitialize camera for desktop
        initializeCamera();
    }

    resetInactivityTimer();
}

// Confirm style and proceed to confirmation page
function confirmStyle() {
    // Process the final photo with overlay but doesnt save yet
    setRpBearMood('thinking');
    setRpBearSpeech(userData.captureMode === 'boomerang'
        ? 'Making your animated GIF keepsake now.'
        : 'Applying your selected frame now.', true);
    processFinalPhoto().then(() => {
        showFlowPage('confirmation-page');
        resetInactivityTimer();

        // Update confirmation page details
        updateConfirmationDetails();
        setRpBearMood(null);
        cheerRpBear('Style saved. One final check and you are done.');
    }).catch((error) => {
        console.error('Could not prepare final keepsake:', error);
        setRpBearMood(null);
        nudgeRpBear(userData.captureMode === 'boomerang'
            ? 'I could not make the GIF. Please retake the boomerang so it can email correctly.'
            : 'I could not apply the frame. Please try again.');
        showFormAlert('photo-form-alert', error.message || 'Could not prepare the final keepsake. Please try again.');
    });
}

function setConfirmationValue(id, value) { // changes made by nick
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

// Update confirmation page with user data
function updateConfirmationDetails() {
    // Update confirmation page with user data
    const focusList = formatPledgeTopicList(userData.pledgeTopics || (userData.pledgeTopic ? [userData.pledgeTopic] : []));
    const pledgeSummary = userData.pledgeSkipped
        ? 'Skipped - Feedback Contributor badge'
        : `${userData.pledge || 'Not provided'}${focusList ? ` | Focus: ${focusList}` : ''}`;
    setConfirmationValue('confirm-name', userData.name || 'Not provided');
    setConfirmationValue('confirm-email', userData.email || 'Not provided');
    setConfirmationValue('confirm-pledge', pledgeSummary);
    setConfirmationValue('confirm-theme', userData.photoSkipped ? 'Not selected' : selectedTheme);
    setConfirmationValue('confirm-retention', selectedRetention === 'longterm' ? 'Long-Term' : getTemporaryRetentionLabel());
    const photoReady = document.getElementById('confirm-photo-ready');
    const emailPhotoReady = document.getElementById('confirm-email-photo-ready');
    if (userData.photoSkipped) {
        if (photoReady) photoReady.textContent = 'Skipped by visitor';
        if (emailPhotoReady) emailPhotoReady.textContent = getFeatureFlags().thankYouEmailEnabled === false ? 'Disabled' : 'No photo to send';
    } else if (!photoData && !userData.processedPhoto) {
        if (photoReady) photoReady.textContent = 'Not required';
        if (emailPhotoReady) emailPhotoReady.textContent = getFeatureFlags().thankYouEmailEnabled === false ? 'Disabled' : 'No photo to send';
    } else {
        if (photoReady) photoReady.textContent = getDynamicLanguageText().confirmPhotoReady || 'Ready to be uploaded';
        if (emailPhotoReady) emailPhotoReady.textContent = getFeatureFlags().thankYouEmailEnabled === false
            ? 'Disabled'
            : (getDynamicLanguageText().confirmEmailPhotoReady || 'Will be sent to your email');
    }

    // Show how many questions were answered
    const answeredCount = Object.keys(userData.answers || {}).length;
    setConfirmationValue('confirm-questions', getDynamicLanguageText().questionsAnswered(answeredCount));
}

// Go back from confirmation to style page
function goBackToStyle() {
    if (userData.photoSkipped || (!photoData && !userData.processedPhoto)) {
        showFlowPage('photo-choice-page');
    } else {
        showFlowPage('style-page');
    }
    setRpBearSpeech('No problem. Let us adjust that before submitting.', true);
    resetInactivityTimer();
}

// Final submission with photo saving
function finalSubmit() {
    const submitBtn = document.querySelector('#confirmation-page .consent-button');
    const originalText = submitBtn.innerHTML;
    document.body.classList.add('submitting-feedback');

    submitBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="8" stroke="white" stroke-width="1.5"/>
            <path d="M10 6V10L12 12" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        Submitting...
    `;
    submitBtn.disabled = true;
    setRpBearMood('thinking');
    setRpBearSpeech('Submitting now. I am saving your visit and preparing the email.', true);

    // Clear inactivity timer since submission is in progress
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
    }

    // Save photos and submit data only when user confirms
    Promise.all([
        saveOriginalPhoto(),
        saveProcessedPhoto()
    ]).then(() => {
        // Send final submission to server
        return fetch('/api/feedback/submit-feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userData: userData,
                device: currentDevice,
                theme: selectedTheme,
                retention: LONG_TERM_RETENTION
            })
        });
    }).then(response => response.json())
        .then(data => {
            if (data.success === false) {
                const validationMessage = Array.isArray(data.errors)
                    ? data.errors.map(error => error.message).join('\n')
                    : (data.message || 'Submission validation failed.');
                throw new Error(validationMessage);
            }

            console.log('Feedback submitted successfully:', data);
            const submissionData = data.data || data;

            // Show thank you page
            showFlowPage('thankyou-page');
            cheerRpBear('All done. Your visit has been saved.');

            // Show the visitor which badge/leaf reward they unlocked.
            setupBadgeReward(submissionData);
            setupCelebrationMoment(submissionData);
            // Show visitor number and milestone confetti on thank-you page - changes made by nick
            setupVisitorMilestone(submissionData);
            setupJourneyPassport(submissionData);
            setupKeepsakeDownload(submissionData); // Downloadable visitor keepsake (DONE BY NICK)

            // Set up social share content for the thank-you page based on combined email queue status.
            setupSocialShare(submissionData);

            // Reset button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            document.body.classList.remove('submitting-feedback');
            setRpBearMood(null);
        })
        .catch(error => {
            console.error('Error submitting feedback:', error);
            showVisitorNotice('confirmation-form-alert', error.message || 'Error submitting feedback. Please try again.', 'Submission did not go through. Check the message, then try again.');

            // Reset button on error
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            document.body.classList.remove('submitting-feedback');
            setRpBearMood(null);

            // Restart timer since submission failed
            startInactivityTimer();
        });
}

function setupKeepsakeDownload(data = {}) { // Thank-you page downloadable keepsake (DONE BY NICK)
    const button = document.getElementById('keepsake-download-btn');
    if (!button) return;

    const processedId = userData.processedPhotoId || data.processedPhotoId;
    const rawId = userData.photoId || data.photoId;
    const captureLabel = userData.captureMode === 'boomerang' ? 'boomerang' : 'photo';
    const downloadPath = processedId
        ? `/uploads/processed/${processedId}`
        : rawId
            ? `/uploads/photos/${rawId}`
            : '';

    if (!downloadPath) {
        button.hidden = true;
        button.dataset.downloadUrl = '';
        return;
    }

    button.hidden = false;
    button.dataset.downloadUrl = downloadPath;
    button.dataset.downloadName = `rp-esg-${captureLabel}-keepsake`;
}

function downloadVisitorKeepsake() { // Download saved keepsake from thank-you page (DONE BY NICK)
    const button = document.getElementById('keepsake-download-btn');
    const downloadUrl = button?.dataset.downloadUrl || '';
    if (!downloadUrl) return;

    const extension = downloadUrl.split('.').pop() || (userData.captureMode === 'boomerang' ? 'gif' : 'png');
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${button.dataset.downloadName || 'rp-esg-keepsake'}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    resetInactivityTimer();
}

// Build share text and social media links for the final thank-you page
// Added by XY: social media sharing implementation
function getShareText() {
    const pledgeText = (userData.pledge || '').trim();
    if (userData.pledgeSkipped) {
        return 'I shared feedback with the Republic Polytechnic sustainability initiative! #RPGreen #Sustainability #ESG';
    }
    const topicList = formatPledgeTopicList(userData.pledgeTopics || (userData.pledgeTopic ? [userData.pledgeTopic] : []));
    const topicText = topicList ? ` (${topicList})` : '';
    const pledgeMessage = pledgeText ? `I just pledged: "${pledgeText}"${topicText}.` : 'I just made a sustainability pledge.';
    return `${pledgeMessage} Join me in supporting the Republic Polytechnic sustainability initiative! #RPGreen #Sustainability #ESG`;
}

const BADGE_LEAF_REWARDS = {
    'climate-champion': {
        badgeName: 'Climate Champion',
        leaf: 'blue-green climate leaf'
    },
    'renewable-innovator': {
        badgeName: 'Renewable Innovator',
        leaf: 'bright energy leaf'
    },
    'sustainable-living-advocate': {
        badgeName: 'Sustainable Living Advocate',
        leaf: 'fresh green living leaf'
    },
    'ocean-guardian': {
        badgeName: 'Ocean Guardian',
        leaf: 'ocean-blue leaf'
    },
    'governance-guardian': {
        badgeName: 'Governance Guardian',
        leaf: 'purple ethics leaf'
    },
    'social-champion': {
        badgeName: 'Social Champion',
        leaf: 'warm community leaf'
    },
    'feedback-completer': {
        badgeName: 'Feedback Contributor',
        leaf: 'classic feedback leaf'
    }
};

function setupBadgeReward(data) {
    const message = document.getElementById('thankyou-message');
    if (!message) return;

    const badgeKey = data?.badgeKey || 'feedback-completer';
    const reward = BADGE_LEAF_REWARDS[badgeKey] || BADGE_LEAF_REWARDS['feedback-completer'];
    const badges = Array.isArray(data?.badges) && data.badges.length
        ? data.badges
        : [{ badgeKey, badgeName: data?.badgeName || reward.badgeName }];
    const badgeNames = badges.map(badge => badge.badgeName).filter(Boolean).join(', ');

    message.textContent = `Your feedback has been recorded. You earned ${badgeNames || reward.badgeName}, and your name will appear on the digital tree as a ${reward.leaf}.`;
}

function getCelebrationBadgeKey(data) {
    if (Array.isArray(data?.badgeKeys) && data.badgeKeys[0]) return data.badgeKeys[0];
    if (Array.isArray(data?.badges) && data.badges[0]?.badgeKey) return data.badges[0].badgeKey;
    return data?.badgeKey || 'feedback-completer';
}

function getConfiguredBadgeLeafStyles() {
    const fallbackColors = {
        'climate-champion': '#0f766e',
        'renewable-innovator': '#f59e0b',
        'sustainable-living-advocate': '#16a34a',
        'ocean-guardian': '#0284c7',
        'governance-guardian': '#7c3aed',
        'social-champion': '#d97706',
        'feedback-completer': '#4a7c59'
    };
    const styles = kioskParameters.badgeLeafStyles || {};
    const leafScale = Number(styles.leafScale);

    return {
        colors: {
            ...fallbackColors,
            ...(styles.colors || {})
        },
        leafScale: Number.isFinite(leafScale) ? Math.min(2, Math.max(0.4, leafScale)) : 1
    };
}

function getCelebrationBadgeColor(badgeKey, data) {
    const colorMap = getConfiguredBadgeLeafStyles().colors;

    return colorMap[badgeKey] || data?.badgeColor || colorMap['feedback-completer'];
}

const CELEBRATION_LEAF_IMAGES = {
    'climate-champion': '/assets/Tree/leaf/NewLeftLeaf.png',
    'renewable-innovator': '/assets/Tree/leaf/NewRightLeaf.png',
    'sustainable-living-advocate': '/assets/Tree/leaf/OldLeftLeaf.png',
    'ocean-guardian': '/assets/Tree/leaf/NewRightLeaf.png',
    'governance-guardian': '/assets/Tree/leaf/OldLeftLeaf.png',
    'social-champion': '/assets/Tree/leaf/OldRightLeaf.png',
    'feedback-completer': '/assets/Tree/leaf/NewLeftLeaf.png'
};

const CELEBRATION_FLIGHT_TARGETS = {
    'climate-champion': { x: 118, y: -116, arcX: 54, arcY: -86, left: '58%', top: '32%' },
    'renewable-innovator': { x: 142, y: -126, arcX: 76, arcY: -92, left: '66%', top: '28%' },
    'sustainable-living-advocate': { x: 128, y: -104, arcX: 68, arcY: -76, left: '62%', top: '38%' },
    'ocean-guardian': { x: 150, y: -98, arcX: 82, arcY: -72, left: '70%', top: '42%' },
    'governance-guardian': { x: 108, y: -98, arcX: 48, arcY: -72, left: '55%', top: '40%' },
    'social-champion': { x: 138, y: -108, arcX: 74, arcY: -78, left: '67%', top: '36%' },
    'feedback-completer': { x: 126, y: -112, arcX: 62, arcY: -78, left: '61%', top: '34%' }
};

function getCelebrationLeafImage(badgeKey) {
    return CELEBRATION_LEAF_IMAGES[badgeKey] || CELEBRATION_LEAF_IMAGES['feedback-completer'];
}

function getCelebrationFlightTarget(badgeKey) {
    const target = CELEBRATION_FLIGHT_TARGETS[badgeKey] || CELEBRATION_FLIGHT_TARGETS['feedback-completer'];

    return {
        ...target,
        swerveX: target.swerveX ?? target.arcX - 24,
        swerveY: target.swerveY ?? target.arcY - 22,
        settleX: target.settleX ?? target.x - 8,
        settleY: target.settleY ?? target.y + 8
    };
}

function renderCelebrationLeaves(color, flightTarget = getCelebrationFlightTarget('feedback-completer')) {
    const leaves = document.getElementById('celebration-tree-leaves');
    if (!leaves) return;

    const positions = [
        [44, 28], [54, 22], [61, 34], [36, 38], [48, 44],
        [58, 48], [69, 43], [31, 50], [43, 56], [55, 58],
        [65, 56], [49, 33]
    ];

    const backgroundLeaves = positions.map(([left, top], index) => `
        <span
            class="celebration-tree-dot"
            style="left:${left}%; top:${top}%; background:${color}; animation-delay:${200 + (index * 70)}ms;"
        ></span>
    `).join('');

    leaves.innerHTML = `${backgroundLeaves}
        <span
            class="celebration-tree-dot landing-leaf"
            style="--celebration-target-left:${flightTarget.left}; --celebration-target-top:${flightTarget.top}; background:${color};"
        ></span>
    `;
}

function setCelebrationCounter(id, value) {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = Number.isFinite(Number(value))
        ? new Intl.NumberFormat('en-SG').format(Number(value))
        : '--';
}

function getCelebrationCounterValue(id) {
    const text = document.getElementById(id)?.textContent || '';
    const value = Number(text.replace(/,/g, ''));
    return Number.isFinite(value) ? value : 0;
}

// Visitor number and milestone celebration helpers - changes made by nick
const VISITOR_MILESTONE_INTERVAL = 50;

function formatVisitorCount(value) {
    const count = Number(value);
    return Number.isFinite(count) && count > 0
        ? new Intl.NumberFormat('en-SG').format(Math.round(count))
        : '--';
}

function getVisitorPledgeMilestone(totalPledges) {
    const total = Math.max(0, Number(totalPledges) || 0);
    return Math.floor(total / VISITOR_MILESTONE_INTERVAL) * VISITOR_MILESTONE_INTERVAL;
}

function ensureVisitorMilestonePanel() {
    let panel = document.getElementById('visitor-milestone-panel');
    if (panel) return panel;

    const thankyouMessage = document.getElementById('thankyou-message');
    const thankyouPage = document.getElementById('thankyou-page');
    if (!thankyouMessage || !thankyouPage) return null;

    panel = document.createElement('div');
    panel.id = 'visitor-milestone-panel';
    panel.className = 'visitor-milestone-panel';
    panel.setAttribute('aria-live', 'polite');

    thankyouMessage.insertAdjacentElement('afterend', panel);
    return panel;
}

function renderVisitorMilestoneMessage(visitorNumber, totalPledges) {
    const panel = ensureVisitorMilestonePanel();
    if (!panel) return;

    const pledgeMilestone = getVisitorPledgeMilestone(totalPledges);
    const pledgeCopy = pledgeMilestone > 0
        ? `Thanks to you, our school has now crossed ${formatVisitorCount(pledgeMilestone)} pledges.`
        : `Thanks to you, our school has now reached ${formatVisitorCount(totalPledges)} pledge${Number(totalPledges) === 1 ? '' : 's'}.`;

    panel.innerHTML = `
        <span class="visitor-milestone-kicker">Visitor milestone</span>
        <strong>You are visitor #${formatVisitorCount(visitorNumber)}!</strong>
        <span>${pledgeCopy}</span>
    `;
}

function launchVisitorMilestoneConfetti(visitorNumber) {
    if (!Number.isFinite(Number(visitorNumber)) || Number(visitorNumber) % VISITOR_MILESTONE_INTERVAL !== 0) return;
    if (document.body.dataset.visitorMilestoneShown === String(visitorNumber)) return;

    document.body.dataset.visitorMilestoneShown = String(visitorNumber);
    const popup = document.createElement('div');
    popup.className = 'visitor-milestone-popup';
    popup.setAttribute('role', 'status');
    popup.setAttribute('aria-live', 'polite');

    const colors = ['#10b981', '#34d399', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'];
    const confetti = Array.from({ length: 48 }, (_, index) => {
        const left = 8 + ((index * 17) % 84);
        const drift = ((index % 9) - 4) * 18;
        const delay = (index % 12) * 70;
        const duration = 1900 + ((index % 8) * 120);
        const color = colors[index % colors.length];
        return `<span style="--confetti-left:${left}%; --confetti-drift:${drift}px; --confetti-delay:${delay}ms; --confetti-duration:${duration}ms; --confetti-color:${color};"></span>`;
    }).join('');

    popup.innerHTML = `
        <div class="visitor-confetti-burst" aria-hidden="true">${confetti}</div>
        <div class="visitor-milestone-card">
            <span>Milestone visitor</span>
            <strong>#${formatVisitorCount(visitorNumber)}</strong>
            <p>You helped us reach another ${VISITOR_MILESTONE_INTERVAL}-visitor milestone.</p>
        </div>
    `;

    document.body.appendChild(popup);
    window.setTimeout(() => popup.classList.add('is-visible'), 20);
    window.setTimeout(() => {
        popup.classList.remove('is-visible');
        window.setTimeout(() => popup.remove(), 420);
    }, 4200);
}

async function setupVisitorMilestone(data = {}) {
    let visitorNumber = Number(data.visitorNumber);
    const optimisticPledgeCount = userData.pledgeSkipped ? 0 : 1;

    renderVisitorMilestoneMessage(visitorNumber, optimisticPledgeCount);
    launchVisitorMilestoneConfetti(visitorNumber);

    try {
        const snapshot = await fetchCelebrationImpactSnapshot();
        if (!Number.isFinite(visitorNumber) || visitorNumber <= 0) {
            // Fall back to the refreshed tree count if the submit response has no visitor number - changes made by nick
            visitorNumber = Math.max(1, Number(snapshot.treeLeaves || 0));
        }
        const totalPledges = Math.max(optimisticPledgeCount, Number(snapshot.totalPledges || 0) + optimisticPledgeCount);
        renderVisitorMilestoneMessage(visitorNumber, totalPledges);
        launchVisitorMilestoneConfetti(visitorNumber);
    } catch (error) {
        console.warn('Visitor milestone pledge count unavailable:', error);
    }
}

async function fetchCelebrationImpactSnapshot() {
    const [pledgeResult, treeResult] = await Promise.allSettled([
        fetch('/api/pledgeboard/pledges', { headers: { 'Cache-Control': 'no-cache' } }).then(response => response.json()),
        fetch('/api/tree', { headers: { 'Cache-Control': 'no-cache' } }).then(response => response.json())
    ]);

    const pledges = pledgeResult.status === 'fulfilled' && Array.isArray(pledgeResult.value?.pledges)
        ? pledgeResult.value.pledges
        : [];
    const treeLeaves = treeResult.status === 'fulfilled' && Array.isArray(treeResult.value)
        ? treeResult.value.length
        : null;

    const now = new Date();
    const monthPledges = pledges.filter((pledge) => {
        const created = new Date(pledge.created_at);
        return !Number.isNaN(created.getTime()) &&
            created.getFullYear() === now.getFullYear() &&
            created.getMonth() === now.getMonth();
    }).length;

    return {
        monthPledges,
        totalPledges: pledges.length,
        treeLeaves
    };
}

function renderCelebrationImpactCounters(snapshot = {}, optimistic = true) {
    const pledgeIncrement = optimistic && !userData.pledgeSkipped ? 1 : 0;
    const leafIncrement = optimistic ? 1 : 0;

    let monthPledges = Math.max(0, Number(snapshot.monthPledges || 0) + pledgeIncrement);
    let totalPledges = Math.max(0, Number(snapshot.totalPledges || 0) + pledgeIncrement);
    let treeLeaves = Math.max(1, Number(snapshot.treeLeaves || 0) + leafIncrement);

    if (!optimistic) {
        monthPledges = Math.max(monthPledges, getCelebrationCounterValue('celebration-month-pledges'));
        totalPledges = Math.max(totalPledges, getCelebrationCounterValue('celebration-total-pledges'));
        treeLeaves = Math.max(treeLeaves, getCelebrationCounterValue('celebration-tree-count'));
    }

    setCelebrationCounter('celebration-month-pledges', monthPledges);
    setCelebrationCounter('celebration-total-pledges', totalPledges);
    setCelebrationCounter('celebration-tree-count', treeLeaves);
}

async function loadCelebrationImpactCounters() {
    renderCelebrationImpactCounters({}, true);

    const firstSnapshot = await fetchCelebrationImpactSnapshot();
    renderCelebrationImpactCounters(firstSnapshot, true);

    window.setTimeout(async () => {
        try {
            const refreshedSnapshot = await fetchCelebrationImpactSnapshot();
            renderCelebrationImpactCounters(refreshedSnapshot, false);
        } catch (error) {
            console.warn('Celebration counter refresh unavailable:', error);
        }
    }, 1800);
}

function setupCelebrationMoment(data) {
    const celebration = document.getElementById('celebration-moment');
    if (!celebration) return;

    const badgeKey = getCelebrationBadgeKey(data);
    const reward = BADGE_LEAF_REWARDS[badgeKey] || BADGE_LEAF_REWARDS['feedback-completer'];
    const color = getCelebrationBadgeColor(badgeKey, data);
    const badgeLeafStyles = getConfiguredBadgeLeafStyles();
    const flightTarget = getCelebrationFlightTarget(badgeKey);

    celebration.style.setProperty('--celebration-badge-color', color);
    celebration.style.setProperty('--celebration-leaf-scale', badgeLeafStyles.leafScale);
    celebration.style.setProperty('--celebration-leaf-image', `url('${getCelebrationLeafImage(badgeKey)}')`);
    celebration.style.setProperty('--celebration-flight-x', `${flightTarget.x}px`);
    celebration.style.setProperty('--celebration-flight-y', `${flightTarget.y}px`);
    celebration.style.setProperty('--celebration-arc-x', `${flightTarget.arcX}px`);
    celebration.style.setProperty('--celebration-arc-y', `${flightTarget.arcY}px`);
    celebration.style.setProperty('--celebration-swerve-x', `${flightTarget.swerveX}px`);
    celebration.style.setProperty('--celebration-swerve-y', `${flightTarget.swerveY}px`);
    celebration.style.setProperty('--celebration-settle-x', `${flightTarget.settleX}px`);
    celebration.style.setProperty('--celebration-settle-y', `${flightTarget.settleY}px`);
    celebration.style.setProperty('--celebration-target-left', flightTarget.left);
    celebration.style.setProperty('--celebration-target-top', flightTarget.top);
    celebration.classList.remove('is-ready');

    const badgeName = document.getElementById('celebration-badge-name');
    const badgeCaption = document.getElementById('celebration-badge-caption');
    const photo = document.getElementById('celebration-photo');
    const title = document.getElementById('celebration-keepsake-title');
    const copy = document.getElementById('celebration-keepsake-copy');

    const badgeListText = Array.isArray(data?.badges) && data.badges.length
        ? data.badges.map(badge => badge.badgeName).filter(Boolean).join(', ')
        : reward.badgeName;
    if (badgeName) badgeName.textContent = badgeListText || reward.badgeName;
    if (badgeCaption) badgeCaption.textContent = userData.pledgeSkipped ? 'Feedback recorded' : (Array.isArray(data?.badges) && data.badges.length > 1 ? 'Badges unlocked' : 'Badge unlocked');

    if (photo) {
        const keepsakePhoto = userData.processedPhoto || photoData || '';
        if (keepsakePhoto) {
            photo.src = keepsakePhoto;
            photo.style.display = 'block';
        } else {
            photo.removeAttribute('src');
            photo.style.display = 'none';
        }
    }

    if (title) title.textContent = userData.pledgeSkipped ? 'Your feedback joined the tree' : 'Your pledge joined the tree';
    if (copy) {
        copy.textContent = userData.pledgeSkipped
            ? 'Your visit still grows the ESG digital tree as a feedback contribution.'
            : `Your ${reward.leaf} is now part of the ESG digital tree.`;
    }

    renderCelebrationLeaves(color, flightTarget);
    loadCelebrationImpactCounters().catch((error) => {
        console.warn('Celebration counters unavailable:', error);
        setCelebrationCounter('celebration-month-pledges', userData.pledgeSkipped ? 0 : 1);
        setCelebrationCounter('celebration-total-pledges', userData.pledgeSkipped ? 0 : 1);
        setCelebrationCounter('celebration-tree-count', 1);
    });

    window.setTimeout(() => {
        celebration.classList.add('is-ready');
    }, 80);
}

function setPassportStamp(stampId, status, titleId, title, detailId, detail) {
    const stamp = document.getElementById(stampId);
    const titleElement = titleId ? document.getElementById(titleId) : null;
    const detailElement = detailId ? document.getElementById(detailId) : null;

    if (!stamp) return;

    stamp.classList.remove('complete', 'optional', 'pending');
    stamp.classList.add(status);

    if (titleElement && title) titleElement.textContent = title;
    if (detailElement && detail) detailElement.textContent = detail;
}

function getPassportPhotoStatus(data) {
    const flags = getFeatureFlags();
    const hasPhoto = Boolean(userData.processedPhotoId || userData.photoId || userData.processedPhoto || photoData);
    const hasEmail = Boolean(userData.email && userData.email.includes('@'));
    const visitorEmailEnabled = flags.thankYouEmailEnabled !== false || flags.badgeEmailEnabled !== false;

    if (!visitorEmailEnabled) {
        return {
            status: 'optional',
            title: 'Visitor email disabled',
            detail: 'The admin setting has visitor emails turned off.'
        };
    }

    if (data?.emailQueued && hasEmail) {
        return {
            status: 'complete',
            title: hasPhoto ? 'Visitor email queued' : 'Badge email queued',
            detail: `Your visitor passport update is being sent to ${userData.email}.`
        };
    }

    if (!hasPhoto) {
        return {
            status: 'optional',
            title: 'No photo email needed',
            detail: hasEmail
                ? 'This visit was saved without a keepsake photo; your badge can still be emailed.'
                : 'This visit was saved without a keepsake photo.'
        };
    }

    if (!hasEmail) {
        return {
            status: 'optional',
            title: 'Photo kept local',
            detail: 'No email address was provided for this visit.'
        };
    }

    return {
        status: 'pending',
        title: 'Photo saved',
        detail: 'Your keepsake was prepared for this visit.'
    };
}

function getPassportLeafMessage(leafName) {
    const leafText = leafName || 'classic feedback leaf';
    const article = /^[aeiou]/i.test(leafText) ? 'An' : 'A';
    return `${article} ${leafText} was added to the ESG tree.`;
}

function escapePassportHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatPassportDate(value) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return 'Today';
    return date.toLocaleDateString('en-SG', {
        day: '2-digit',
        month: 'short'
    });
}

function getCurrentPassportBadge(data) {
    const badgeKey = getCelebrationBadgeKey(data);
    const reward = BADGE_LEAF_REWARDS[badgeKey] || BADGE_LEAF_REWARDS['feedback-completer'];
    return {
        key: badgeKey,
        name: reward.badgeName,
        color: getCelebrationBadgeColor(badgeKey, data),
        count: 1
    };
}

function getCurrentPassportBadges(data) {
    const responseBadges = Array.isArray(data?.badges) ? data.badges : [];
    if (responseBadges.length > 0) {
        return responseBadges.map((badge) => {
            const badgeKey = badge.badgeKey || 'feedback-completer';
            const reward = BADGE_LEAF_REWARDS[badgeKey] || BADGE_LEAF_REWARDS['feedback-completer'];
            return {
                key: badgeKey,
                name: badge.badgeName || reward.badgeName,
                color: badge.badgeColor || getCelebrationBadgeColor(badgeKey, data),
                count: 1
            };
        });
    }

    return [getCurrentPassportBadge(data)];
}

function formatPassportTopicLabel(topic) {
    return String(topic || '')
        .split('-')
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function isCurrentPassportVisit(visit, data, currentBadge) {
    const submitted = data?.submittedAt ? new Date(data.submittedAt) : null;
    const created = visit?.createdAt ? new Date(visit.createdAt) : null;
    const sameBadge = !visit?.badgeKey ||
        visit.badgeKey === currentBadge.key ||
        visit.badgeName === currentBadge.name;

    if (!sameBadge || !submitted || !created || Number.isNaN(submitted.getTime()) || Number.isNaN(created.getTime())) {
        return false;
    }

    return Math.abs(created.getTime() - submitted.getTime()) <= 5 * 60 * 1000;
}

function renderVisitorPassportHistory(passportData, data) {
    const history = document.getElementById('passport-history');
    const summary = document.getElementById('passport-summary');
    const badgeGrid = document.getElementById('passport-collected-badges');
    const recentList = document.getElementById('passport-recent-visits');
    const title = document.getElementById('passport-title');
    if (!history || !summary || !badgeGrid || !recentList) return;

    const currentBadges = getCurrentPassportBadges(data);
    const currentBadge = currentBadges[0] || getCurrentPassportBadge(data);
    const passport = passportData || {};
    const backendBadges = Array.isArray(passport.badges) ? passport.badges : [];
    const backendVisits = Array.isArray(passport.recentVisits) ? passport.recentVisits : [];
    const currentVisit = {
        createdAt: data?.submittedAt || new Date().toISOString(),
        badgeKey: currentBadge.key,
        badgeName: currentBadges.map(badge => badge.name).join(', ') || currentBadge.name,
        badgeColor: currentBadge.color,
        badges: currentBadges,
        isCurrentVisit: true,
        topicLabel: formatPledgeTopicList(userData.pledgeTopics || (userData.pledgeTopic ? [userData.pledgeTopic] : [])) || 'Current feedback',
        pledgeSnippet: userData.pledgeSkipped ? 'Feedback-only visit.' : (userData.pledge || 'Feedback submitted.')
    };
    const backendCurrentIndex = backendVisits.findIndex(visit => currentBadges.some(badge => isCurrentPassportVisit(visit, data, badge)));
    const backendIncludesCurrent = backendCurrentIndex >= 0;
    const recentVisits = (backendIncludesCurrent
        ? backendVisits.map((visit, index) => index === backendCurrentIndex ? { ...visit, isCurrentVisit: true } : visit)
        : [currentVisit, ...backendVisits]
    ).slice(0, 5);
    const visibleBadges = backendBadges.length
        ? backendBadges.map((badge) => ({ ...badge }))
        : currentBadges.map((badge) => ({ ...badge }));

    if (!backendIncludesCurrent) {
        currentBadges.forEach((current) => {
            const matchingBadge = visibleBadges.find(badge => badge.key === current.key);
            if (matchingBadge && backendBadges.length) {
                matchingBadge.count = Number(matchingBadge.count || 0) + 1;
            } else if (!matchingBadge) {
                visibleBadges.unshift(current);
            }
        });
    }

    const backendVisitCount = Number(passport.visitCount || 0);
    const backendFeedbackCount = Number(passport.feedbackCount || 0);
    const visitCount = backendIncludesCurrent ? Math.max(backendVisitCount, 1) : Math.max(backendVisitCount + 1, 1);
    const feedbackCount = backendIncludesCurrent ? Math.max(backendFeedbackCount, 1) : Math.max(backendFeedbackCount + 1, 1);
    const stampCount = Array.isArray(passport.stamps) ? passport.stamps.length : 1;

    if (title) {
        const holder = passport.holderName || userData.name || 'Your';
        title.textContent = `${holder}'s ESG passport`;
    }

    summary.innerHTML = [
        ['Visits', visitCount || 1],
        ['Feedback stamps', feedbackCount || 1],
        ['Badges collected', visibleBadges.length],
        ['Milestones', Math.max(stampCount, 1)]
    ].map(([label, value]) => `
        <div class="passport-summary-item">
            <strong>${escapePassportHtml(value)}</strong>
            <span>${escapePassportHtml(label)}</span>
        </div>
    `).join('');

    badgeGrid.innerHTML = visibleBadges.map((badge) => `
        <article class="passport-badge-card" style="--passport-badge-color: ${escapePassportHtml(badge.color || currentBadge.color)};">
            <span class="passport-badge-seal"><i class="fa-solid fa-award"></i></span>
            <span>
                <strong>${escapePassportHtml(badge.name || currentBadge.name)}</strong>
                <small>${escapePassportHtml(Number(badge.count || 1))} stamp${Number(badge.count || 1) === 1 ? '' : 's'} collected</small>
            </span>
        </article>
    `).join('');

    recentList.innerHTML = recentVisits.map((visit, index) => `
        <article class="passport-visit-card">
            <span class="passport-visit-date">${visit.isCurrentVisit || index === 0 && !backendIncludesCurrent ? 'This visit' : escapePassportHtml(formatPassportDate(visit.createdAt))}</span>
            <span>
                <strong>${escapePassportHtml(visit.badgeName || currentBadge.name)}</strong>
                <small>${escapePassportHtml(visit.topicLabel || 'General ESG feedback')}</small>
                ${visit.pledgeSnippet ? `<small>${escapePassportHtml(visit.pledgeSnippet)}</small>` : ''}
            </span>
        </article>
    `).join('');

    history.hidden = false;
}

function refreshVisitorPassportHistory(data) {
    const email = (userData.email || '').trim();
    if (!email || !email.includes('@')) {
        renderVisitorPassportHistory(null, data);
        return;
    }

    window.setTimeout(async () => {
        try {
            const response = await fetch('/api/feedback/visitor-passport', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify({ email })
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Unable to load visitor passport');
            }
            renderVisitorPassportHistory(result.passport, data);
        } catch (error) {
            console.warn('Visitor passport history unavailable:', error);
        }
    }, 1800);
}

function setupJourneyPassport(data) {
    const passport = document.getElementById('journey-passport');
    if (!passport) return;

    const flags = getFeatureFlags();
    const badgeKey = getCelebrationBadgeKey(data);
    const reward = BADGE_LEAF_REWARDS[badgeKey] || BADGE_LEAF_REWARDS['feedback-completer'];
    const currentBadges = getCurrentPassportBadges(data);
    const currentBadgeNames = currentBadges.map(badge => badge.name).filter(Boolean).join(', ') || reward.badgeName;
    const photoStatus = getPassportPhotoStatus(data);
    const pledgeEnabled = flags.pledgeEnabled !== false;
    const pledgeMade = pledgeEnabled && !userData.pledgeSkipped && Boolean((userData.pledge || '').trim());
    const pledgeTitle = !pledgeEnabled
        ? 'Pledge step disabled'
        : pledgeMade
            ? 'Pledge made'
            : 'Pledge skipped';
    const pledgeDetail = !pledgeEnabled
        ? 'The admin setting has pledge collection turned off.'
        : pledgeMade
            ? (formatPledgeTopicList(userData.pledgeTopics || (userData.pledgeTopic ? [userData.pledgeTopic] : []))
                ? `Added under ${formatPledgeTopicList(userData.pledgeTopics || (userData.pledgeTopic ? [userData.pledgeTopic] : []))}.`
                : 'Your action joined the pledgeboard.')
            : 'You chose to finish with feedback only.';

    setPassportStamp(
        'passport-feedback-stamp',
        'complete',
        null,
        '',
        'passport-feedback-detail',
        `${Object.keys(userData.answers || {}).length} feedback ${Object.keys(userData.answers || {}).length === 1 ? 'answer' : 'answers'} recorded.`
    );

    setPassportStamp(
        'passport-pledge-stamp',
        pledgeMade ? 'complete' : 'optional',
        'passport-pledge-title',
        pledgeTitle,
        'passport-pledge-detail',
        pledgeDetail
    );

    setPassportStamp(
        'passport-badge-stamp',
        'complete',
        'passport-badge-title',
        currentBadges.length > 1 ? 'Badges earned' : 'Badge earned',
        'passport-badge-detail',
        `${currentBadgeNames} unlocked for this visit.`
    );

    setPassportStamp(
        'passport-tree-stamp',
        'complete',
        null,
        '',
        'passport-tree-detail',
        getPassportLeafMessage(reward.leaf)
    );

    setPassportStamp(
        'passport-photo-stamp',
        photoStatus.status,
        'passport-photo-title',
        photoStatus.title,
        'passport-photo-detail',
        photoStatus.detail
    );

    renderVisitorPassportHistory(null, data);
    refreshVisitorPassportHistory(data);

    passport.classList.remove('is-ready');
    window.setTimeout(() => {
        passport.classList.add('is-ready');
    }, 160);
}

function sharePledge(platform) {
    const text = getShareText();
    const encodedText = encodeURIComponent(text);
    let shareUrl = '';

    // Instagram share handling and share text fallback - done by XY
    if (platform === 'twitter') {
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    } else if (platform === 'whatsapp') {
        shareUrl = `https://wa.me/?text=${encodedText}`;
    } else if (platform === 'instagram') {
        if (navigator.share) {
            navigator.share({
                title: 'My RP ESG Pledge',
                text: text,
                url: window.location.href
            }).catch(() => {
                copyShareText();
                showShareStatus('Instagram share is available by copying text and pasting it into your Instagram story or post.');
            });
            return;
        }
        copyShareText();
        showShareStatus('Instagram cannot open directly. The share text has been copied so you can paste it into Instagram.');
        return;
    } else {
        return;
    }

    window.open(shareUrl, '_blank', 'noopener,noreferrer');
}

function showShareStatus(message) { // Inline social share notice instead of browser alert - changes made by nick
    const shareStatus = document.getElementById('thankyou-share-status');
    if (!shareStatus) return;
    shareStatus.textContent = message;
    shareStatus.style.display = 'block';
}

function copyShareText() {
    const text = getShareText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showShareStatus('Share text copied to clipboard. Paste it into any social app!');
        }).catch(() => {
            showShareStatus('Unable to copy automatically. Please use manual share.');
        });
    } else {
        showShareStatus('Clipboard not available. Please copy the text manually.');
    }
}

function setupSocialShare(data) {
    const shareSection = document.getElementById('thankyou-share-section');
    const shareStatus = document.getElementById('thankyou-share-status');
    if (!shareSection || !shareStatus) return;

    if (getFeatureFlags().socialSharingEnabled === false) {
        shareSection.style.display = 'none';
        return;
    }

    const emailStatusText = data?.emailQueued
        ? 'Your combined thank-you email is being queued and will be sent shortly. You can still share your pledge now.'
        : 'Share your pledge with others and help grow the sustainability movement.';

    shareStatus.textContent = emailStatusText;
    shareSection.style.display = 'block';
}

function isCelebrationDemoMode() {
    return new URLSearchParams(window.location.search).get('celebrationDemo') === '1';
}

function normalizeCelebrationDemoBadge(rawBadge) {
    const badgeKey = String(rawBadge || '').trim();
    return BADGE_LEAF_REWARDS[badgeKey] ? badgeKey : 'climate-champion';
}

function getCelebrationDemoTopic(badgeKey) {
    const topicByBadge = {
        'climate-champion': 'climate-change',
        'renewable-innovator': 'renewable-energy',
        'sustainable-living-advocate': 'sustainable-living',
        'ocean-guardian': 'ocean-conservation',
        'governance-guardian': 'ethical-governance',
        'social-champion': 'community-impact'
    };

    return topicByBadge[badgeKey] || '';
}

function stopCelebrationDemoTimers() {
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
    }
    if (idleWarningTimer) {
        clearTimeout(idleWarningTimer);
        idleWarningTimer = null;
    }
    if (idleWarningInterval) {
        clearInterval(idleWarningInterval);
        idleWarningInterval = null;
    }
    if (qrRefreshTimer) {
        clearInterval(qrRefreshTimer);
        qrRefreshTimer = null;
    }
    hideIdleWarning();
}

function showCelebrationDemoIfRequested() {
    if (!isCelebrationDemoMode()) return;

    const params = new URLSearchParams(window.location.search);
    const badgeKey = normalizeCelebrationDemoBadge(params.get('badge'));
    const pledgeTopic = getCelebrationDemoTopic(badgeKey);
    const isFeedbackOnly = badgeKey === 'feedback-completer';
    const submittedAt = new Date().toISOString();

    userData = {
        name: 'Demo Visitor',
        email: '',
        answers: {
            demoExperience: 5,
            demoLearning: 5,
            demoUsability: 4
        },
        pledgeSkipped: isFeedbackOnly,
        pledgeTopic,
        pledgeTopics: pledgeTopic ? [pledgeTopic] : [],
        pledge: isFeedbackOnly ? '' : 'I pledge to bring a reusable bottle for three school days this week.',
        submittedAt
    };

    const submissionData = {
        badgeKey,
        badgeKeys: [badgeKey],
        badgeName: (BADGE_LEAF_REWARDS[badgeKey] || BADGE_LEAF_REWARDS['feedback-completer']).badgeName,
        badgeColor: getCelebrationBadgeColor(badgeKey, null),
        badges: [{
            badgeKey,
            badgeName: (BADGE_LEAF_REWARDS[badgeKey] || BADGE_LEAF_REWARDS['feedback-completer']).badgeName,
            badgeColor: getCelebrationBadgeColor(badgeKey, null)
        }],
        emailQueued: false,
        submittedAt
    };

    stopCelebrationDemoTimers();
    document.body.classList.add('celebration-demo-mode');
    showFlowPage('thankyou-page');
    setupBadgeReward(submissionData);
    setupCelebrationMoment(submissionData);
    setupJourneyPassport(submissionData);
    setupSocialShare(submissionData);
}

// Reset everything and return to landing page for new submission
function submitAnother() {
    // Clear boomerang state before starting another submission - changes made by nick
    stopBoomerangPreview();
    // Stop camera stream if still active
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }

    // Reset all data
    selectedRetention = LONG_TERM_RETENTION;
    selectedTheme = 'nature';
    userData = {};
    photoData = null;
    captureMode = 'photo';
    boomerangFrames = [];
    clearRestorableBoomerang();
    selectedFaceAccessory = 'none'; // Reset face filter between visitors (DONE BY NICK)
    userData.selectedFaceAccessory = 'none'; // Reset filter analytics state (DONE BY NICK)
    updateCaptureModeButtons();
    updateFaceAccessoryButtons();
    setupKeepsakeDownload({}); // Clear previous visitor download state (DONE BY NICK)

    // Reset forms
    document.querySelectorAll('form').forEach(form => form.reset());
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    const proceedBtn = document.getElementById('proceedBtn');
    if (proceedBtn) proceedBtn.disabled = true;
    document.getElementById('char-count').textContent = '0';
    clearValidationMessages();

    // Go back to landing page
    showLandingPages();

    // Restart inactivity timer
    startInactivityTimer();
}


// ==================== 9. BACK NAVIGATION FUNCTIONS ====================

// From Consent to Landing
function goBackToLanding() {
    showLandingPages();
    resetInactivityTimer();
}

// From Details to Consent
function goBackToConsent() {
    selectedRetention = LONG_TERM_RETENTION;
    showLandingPages();
    resetInactivityTimer();
}

// From Feedback to Details
function goBackToDetails() {
    showFlowPage('details-page');
    resetInactivityTimer();
}

// Home button reset from feedback form done by nick
function goHomeFromFeedbackForm() {
    // Clear boomerang state when returning home - changes made by nick
    stopBoomerangPreview();
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }

    selectedRetention = LONG_TERM_RETENTION;
    selectedTheme = 'nature';
    userData = {};
    photoData = null;
    captureMode = 'photo';
    boomerangFrames = [];
    clearRestorableBoomerang();
    selectedFaceAccessory = 'none'; // Reset face filter when returning home (DONE BY NICK)
    userData.selectedFaceAccessory = 'none'; // Reset filter analytics state (DONE BY NICK)
    updateCaptureModeButtons();
    updateFaceAccessoryButtons();
    setupKeepsakeDownload({}); // Clear previous visitor download state (DONE BY NICK)

    document.querySelectorAll('form').forEach(form => form.reset());
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));

    const proceedBtn = document.getElementById('proceedBtn');
    if (proceedBtn) proceedBtn.disabled = true;

    const charCount = document.getElementById('char-count');
    if (charCount) charCount.textContent = '0';

    clearValidationMessages();
    showLandingPages();
    resetInactivityTimer();
}

// From Pledge to Feedback
function goBackToFeedback() {
    showFlowPage('feedback-page');
    resetInactivityTimer();
}

// From Photo/Upload to Pledge
function goBackToPledge() {
    // Stop boomerang preview when leaving photo flow - changes made by nick
    stopBoomerangPreview();

    // Stop camera stream if active (for desktop)
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }

    showFlowPage('pledge-page');

    resetInactivityTimer();
}

// // From Style to Photo/Upload
// function goBackToPhoto() {
//     // Hide style page
//     document.getElementById('style-page').style.display = 'none';

//     // Show appropriate photo page based on device
//     if (currentDevice === 'mobile') {
//         document.getElementById('file-upload-page').style.display = 'flex';
//     } else {
//         document.getElementById('photo-page').style.display = 'flex';
//         // Reinitialize camera for desktop
//         initializeCamera();
//     }

//     resetInactivityTimer();
// }


// ==================== 10. EVENT LISTENERS & CLEANUP ====================

// Clean up camera when leaving page
window.addEventListener('beforeunload', () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
    }
    if (idleWarningTimer) {
        clearTimeout(idleWarningTimer);
    }
    if (idleWarningInterval) {
        clearInterval(idleWarningInterval);
    }
});

// Add event listeners for user interactions to reset timer
document.addEventListener('click', resetInactivityTimer);
document.addEventListener('keypress', resetInactivityTimer);
document.addEventListener('mousemove', resetInactivityTimer);
document.addEventListener('touchstart', resetInactivityTimer);

// ==================== 11. PLEDGEBOARD NAVIGATION ====================

// Navigate to PLEDGEBOARD page
function viewPledgeboard() {
    window.location.href = '/pledgeboard';
}

// ==================== FORM UI CONFIGURATION ====================
// Load and apply form UI settings from server config

async function applyFormUIConfig() {
    try {
        const response = await fetch('/api/feedback/form-ui');
        const config = await response.json();

        // Apply background (CSS variable)
        if (config.background) {
            document.documentElement.style.setProperty('--form-bg', config.background);
        }

        // Apply landing page title
        if (config.landingTitle) {
            setText('form-landing-title', config.landingTitle);
        }

        // Apply landing page subtitle
        if (config.landingSubtitle) {
            setText('form-landing-subtitle', config.landingSubtitle);
        }

        const qrEnabled = Boolean(config.showLandingPageQRCode);
        const qrPage = document.getElementById('land-page-qrcode');
        const noQrPage = document.getElementById('land-page-no-qrcode');

        if (qrPage) {
            qrPage.style.display = qrEnabled ? 'block' : 'none';
        }

        if (noQrPage) {
            noQrPage.style.display = qrEnabled ? 'none' : 'block';
        }
    } catch (error) {
        console.error('Error applying form UI configuration:', error);
    }
}

async function loadKioskParameters() {
    try {
        const response = await fetch('/api/parameters');
        const data = await response.json();
        if (!response.ok || !data.success) return;

        kioskParameters = data.parameters || {};
        applyParameterOverrides();
    } catch (error) {
        console.warn('Parameter config unavailable:', error);
    }
}

function getTemporaryRetentionDays() {
    const days = Number(kioskParameters.contentSettings?.temporaryRetentionDays);
    return Number.isFinite(days) && days > 0 ? Math.round(days) : 7;
}

function formatRetentionDays(days) {
    return `${days} ${days === 1 ? 'Day' : 'Days'}`;
}

function getTemporaryRetentionLabel() {
    return formatRetentionDays(getTemporaryRetentionDays());
}

function clampLayoutNumber(value, min, max, fallback) {
    const number = Number(value);
    const safeNumber = Number.isFinite(number) ? number : fallback;
    return Math.min(max, Math.max(min, safeNumber));
}

function applyLandingLayoutSettings(layout = {}) {
    const root = document.documentElement;
    const textScale = clampLayoutNumber(layout.landingTextScale, 0.75, 1.4, 1);
    const panelWidth = clampLayoutNumber(layout.landingPanelWidth, 360, 1000, 600);
    const panelMinHeight = clampLayoutNumber(layout.landingPanelMinHeight, 0, 900, 0);
    const panelPadding = clampLayoutNumber(layout.landingPanelPadding, 20, 120, 60);
    const panelX = clampLayoutNumber(layout.landingPanelOffsetX, -360, 360, 0);
    const panelY = clampLayoutNumber(layout.landingPanelOffsetY, -220, 220, 0);
    const buttonX = clampLayoutNumber(layout.startButtonOffsetX, -220, 220, 0);
    const buttonY = clampLayoutNumber(layout.startButtonOffsetY, -160, 160, 0);
    const buttonWidth = clampLayoutNumber(layout.startButtonWidth, 180, 600, 280);
    const buttonHeight = clampLayoutNumber(layout.startButtonHeight, 44, 120, 64);
    const pledgeButtonX = clampLayoutNumber(layout.pledgeboardButtonOffsetX, -220, 220, 0);
    const pledgeButtonY = clampLayoutNumber(layout.pledgeboardButtonOffsetY, -160, 160, 0);
    const pledgeButtonWidth = clampLayoutNumber(layout.pledgeboardButtonWidth, 180, 900, 600);
    const pledgeButtonHeight = clampLayoutNumber(layout.pledgeboardButtonHeight, 44, 140, 64);

    root.style.setProperty('--landing-text-scale', textScale);
    root.style.setProperty('--landing-title-size', `${Math.round(48 * textScale)}px`);
    root.style.setProperty('--landing-mobile-title-size', `${Math.round(28 * textScale)}px`);
    root.style.setProperty('--landing-subtitle-size', `${Math.round(18 * textScale)}px`);
    root.style.setProperty('--landing-brand-size', `${Math.round(16 * textScale)}px`);
    root.style.setProperty('--landing-control-size', `${Math.round(14 * textScale)}px`);
    root.style.setProperty('--landing-button-size', `${Math.round(16 * textScale)}px`);
    root.style.setProperty('--landing-panel-width', `${panelWidth}px`);
    root.style.setProperty('--landing-panel-min-height', `${panelMinHeight}px`);
    root.style.setProperty('--landing-panel-padding', `${panelPadding}px`);
    root.style.setProperty('--landing-panel-x', `${panelX}px`);
    root.style.setProperty('--landing-panel-y', `${panelY}px`);
    root.style.setProperty('--landing-panel-mobile-x', `${Math.round(panelX * 0.45)}px`);
    root.style.setProperty('--landing-panel-mobile-y', `${Math.round(panelY * 0.45)}px`);
    root.style.setProperty('--start-button-x', `${buttonX}px`);
    root.style.setProperty('--start-button-y', `${buttonY}px`);
    root.style.setProperty('--start-button-width', `${buttonWidth}px`);
    root.style.setProperty('--start-button-height', `${buttonHeight}px`);
    root.style.setProperty('--start-button-mobile-width', `${Math.round(buttonWidth * 0.75)}px`);
    root.style.setProperty('--start-button-mobile-height', `${Math.round(buttonHeight * 0.85)}px`);
    root.style.setProperty('--pledgeboard-button-x', `${pledgeButtonX}px`);
    root.style.setProperty('--pledgeboard-button-y', `${pledgeButtonY}px`);
    root.style.setProperty('--pledgeboard-button-width', `${pledgeButtonWidth}px`);
    root.style.setProperty('--pledgeboard-button-height', `${pledgeButtonHeight}px`);
    root.style.setProperty('--pledgeboard-button-mobile-width', `${Math.round(pledgeButtonWidth * 0.75)}px`);
    root.style.setProperty('--pledgeboard-button-mobile-height', `${Math.round(pledgeButtonHeight * 0.85)}px`);
}

function normalizeStyleHexColor(value, fallback = '#4a7c59') {
    const color = String(value || '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}

function shadeHexColor(hex, amount) {
    const safeHex = normalizeStyleHexColor(hex);
    const raw = safeHex.slice(1);
    const channels = [0, 2, 4].map((offset) => {
        const value = parseInt(raw.slice(offset, offset + 2), 16);
        return Math.max(0, Math.min(255, value + amount));
    });
    return `#${channels.map(value => value.toString(16).padStart(2, '0')).join('')}`;
}

function applyParameterOverrides() {
    const messages = kioskParameters.feedbackMessages || {};
    const content = kioskParameters.contentSettings || {};
    const campaign = kioskParameters.campaignSettings || {};
    const feedbackStyle = kioskParameters.feedbackPageStyle || {};
    const assets = kioskParameters.visualAssets || {};
    const layout = kioskParameters.layoutSettings || {};
    const photo = kioskParameters.photoSettings || {};
    const badgeLeafStyles = getConfiguredBadgeLeafStyles();
    const flags = getFeatureFlags();
    const rules = getValidationRules();
    const retentionDays = getTemporaryRetentionDays();
    const retentionLabel = formatRetentionDays(retentionDays);

    applyLandingLayoutSettings(layout);

    const feedbackBackground = feedbackStyle.backgroundCss || assets.feedbackBackground;
    if (feedbackBackground) {
        document.documentElement.style.setProperty('--form-bg', feedbackBackground);
    }
    const cardOpacity = Math.min(1, Math.max(0.55, Number(feedbackStyle.cardOpacity) || 0.9));
    const accentColor = normalizeStyleHexColor(feedbackStyle.accentColor, '#4a7c59');
    document.documentElement.style.setProperty('--feedback-card-opacity', cardOpacity.toFixed(2));
    document.documentElement.style.setProperty('--feedback-accent-color', accentColor);
    document.documentElement.style.setProperty('--feedback-accent-dark', shadeHexColor(accentColor, -36));
    document.documentElement.style.setProperty('--celebration-leaf-scale', badgeLeafStyles.leafScale);

    const pledgePage = document.getElementById('pledge-page');
    if (pledgePage) pledgePage.dataset.featureEnabled = String(flags.pledgeEnabled !== false);

    const photoPage = document.getElementById('photo-page');
    if (photoPage) photoPage.dataset.featureEnabled = String(flags.cameraCaptureEnabled !== false);

    const uploadPage = document.getElementById('file-upload-page');
    if (uploadPage) uploadPage.dataset.featureEnabled = String(flags.photoUploadEnabled !== false);

    const floatingLanguageSelector = document.querySelector('.floating-language-selector');
    if (floatingLanguageSelector) {
        floatingLanguageSelector.hidden = flags.floatingLanguageSelectorEnabled !== true;
    }

    const photoInput = document.getElementById('photo-input');
    if (photoInput && Array.isArray(rules.allowedPhotoFormats)) {
        photoInput.accept = rules.allowedPhotoFormats.map(format => `image/${format === 'jpg' ? 'jpeg' : format}`).join(',');
    }

    const beautyFilterPanels = document.querySelectorAll('#beauty-filter-setting-panel, #upload-beauty-filter-setting-panel');
    const beautyFeatureEnabled = flags.beautyFilterEnabled !== false && photo.beautyFilterEnabled !== false;
    beautyFilterPanels.forEach((panel) => {
        panel.hidden = !beautyFeatureEnabled;
    });
    if (!beautyFeatureEnabled) {
        setBeautyFilterSetting('off');
    } else if (photo.beautyFilterStrength && BEAUTY_FILTER_PRESETS[photo.beautyFilterStrength]) {
        setBeautyFilterSetting(photo.beautyFilterStrength);
    } else {
        updateBeautyFilterSettings();
    }

    if (currentLanguage === 'en') {
        setText('consent-description', messages.consentPrompt);
        setText('option-7days-title', retentionLabel);
        setText('option-7days-description', `Your feedback data will be deleted after ${retentionDays} ${retentionDays === 1 ? 'day' : 'days'}.`);
        setText('privacy-notice-text', `${retentionLabel} Retention: Your photo and email is retained for ${retentionDays} ${retentionDays === 1 ? 'day' : 'days'} then deleted. Your name and pledge may be displayed publicly.`);
        setText('details-description', messages.detailsPrompt);
        setText('feedback-description', messages.feedbackPrompt);
        setText('pledge-description', messages.pledgePrompt);
        if (campaign.enabled === true && campaign.title) {
            setText('pledge-examples-header', `${campaign.title}: Smart Pledge Coach`);
        }
        setText('thankyou-title', messages.thankYouTitle);
        setText('thankyou-message', messages.thankYouMessage || messages.thankYouSubtitle);
        setText('thankyou-footer-text', messages.thankYouFooter);
    }
}

function getFeatureFlags() {
    // Feature toggles loaded from admin-controlled parameter config (DONE BY CAEDEN)
    return {
        cameraCaptureEnabled: true,
        photoUploadEnabled: true,
        beautyFilterEnabled: true,
        pledgeEnabled: true,
        badgeEmailEnabled: true,
        thankYouEmailEnabled: true,
        socialSharingEnabled: true,
        floatingLanguageSelectorEnabled: false,
        ...(kioskParameters.featureFlags || {})
    };
}

function getValidationRules() {
    // Centralized validation rules loaded from admin-controlled parameter config (DONE BY CAEDEN)
    return {
        nameRequired: true,
        nameMinLength: 2,
        nameMaxLength: 80,
        emailRequired: true,
        emailPattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
        requiredQuestionsEnabled: true,
        pledgeRequired: true,
        pledgeMinLength: 5,
        pledgeMaxLength: 500,
        pledgeTopicRequired: true,
        photoRequired: true,
        dailySubmissionLimitPerEmail: 1,
        maxPhotoFileSizeMb: 5,
        allowedPhotoFormats: ['jpeg', 'jpg', 'png', 'webp'],
        ...(kioskParameters.validationRules || {})
    };
}

function matchesConfiguredPattern(value, pattern) {
    try {
        return new RegExp(pattern).test(value);
    } catch (error) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }
}

// Load countdown timer setting from server (DONE BY BERNISSA)
async function loadCountdownTimer() {
    try {
        console.log('Loading countdown timer setting...');
        const response = await fetch('/api/feedback/countdown-timer');
        const data = await response.json();

        if (data.success && typeof data.countdown_seconds === 'number') {
            countdownSeconds = data.countdown_seconds >= 0 ? data.countdown_seconds : 3;
            console.log(`Countdown timer loaded: ${countdownSeconds} seconds`);
        } else {
            console.warn('Invalid countdown data, using default');
            countdownSeconds = 3;
        }
    } catch (error) {
        console.error('Error loading countdown timer:', error);
        countdownSeconds = 3; // Fallback to default 3 seconds
    }
}

// ==================== MULTI-LANGUAGE SUPPORT ==================== done by Caeden

const translations = {
    en: {
        brandText: "ESG Feedback Portal",
        landingTitle: "Let's turn your ideas into reality",
        landingSubtitle: "Share your thoughts and help us improve our services. Your feedback matters.",
        startButton: "Start Feedback Form",
        pledgeboardButton: "📜 View Pledgeboards",
        qrHeader: "Scan for Mobile Feedback",
        qrDescription: "Point your mobile camera here to open the feedback form on your phone",

        consentTitle: "Quick Consent",
        consentDescription: "Pick how long we should keep your submission.",
        option7DaysTitle: "7 Days",
        option7DaysDescription: "Your feedback data will be deleted after 7 days.",
        optionLongTermTitle: "Long-Term",
        optionLongTermDescription: "Keep my data long-term for extended impact tracking",
        privacyNotice: "7 day Retention: Your photo and email is retained for 7 days then deleted. Your name and pledge may be displayed publicly.",
        continueFeedbackForm: "Continue to Feedback Form",

        detailsTitle: "Tell Us Who You Are",
        detailsDescription: "Just the essentials so we can send your photo.",
        nameLabel: "Name",
        emailLabel: "Email Address",
        namePlaceholder: "Enter your name",
        emailPlaceholder: "Enter your email",
        continueToFeedback: "Continue to Feedback",
        back: "Back",
        home: "Home", // Home button translation done by nick

        feedbackTitle: "Share Your Feedback",
        feedbackDescription: "A few quick taps. Honest answers are perfect.",
        continueToPledge: "Continue to Pledge",

        pledgeTitle: "Make Your Pledge",
        pledgeDescription: "Choose one action you can try after today.",
        pledgeExamplesHeader: "Smart Pledge Coach",
        pledgeExample1: "Carry a reusable bottle and cutlery every day",
        pledgeExample2: "Sort waste properly and recycle whenever possible",
        pledgeExample3: "Reduce food waste by taking only what I can finish",
        pledgeLabel: "Your Pledge",
        pledgeTopicLabel: "Choose your sustainability focus",
        pledgePlaceholder: "I pledge to...",
        charactersText: "500 characters",
        pledgePrivacy: "Your pledge will be displayed on our pledgeboard, inspiring others to take action",
        skipPledge: "I do not want to make a pledge",
        continueToPhoto: "Continue to Photo",
        photoChoiceTitle: "Would you like to take a photo?",
        photoChoiceDescription: "You can take a keepsake photo, or skip it and submit your feedback now.",
        takePhotoChoice: "Take Photo",
        skipPhotoChoice: "Skip Photo",

        photoTitle: "Capture Your Photo",
        photoDescription: "Your photo will sent to you through email",
        capturePhoto: "Capture Photo",

        uploadTitle: "Upload Your Photo",
        uploadDescription: "Please take a photo using your camera and upload it",
        uploadStep1: "Tap the button below to open your camera",
        uploadStep2: "Take a clear photo of yourself",
        uploadStep3: "Tap \"Use Photo\" to upload",
        uploadCamera: "Tap to Open Camera",
        uploadHint: "Your photo will be part of our community tree",
        continueToStyle: "Continue to Style Selection",
        retakeUpload: "Retake/Upload New Photo",

        styleTitle: "Choose Your Style",
        styleDescription: "Select your preferred overlay style for your RP memory photo!",
        availableOverlays: "Available Overlays",
        selectedLabel: "Selected:",
        useStyleContinue: "Use This Photo & Style & Continue",
        retakePhoto: "Retake Photo",

        confirmationTitle: "Confirm Submission",
        confirmationDescription: "Please review your information before submitting:",
        confirmName: "Name:",
        confirmEmail: "Email:",
        confirmQuestions: "Questions Answered:",
        confirmTheme: "Theme:",
        confirmRetention: "Data Retention:",
        confirmPledge: "Pledge:",
        confirmPhoto: "Photo:",
        confirmPhotoReady: "✅ Ready to be uploaded",
        confirmEmailPhoto: "Email Photo:",
        confirmEmailPhotoReady: "✅ Will be sent to your email",
        confirmPrimaryConsent: "Primary Consent:",
        confirmPrimaryConsentReady: "✅ Given",
        confirmationNote: "💡 You can go back to change the theme if needed",
        submitFeedback: "Submit Feedback",

        thankYouTitle: "Thank You! ☀️",
        thankYouMessage: "Your feedback has been recorded and a new leaf has been added to our digital tree!",
        emailSentTitle: "Your RP memory photo has been sent to your email!",
        emailSentDescription: "Please check your inbox within the next minute",
        thankYouFooter: "Thank you for contributing to our sustainability journey at Republic Polytechnic!",
        submitAnother: "Submit Another Feedback"
    },

    ms: {
        brandText: "Portal Maklum Balas Komuniti",
        landingTitle: "Mari jadikan idea anda satu kenyataan",
        landingSubtitle: "Kongsikan pandangan anda dan bantu kami menambah baik perkhidmatan kami. Maklum balas anda penting.",
        startButton: "Mula Borang Maklum Balas",
        pledgeboardButton: "📜 Lihat Papan Ikrar",
        qrHeader: "Imbas untuk Maklum Balas Mudah Alih",
        qrDescription: "Halakan kamera telefon anda di sini untuk membuka borang maklum balas pada telefon anda",

        consentTitle: "Persetujuan Penyimpanan Data",
        consentDescription: "Sebelum bermula, sila pilih tempoh masa anda mahu kami menyimpan data maklum balas anda",
        option7DaysTitle: "7 Hari",
        option7DaysDescription: "Data maklum balas anda akan dipadam selepas 7 hari.",
        optionLongTermTitle: "Jangka Panjang",
        optionLongTermDescription: "Simpan data saya untuk jangka panjang bagi penjejakan impak yang berterusan",
        privacyNotice: "Penyimpanan 7 hari: Foto dan e-mel anda disimpan selama 7 hari sebelum dipadam. Nama dan ikrar anda mungkin dipaparkan kepada umum.",
        continueFeedbackForm: "Teruskan ke Borang Maklum Balas",

        detailsTitle: "Butiran Anda",
        detailsDescription: "Sila masukkan nama dan e-mel anda untuk meneruskan",
        nameLabel: "Nama",
        emailLabel: "Alamat E-mel",
        namePlaceholder: "Masukkan nama anda",
        emailPlaceholder: "Masukkan e-mel anda",
        continueToFeedback: "Teruskan ke Maklum Balas",
        back: "Kembali",
        home: "Home", // Home button translation done by nick

        feedbackTitle: "Kongsi Maklum Balas Anda",
        feedbackDescription: "Pandangan anda membantu kami menambah baik dan melayani anda dengan lebih baik",
        continueToPledge: "Teruskan ke Ikrar",

        pledgeTitle: "Buat Ikrar Anda",
        pledgeDescription: "Kongsikan komitmen anda untuk memberi kesan positif",
        pledgeExamplesHeader: "Smart Pledge Coach",
        pledgeExample1: "Bawa botol dan sudu garpu guna semula setiap hari",
        pledgeExample2: "Asingkan sisa dengan betul dan kitar semula apabila boleh",
        pledgeExample3: "Kurangkan pembaziran makanan dengan mengambil hanya apa yang saya boleh habiskan",
        pledgeLabel: "Ikrar Anda",
        pledgePlaceholder: "Saya berikrar untuk...",
        charactersText: "500 aksara",
        pledgePrivacy: "Ikrar anda akan dipaparkan pada papan ikrar kami untuk memberi inspirasi kepada orang lain",
        skipPledge: "Saya tidak mahu membuat ikrar",
        continueToPhoto: "Teruskan ke Foto",

        photoTitle: "Ambil Foto Anda",
        photoDescription: "Foto anda akan dihantar kepada anda melalui e-mel",
        capturePhoto: "Ambil Foto",

        uploadTitle: "Muat Naik Foto Anda",
        uploadDescription: "Sila ambil foto menggunakan kamera anda dan muat naik",
        uploadStep1: "Tekan butang di bawah untuk membuka kamera anda",
        uploadStep2: "Ambil foto diri anda dengan jelas",
        uploadStep3: "Tekan \"Gunakan Foto\" untuk memuat naik",
        uploadCamera: "Tekan untuk Buka Kamera",
        uploadHint: "Foto anda akan menjadi sebahagian daripada pokok komuniti kami",
        continueToStyle: "Teruskan ke Pemilihan Gaya",
        retakeUpload: "Ambil Semula/Muat Naik Foto Baharu",

        styleTitle: "Pilih Gaya Anda",
        styleDescription: "Pilih gaya lapisan pilihan anda untuk foto memori RP anda!",
        availableOverlays: "Lapisan Tersedia",
        selectedLabel: "Dipilih:",
        useStyleContinue: "Gunakan Foto & Gaya Ini dan Teruskan",
        retakePhoto: "Ambil Semula Foto",

        confirmationTitle: "Sahkan Penghantaran",
        confirmationDescription: "Sila semak maklumat anda sebelum menghantar:",
        confirmName: "Nama:",
        confirmEmail: "E-mel:",
        confirmQuestions: "Soalan Dijawab:",
        confirmTheme: "Tema:",
        confirmRetention: "Penyimpanan Data:",
        confirmPledge: "Ikrar:",
        confirmPhoto: "Foto:",
        confirmPhotoReady: "✅ Sedia untuk dimuat naik",
        confirmEmailPhoto: "Foto E-mel:",
        confirmEmailPhotoReady: "✅ Akan dihantar ke e-mel anda",
        confirmPrimaryConsent: "Persetujuan Utama:",
        confirmPrimaryConsentReady: "✅ Diberikan",
        confirmationNote: "💡 Anda boleh kembali untuk menukar tema jika perlu",
        submitFeedback: "Hantar Maklum Balas",

        thankYouTitle: "Terima Kasih! ☀️",
        thankYouMessage: "Maklum balas anda telah direkodkan dan daun baharu telah ditambah pada pokok digital kami!",
        emailSentTitle: "Foto memori RP anda telah dihantar ke e-mel anda!",
        emailSentDescription: "Sila semak peti masuk anda dalam masa seminit",
        thankYouFooter: "Terima kasih kerana menyumbang kepada perjalanan kelestarian kami di Republic Polytechnic!",
        submitAnother: "Hantar Maklum Balas Lagi"
    },

    zh: {
        brandText: "社区反馈平台",
        landingTitle: "让您的想法成为现实",
        landingSubtitle: "分享您的想法，帮助我们改进服务。您的反馈很重要。",
        startButton: "开始反馈表",
        pledgeboardButton: "📜 查看承诺板",
        qrHeader: "扫描以使用手机反馈",
        qrDescription: "请将手机相机对准此处以在手机上打开反馈表",

        consentTitle: "数据保留同意",
        consentDescription: "在开始之前，请选择您希望我们保留您的反馈数据多长时间",
        option7DaysTitle: "7天",
        option7DaysDescription: "您的反馈数据将在7天后删除。",
        optionLongTermTitle: "长期",
        optionLongTermDescription: "长期保留我的数据以进行持续影响追踪",
        privacyNotice: "7天保留：您的照片和电子邮件将保留7天后删除。您的姓名和承诺可能会公开显示。",
        continueFeedbackForm: "继续到反馈表",

        detailsTitle: "您的资料",
        detailsDescription: "请输入您的姓名和电子邮件以继续",
        nameLabel: "姓名",
        emailLabel: "电子邮件地址",
        namePlaceholder: "请输入您的姓名",
        emailPlaceholder: "请输入您的电子邮件",
        continueToFeedback: "继续反馈",
        back: "返回",
        home: "Home", // Home button translation done by nick

        feedbackTitle: "分享您的反馈",
        feedbackDescription: "您的意见帮助我们改进并更好地为您服务",
        continueToPledge: "继续承诺",

        pledgeTitle: "作出您的承诺",
        pledgeDescription: "分享您为带来积极影响所作的承诺",
        pledgeExamplesHeader: "Smart Pledge Coach",
        pledgeExample1: "每天携带可重复使用的水瓶和餐具",
        pledgeExample2: "正确分类垃圾并尽可能回收",
        pledgeExample3: "只拿自己能吃完的食物以减少浪费",
        pledgeLabel: "您的承诺",
        pledgePlaceholder: "我承诺……",
        charactersText: "500个字符",
        pledgePrivacy: "您的承诺将显示在我们的承诺板上，激励其他人采取行动",
        skipPledge: "我不想作出承诺",
        continueToPhoto: "继续到照片",

        photoTitle: "拍摄您的照片",
        photoDescription: "您的照片将通过电子邮件发送给您",
        capturePhoto: "拍摄照片",

        uploadTitle: "上传您的照片",
        uploadDescription: "请使用相机拍照并上传",
        uploadStep1: "点击下方按钮打开相机",
        uploadStep2: "清楚地拍摄您自己的照片",
        uploadStep3: "点击“使用照片”以上传",
        uploadCamera: "点击打开相机",
        uploadHint: "您的照片将成为我们社区树的一部分",
        continueToStyle: "继续选择样式",
        retakeUpload: "重新拍摄/上传新照片",

        styleTitle: "选择您的样式",
        styleDescription: "为您的RP回忆照片选择您喜欢的叠加样式！",
        availableOverlays: "可用叠加层",
        selectedLabel: "已选择：",
        useStyleContinue: "使用此照片和样式并继续",
        retakePhoto: "重新拍摄照片",

        confirmationTitle: "确认提交",
        confirmationDescription: "提交前请检查您的信息：",
        confirmName: "姓名：",
        confirmEmail: "电子邮件：",
        confirmQuestions: "已回答问题：",
        confirmTheme: "主题：",
        confirmRetention: "数据保留：",
        confirmPledge: "承诺：",
        confirmPhoto: "照片：",
        confirmPhotoReady: "✅ 准备上传",
        confirmEmailPhoto: "邮件照片：",
        confirmEmailPhotoReady: "✅ 将发送到您的电子邮件",
        confirmPrimaryConsent: "主要同意：",
        confirmPrimaryConsentReady: "✅ 已给予",
        confirmationNote: "💡 如有需要，您可以返回更改主题",
        submitFeedback: "提交反馈",

        thankYouTitle: "谢谢您！☀️",
        thankYouMessage: "您的反馈已被记录，我们的数字树上新增了一片叶子！",
        emailSentTitle: "您的RP回忆照片已发送到您的电子邮件！",
        emailSentDescription: "请在一分钟内检查您的收件箱",
        thankYouFooter: "感谢您为Republic Polytechnic的可持续发展之旅作出贡献！",
        submitAnother: "再次提交反馈"
    },

    ta: {
        brandText: "சமூக கருத்து தளம்",
        landingTitle: "உங்கள் எண்ணங்களை நனவாக்கலாம்",
        landingSubtitle: "உங்கள் கருத்துகளை பகிர்ந்து எங்கள் சேவைகளை மேம்படுத்த உதவுங்கள். உங்கள் பின்னூட்டம் முக்கியமானது.",
        startButton: "பின்னூட்டப் படிவத்தை தொடங்கு",
        pledgeboardButton: "📜 உறுதிமொழி பலகையை காண்க",
        qrHeader: "மொபைல் பின்னூட்டத்திற்காக ஸ்கேன் செய்யவும்",
        qrDescription: "உங்கள் தொலைபேசியில் பின்னூட்டப் படிவத்தைத் திறக்க உங்கள் கேமராவை இங்கு நோக்குங்கள்",

        consentTitle: "தரவு சேமிப்பு ஒப்புதல்",
        consentDescription: "தொடங்குவதற்கு முன், உங்கள் பின்னூட்டத் தரவை எவ்வளவு காலம் வைத்திருக்க விரும்புகிறீர்கள் என்பதைத் தேர்ந்தெடுக்கவும்",
        option7DaysTitle: "7 நாட்கள்",
        option7DaysDescription: "உங்கள் பின்னூட்டத் தரவு 7 நாட்களுக்கு பிறகு நீக்கப்படும்.",
        optionLongTermTitle: "நீண்ட காலம்",
        optionLongTermDescription: "தொடர்ந்த தாக்கத்தை கண்காணிக்க எனது தரவை நீண்ட காலம் வைத்திருக்கவும்",
        privacyNotice: "7 நாள் சேமிப்பு: உங்கள் புகைப்படமும் மின்னஞ்சலும் 7 நாட்கள் வைத்திருந்து பின்னர் நீக்கப்படும். உங்கள் பெயரும் உறுதிமொழியும் பொதுவாக காட்டப்படலாம்.",
        continueFeedbackForm: "பின்னூட்டப் படிவத்திற்கு தொடர்க",

        detailsTitle: "உங்கள் விவரங்கள்",
        detailsDescription: "தொடர உங்கள் பெயர் மற்றும் மின்னஞ்சலை வழங்கவும்",
        nameLabel: "பெயர்",
        emailLabel: "மின்னஞ்சல் முகவரி",
        namePlaceholder: "உங்கள் பெயரை உள்ளிடவும்",
        emailPlaceholder: "உங்கள் மின்னஞ்சலை உள்ளிடவும்",
        continueToFeedback: "பின்னூட்டத்திற்கு தொடர்க",
        back: "பின்",
        home: "Home", // Home button translation done by nick

        feedbackTitle: "உங்கள் பின்னூட்டத்தை பகிரவும்",
        feedbackDescription: "உங்கள் கருத்துக்கள் எங்களை மேம்படுத்தவும் உங்களுக்கு சிறப்பாக சேவை செய்யவும் உதவுகின்றன",
        continueToPledge: "உறுதிமொழிக்கு தொடர்க",

        pledgeTitle: "உங்கள் உறுதிமொழியை வழங்கவும்",
        pledgeDescription: "நல்ல மாற்றத்தை உருவாக்கும் உங்கள் உறுதிப்பாட்டைப் பகிரவும்",
        pledgeExamplesHeader: "Smart Pledge Coach",
        pledgeExample1: "ஒவ்வொரு நாளும் மறுபயன்பாட்டு தண்ணீர் பாட்டிலும் உபகரணங்களும் எடுத்துச் செல்லுங்கள்",
        pledgeExample2: "கழிவுகளை சரியாக பிரித்து இயன்றபோது மறுசுழற்சி செய்யுங்கள்",
        pledgeExample3: "நான் முடிக்க முடியும் அளவிற்கு மட்டுமே உணவை எடுத்து உணவு வீணாவதை குறைப்பேன்",
        pledgeLabel: "உங்கள் உறுதிமொழி",
        pledgePlaceholder: "நான் உறுதிமொழி எடுக்கிறேன்...",
        charactersText: "500 எழுத்துகள்",
        pledgePrivacy: "உங்கள் உறுதிமொழி எங்கள் உறுதிமொழி பலகையில் காட்டப்படும், இது பிறரையும் செயல்பட தூண்டும்",
        skipPledge: "நான் உறுதிமொழி வழங்க விரும்பவில்லை",
        continueToPhoto: "புகைப்படத்திற்கு தொடர்க",

        photoTitle: "உங்கள் புகைப்படத்தை எடுக்கவும்",
        photoDescription: "உங்கள் புகைப்படம் மின்னஞ்சல் மூலம் உங்களுக்கு அனுப்பப்படும்",
        capturePhoto: "புகைப்படம் எடு",

        uploadTitle: "உங்கள் புகைப்படத்தை பதிவேற்றவும்",
        uploadDescription: "தயவுசெய்து உங்கள் கேமராவைப் பயன்படுத்தி ஒரு புகைப்படம் எடுத்து பதிவேற்றவும்",
        uploadStep1: "உங்கள் கேமராவைத் திறக்க கீழே உள்ள பொத்தானை அழுத்தவும்",
        uploadStep2: "உங்கள் தெளிவான புகைப்படத்தை எடுக்கவும்",
        uploadStep3: "\"Use Photo\" என்பதை அழுத்தி பதிவேற்றவும்",
        uploadCamera: "கேமராவைத் திறக்கத் தட்டவும்",
        uploadHint: "உங்கள் புகைப்படம் எங்கள் சமூக மரத்தின் ஒரு பகுதியாக இருக்கும்",
        continueToStyle: "பாணி தேர்விற்கு தொடர்க",
        retakeUpload: "மீண்டும் எடுக்க/புதிய புகைப்படம் பதிவேற்ற",

        styleTitle: "உங்கள் பாணியைத் தேர்ந்தெடுக்கவும்",
        styleDescription: "உங்கள் RP நினைவு புகைப்படத்திற்கான விருப்ப ஓவர்லே பாணியைத் தேர்ந்தெடுக்கவும்!",
        availableOverlays: "கிடைக்கும் ஓவர்லேக்கள்",
        selectedLabel: "தேர்ந்தெடுக்கப்பட்டது:",
        useStyleContinue: "இந்த புகைப்படம் & பாணியை பயன்படுத்தி தொடர்க",
        retakePhoto: "மீண்டும் புகைப்படம் எடு",

        confirmationTitle: "சமர்ப்பிப்பை உறுதிப்படுத்தவும்",
        confirmationDescription: "சமர்ப்பிக்கும் முன் உங்கள் தகவலை சரிபார்க்கவும்:",
        confirmName: "பெயர்:",
        confirmEmail: "மின்னஞ்சல்:",
        confirmQuestions: "பதிலளிக்கப்பட்ட கேள்விகள்:",
        confirmTheme: "தீம்:",
        confirmRetention: "தரவு சேமிப்பு:",
        confirmPledge: "உறுதிமொழி:",
        confirmPhoto: "புகைப்படம்:",
        confirmPhotoReady: "✅ பதிவேற்ற தயாராக உள்ளது",
        confirmEmailPhoto: "மின்னஞ்சல் புகைப்படம்:",
        confirmEmailPhotoReady: "✅ உங்கள் மின்னஞ்சலுக்கு அனுப்பப்படும்",
        confirmPrimaryConsent: "முதன்மை ஒப்புதல்:",
        confirmPrimaryConsentReady: "✅ வழங்கப்பட்டது",
        confirmationNote: "💡 தேவைப்பட்டால் தீமையை மாற்ற நீங்கள் பின்னோக்கி செல்லலாம்",
        submitFeedback: "பின்னூட்டத்தை சமர்ப்பிக்கவும்",

        thankYouTitle: "நன்றி! ☀️",
        thankYouMessage: "உங்கள் பின்னூட்டம் பதிவு செய்யப்பட்டுள்ளது மற்றும் எங்கள் டிஜிட்டல் மரத்தில் ஒரு புதிய இலை சேர்க்கப்பட்டுள்ளது!",
        emailSentTitle: "உங்கள் RP நினைவு புகைப்படம் உங்கள் மின்னஞ்சலுக்கு அனுப்பப்பட்டுள்ளது!",
        emailSentDescription: "அடுத்த ஒரு நிமிடத்திற்குள் உங்கள் இன்பாக்ஸைச் சரிபார்க்கவும்",
        thankYouFooter: "Republic Polytechnic இன் நிலைத்தன்மை பயணத்திற்கு நீங்கள் வழங்கிய பங்களிப்பிற்கு நன்றி!",
        submitAnother: "மற்றொரு பின்னூட்டத்தை சமர்ப்பிக்கவும்"
    }
};

let currentLanguage = localStorage.getItem('kioskLanguage') || 'en';

// Extra translations for dynamic database questions, progress labels and controls. (Done by Caeden)
const dynamicLanguageText = {
    en: {
        flowSteps: { consent: 'Consent', details: 'Details', feedback: 'Feedback', pledge: 'Pledge', photo: 'Photo', confirm: 'Confirm' },
        answerPlaceholder: 'Type your answer here...',
        yes: 'Yes',
        no: 'No',
        home: 'Home',
        noQuestionsTitle: 'No Questions Available',
        noQuestionsDescription: 'Please contact the administrator to set up feedback questions.',
        noQuestionsButton: 'No Questions Available',
        requiredQuestion: 'Please answer the highlighted question before moving on.',
        questionsAnswered: count => `${count} questions answered`,
        selectFocusArea: 'Select a focus area',
        knownText: {
            'how would you rate your experience?': 'How would you rate your experience?',
            'what did you learn today?': 'What did you learn today?',
            'which topic interested you most?': 'Which topic interested you most?',
            'climate change': 'Climate Change',
            'renewable energy': 'Renewable Energy',
            'sustainable living': 'Sustainable Living',
            'ocean conservation': 'Ocean Conservation',
            'ethical governance': 'Ethical Governance',
            'community impact': 'Community Impact'
        }
    },
    zh: {
        flowSteps: { consent: '同意', details: '资料', feedback: '反馈', pledge: '承诺', photo: '照片', confirm: '确认' },
        answerPlaceholder: '请在这里输入您的回答...',
        yes: '是',
        no: '否',
        home: '主页',
        noQuestionsTitle: '暂无问题',
        noQuestionsDescription: '请联系管理员设置反馈问题。',
        noQuestionsButton: '暂无问题',
        requiredQuestion: '请回答高亮显示的问题后再继续。',
        questionsAnswered: count => `已回答 ${count} 个问题`,
        selectFocusArea: '请选择关注领域',
        knownText: {
            'how would you rate your experience?': '您会如何评价您的体验？',
            'what did you learn today?': '您今天学到了什么？',
            'which topic interested you most?': '您最感兴趣的主题是什么？',
            'climate change': '气候变化',
            'renewable energy': '可再生能源',
            'sustainable living': '可持续生活',
            'ocean conservation': '海洋保护',
            'ethical governance': '道德治理',
            'community impact': '社区影响'
        }
    },
    ms: {
        flowSteps: { consent: 'Persetujuan', details: 'Butiran', feedback: 'Maklum Balas', pledge: 'Ikrar', photo: 'Foto', confirm: 'Sahkan' },
        answerPlaceholder: 'Taip jawapan anda di sini...',
        yes: 'Ya',
        no: 'Tidak',
        home: 'Laman Utama',
        noQuestionsTitle: 'Tiada Soalan',
        noQuestionsDescription: 'Sila hubungi pentadbir untuk menetapkan soalan maklum balas.',
        noQuestionsButton: 'Tiada Soalan',
        requiredQuestion: 'Sila jawab soalan yang ditandakan sebelum meneruskan.',
        questionsAnswered: count => `${count} soalan dijawab`,
        selectFocusArea: 'Pilih bidang fokus',
        knownText: {
            'how would you rate your experience?': 'Bagaimanakah anda menilai pengalaman anda?',
            'what did you learn today?': 'Apakah yang anda pelajari hari ini?',
            'which topic interested you most?': 'Topik manakah yang paling menarik minat anda?',
            'climate change': 'Perubahan Iklim',
            'renewable energy': 'Tenaga Boleh Baharu',
            'sustainable living': 'Kehidupan Lestari',
            'ocean conservation': 'Pemuliharaan Lautan',
            'ethical governance': 'Tadbir Urus Beretika',
            'community impact': 'Impak Komuniti'
        }
    },
    ta: {
        flowSteps: { consent: 'ஒப்புதல்', details: 'விவரங்கள்', feedback: 'பின்னூட்டம்', pledge: 'உறுதிமொழி', photo: 'புகைப்படம்', confirm: 'உறுதி' },
        answerPlaceholder: 'உங்கள் பதிலை இங்கே தட்டச்சு செய்யவும்...',
        yes: 'ஆம்',
        no: 'இல்லை',
        home: 'முகப்பு',
        noQuestionsTitle: 'கேள்விகள் இல்லை',
        noQuestionsDescription: 'பின்னூட்டக் கேள்விகளை அமைக்க நிர்வாகியைத் தொடர்பு கொள்ளவும்.',
        noQuestionsButton: 'கேள்விகள் இல்லை',
        requiredQuestion: 'தொடருவதற்கு முன் குறிக்கப்பட்ட கேள்விக்கு பதிலளிக்கவும்.',
        questionsAnswered: count => `${count} கேள்விகள் பதிலளிக்கப்பட்டன`,
        selectFocusArea: 'கவனப் பகுதியைத் தேர்ந்தெடுக்கவும்',
        knownText: {
            'how would you rate your experience?': 'உங்கள் அனுபவத்தை எவ்வாறு மதிப்பிடுவீர்கள்?',
            'what did you learn today?': 'இன்று நீங்கள் என்ன கற்றுக்கொண்டீர்கள்?',
            'which topic interested you most?': 'எந்த தலைப்பு உங்களுக்கு மிகவும் ஆர்வமளித்தது?',
            'climate change': 'காலநிலை மாற்றம்',
            'renewable energy': 'புதுப்பிக்கத்தக்க ஆற்றல்',
            'sustainable living': 'நிலையான வாழ்க்கை',
            'ocean conservation': 'கடல் பாதுகாப்பு',
            'ethical governance': 'நெறிமுறை ஆட்சி',
            'community impact': 'சமூக தாக்கம்'
        }
    }
};

function getDynamicLanguageText() {
    return dynamicLanguageText[currentLanguage] || dynamicLanguageText.en;
}

function translateKnownDynamicText(text) {
    const source = String(text || '').trim();
    const key = source.toLowerCase();
    return getDynamicLanguageText().knownText[key] || source;
}

function setText(id, value) {
    document.querySelectorAll(`#${id}, [data-text-target="${id}"]`).forEach(el => {
        el.textContent = value;
    });
}

function setPlaceholder(id, value) {
    const el = document.getElementById(id);
    if (el) el.placeholder = value;
}

function setSelectOptionText(selectId, value, text) {
    const option = document.querySelector(`#${selectId} option[value="${value}"]`);
    if (option) option.textContent = text;
    const topicLabel = document.querySelector(`[data-topic-label="${value}"]`);
    if (topicLabel) topicLabel.textContent = text;
}

function updateLanguageButtons() {
    document.querySelectorAll('.language-selector button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.lang === currentLanguage) {
            btn.classList.add('active');
        }
    });
}

function updateProgressLanguage() {
    const labels = getDynamicLanguageText().flowSteps;
    document.querySelectorAll('.progress-step').forEach(stepEl => {
        const key = stepEl.dataset.step;
        const labelEl = stepEl.querySelector('.progress-label');
        if (labelEl && labels[key]) {
            labelEl.textContent = labels[key];
        }
    });
}

function translateRenderedQuestions() {
    const dynamicText = getDynamicLanguageText();

    document.querySelectorAll('#questions-container .question-label').forEach(label => {
        const original = label.dataset.originalText;
        const number = label.dataset.questionNumber;
        const required = label.dataset.required === 'true' ? ' *' : '';
        if (original && number) {
            label.textContent = `${number}. ${translateKnownDynamicText(original)}${required}`;
        }
    });

    document.querySelectorAll('#questions-container textarea').forEach(textarea => {
        textarea.placeholder = dynamicText.answerPlaceholder;
    });

    document.querySelectorAll('#questions-container [data-dynamic-option]').forEach(option => {
        const original = option.dataset.originalText;
        if (original) {
            const lower = original.toLowerCase();
            option.textContent = lower === 'yes'
                ? dynamicText.yes
                : (lower === 'no' ? dynamicText.no : translateKnownDynamicText(original));
        }
    });
}

function applyTranslations() {
    const t = translations[currentLanguage];
    if (!t) return;

    setText('brand-text', t.brandText);
    setText('form-landing-title', t.landingTitle);
    setText('form-landing-subtitle', t.landingSubtitle);
    setText('start-feedback-btn', t.startButton);
    setText('view-pledgeboards-btn', t.pledgeboardButton);
    setText('qr-header-text', t.qrHeader);

    const qrDescription = document.getElementById('qr-description-text');
    if (qrDescription && !qrDescription.innerHTML.includes('Scan to open:')) {
        qrDescription.textContent = t.qrDescription;
    }

    setText('consent-title', t.consentTitle);
    setText('consent-description', t.consentDescription);
    setText('option-7days-title', t.option7DaysTitle);
    setText('option-7days-description', t.option7DaysDescription);
    setText('option-longterm-title', t.optionLongTermTitle);
    setText('option-longterm-description', t.optionLongTermDescription);
    setText('privacy-notice-text', t.privacyNotice);
    setText('continue-feedback-form-text', t.continueFeedbackForm);

    setText('details-title', t.detailsTitle);
    setText('details-description', t.detailsDescription);
    setText('name-label', t.nameLabel);
    setText('email-label', t.emailLabel);
    setPlaceholder('user-name', t.namePlaceholder);
    setPlaceholder('user-email', t.emailPlaceholder);
    setText('continue-to-feedback-text', t.continueToFeedback);
    setText('back-from-details-text', t.back);

    setText('feedback-title', t.feedbackTitle);
    setText('feedback-description', t.feedbackDescription);
    setText('continue-to-pledge-text', t.continueToPledge);
    setText('back-from-feedback-text', t.back);
    setText('home-from-feedback-text', getDynamicLanguageText().home); // Home button translation done by nick

    setText('pledge-title', t.pledgeTitle);
    setText('pledge-description', t.pledgeDescription);
    setText('pledge-examples-header', t.pledgeExamplesHeader);
    setText('pledge-label', t.pledgeLabel);
    setText('pledge-topic-label', t.pledgeTopicLabel || 'Choose your sustainability focus');
    setSelectOptionText('pledge-topic', '', getDynamicLanguageText().selectFocusArea);
    setSelectOptionText('pledge-topic', 'climate-change', translateKnownDynamicText('Climate Change'));
    setSelectOptionText('pledge-topic', 'renewable-energy', translateKnownDynamicText('Renewable Energy'));
    setSelectOptionText('pledge-topic', 'sustainable-living', translateKnownDynamicText('Sustainable Living'));
    setSelectOptionText('pledge-topic', 'ocean-conservation', translateKnownDynamicText('Ocean Conservation'));
    setSelectOptionText('pledge-topic', 'ethical-governance', translateKnownDynamicText('Ethical Governance'));
    setSelectOptionText('pledge-topic', 'community-impact', translateKnownDynamicText('Community Impact'));
    setPlaceholder('pledge-text', t.pledgePlaceholder);
    setText('characters-text', t.charactersText);
    setText('pledge-privacy-text', t.pledgePrivacy);
    setText('continue-to-photo-text', t.continueToPhoto);
    setText('skip-pledge-text', t.skipPledge);
    setText('back-from-pledge-text', t.back);
    setText('home-from-pledge-text', getDynamicLanguageText().home); // Home button translation (DONE BY NICK)

    setText('photo-choice-title', t.photoChoiceTitle || 'Would you like to take a photo?');
    setText('photo-choice-description', t.photoChoiceDescription || 'You can take a keepsake photo, or skip it and submit your feedback now.');
    setText('take-photo-choice-text', t.takePhotoChoice || t.continueToPhoto || 'Take Photo');
    setText('skip-photo-choice-text', t.skipPhotoChoice || 'Skip Photo');
    setText('back-from-photo-choice-text', t.back);

    setText('photo-title', t.photoTitle);
    setText('photo-description', t.photoDescription);
    setText('capture-photo-text', t.capturePhoto);
    setText('back-from-photo-text', t.back);

    setText('upload-title', t.uploadTitle);
    setText('upload-description', t.uploadDescription);
    setText('upload-step-1', t.uploadStep1);
    setText('upload-step-2', t.uploadStep2);
    setText('upload-step-3', t.uploadStep3);
    setText('upload-camera-text', t.uploadCamera);
    setText('upload-hint-text', t.uploadHint);
    setText('continue-to-style-text', t.continueToStyle);
    setText('back-from-upload-text', t.back);
    setText('retake-upload-text', t.retakeUpload);

    setText('style-title', t.styleTitle);
    setText('style-description', t.styleDescription);
    setText('available-overlays-title', t.availableOverlays);
    setText('selected-label-text', t.selectedLabel);
    setText('use-style-continue-text', t.useStyleContinue);
    setText('retake-photo-text', t.retakePhoto);

    setText('confirmation-title', t.confirmationTitle);
    setText('confirmation-description', t.confirmationDescription);
    setText('confirm-name-label', t.confirmName);
    setText('confirm-email-label', t.confirmEmail);
    setText('confirm-questions-label', t.confirmQuestions);
    setText('confirm-theme-label', t.confirmTheme);
    setText('confirm-retention-label', t.confirmRetention); // changes made by nick
    setText('confirm-pledge-label', t.confirmPledge);
    setText('confirm-photo-label', t.confirmPhoto);
    setText('confirm-photo-ready', t.confirmPhotoReady);
    setText('confirm-email-photo-label', t.confirmEmailPhoto);
    setText('confirm-email-photo-ready', t.confirmEmailPhotoReady);
    setText('confirmation-note-text', t.confirmationNote);
    setText('submit-feedback-text', t.submitFeedback);
    setText('back-from-confirmation-text', t.back);

    setText('thankyou-title', t.thankYouTitle);
    setText('thankyou-message', t.thankYouMessage);
    setText('email-sent-title', t.emailSentTitle);
    setText('email-sent-description', t.emailSentDescription);
    setText('thankyou-footer-text', t.thankYouFooter);
    setText('submit-another-btn', t.submitAnother);
    setText('thankyou-pledgeboards-btn', t.pledgeboardButton);

    updateLanguageButtons();
    updateProgressLanguage();
    translateRenderedQuestions();
    applyParameterOverrides();
}

function setLanguage(lang) {
    if (!translations[lang]) return;
    currentLanguage = lang;
    localStorage.setItem('kioskLanguage', lang);
    document.documentElement.lang = lang;
    applyTranslations();
    if (activeFlowPageId) { // Refresh multilingual RP guide after language switch (DONE BY NICK)
        updateRpBearCompanion(activeFlowPageId);
    }
}

// Physical keyboard shortcuts for changing language: Alt+1 English, Alt+2 Chinese, Alt+3 Malay, Alt+4 Tamil. (Done by Caeden)
function handleLanguageShortcut(event) {
    if (!event.altKey || event.ctrlKey || event.metaKey) return;

    const shortcuts = {
        '1': 'en',
        '2': 'zh',
        '3': 'ms',
        '4': 'ta'
    };

    const lang = shortcuts[event.key];
    if (!lang) return;

    event.preventDefault();
    setLanguage(lang);
}

// apply once page is ready
document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('keydown', handleLanguageShortcut);
    setTimeout(() => {
        applyTranslations();
    }, 100);
});

// ============================================================================
// AR ADD-ON  (code 1 merged into feedback.js / code 2)
// ----------------------------------------------------------------------------
// HOW TO USE: paste this whole block at the VERY END of feedback.js
//             (or load it as a separate <script> right after feedback.js).
// feedback.js itself is NOT edited.
//
// How the merge works (classic script rules):
//  - A later `function foo(){}` with the same name replaces the earlier one, so
//    the face-prop functions below simply supersede the old versions.
//  - Existing const/let from feedback.js (stream, isMirrored, userData,
//    selectedFaceAccessory, faceLandmarker, FACE_ACCESSORY_OPTIONS ...) are
//    reused here, never redeclared.
//  - Code-1 parts that feedback.js already does (camera start, page switching,
//    theme page, takePhoto, countdown, boomerang, beauty filter, photo strip)
//    are NOT copied. The new effects hook into feedback.js's own flow instead.
//  - Everything the new HTML would have needed (canvases, buttons, background
//    dropdown, filter cards) is created from JS, so no HTML edit is required.
// Image files expected in  /assets//assets/propsforphototaking/  (same as code 1).
// ============================================================================

// ---------------------------------------------------------------------------
// 0) Constants + small helpers
// ---------------------------------------------------------------------------
const MAX_FACES = 4;   // how many people get a filter at once
const AR_MEDIAPIPE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm';
const AR_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const HAND_LANDMARKER_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task';
const GESTURE_RECOGNIZER_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';
const SEGMENTER_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite';
const CANVAS_FILTER_OK = typeof CanvasRenderingContext2D !== 'undefined' && 'filter' in CanvasRenderingContext2D.prototype;
const faceListByFirst = new WeakMap();   // first face -> all faces of that frame

// new filters appear in the existing swipe tray (old ones are kept)
[
    { id: 'rp-crown', label: 'RP Crown' },
    { id: 'rp-future-ready', label: 'RP Future Ready' },
    { id: 'rp-sticker-sunglasses', label: 'RP Sunglasses' },
    { id: 'RPGoGreenGoRP!', label: 'Go Green Sign (Make a fist)' },
    { id: 'fingerheart', label: 'Finger Heart (Make a finger heart)' },
    { id: 'rp-mouse-ears', label: 'RP Mouse Ears' }
].forEach((option) => {
    if (!FACE_ACCESSORY_IDS.includes(option.id)) {
        FACE_ACCESSORY_OPTIONS.push(option);
        FACE_ACCESSORY_IDS.push(option.id);
    }
});

function arEl(id) { return document.getElementById(id); }

function arOnReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
}

// feedback.js shows pages with style.display, not an "active" class
function arPhotoPageActive() {
    const page = arEl('photo-page');
    return !!page && activeFlowPageId === 'photo-page' && page.style.display !== 'none';
}

function arCameraView() { return arEl('camera-container'); }

function arEnsureRelative(el) {
    if (el && getComputedStyle(el).position === 'static') el.style.position = 'relative';
}

// creates a transparent canvas laid exactly over the camera (same place as face-accessory-canvas)
function arEnsureOverlayCanvas(id, below = false) {
    let canvas = arEl(id);
    if (canvas) return canvas;
    const base = arEl('face-accessory-canvas');
    if (!base || !base.parentNode) return null;
    canvas = document.createElement('canvas');
    canvas.id = id;
    canvas.className = base.className;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    arEnsureRelative(base.parentNode);
    base.parentNode.insertBefore(canvas, below ? base : base.nextSibling);
    return canvas;
}

function arEnsureStyles() {
    if (arEl('ar-addon-style')) return;
    const style = document.createElement('style');
    style.id = 'ar-addon-style';
    style.textContent =
        '.ar-effects-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:12px 0}' +
        '.ar-effects-row .toggle,.ar-effects-row select{min-height:40px;padding:6px 14px;border:1px solid #cbd5e1;' +
        'border-radius:999px;background:#fff;color:#17382a;font:inherit;font-weight:700;cursor:pointer}' +
        '.ar-effects-row .toggle[aria-pressed="true"]{background:#16a34a;border-color:#16a34a;color:#fff}' +
        '#camera-container.fx-on #video{opacity:0}';
    document.head.appendChild(style);
}

function arEffectsRow() {
    let row = arEl('effects-row');
    if (row) return row;
    const view = arCameraView();
    if (!view || !view.parentNode) return null;
    row = document.createElement('div');
    row.id = 'effects-row';
    row.className = 'ar-effects-row';
    view.parentNode.insertBefore(row, view.nextSibling);
    return row;
}

// adds a card to the swipe tray for each new filter (cloned from an existing card so it looks the same)
function arInjectFilterCards() {
    const selector = arEl('face-filter-selector');
    if (!selector) return;
    const keep = ['rp-crown', 'rp-future-ready', 'rp-sticker-sunglasses', 'RPGoGreenGoRP!', 'fingerheart', 'rp-mouse-ears'];
    const cards = selector.querySelectorAll('.face-filter-card');
    const template = cards[cards.length - 1];
    if (!template) return;
    FACE_ACCESSORY_OPTIONS.forEach((option) => {
        if (!keep.includes(option.id)) return;
        if (selector.querySelector('.face-filter-card[data-accessory="' + option.id + '"]')) return;
        const card = template.cloneNode(true);
        card.removeAttribute('id');
        card.dataset.accessory = option.id;
        card.classList.remove('active');
        card.setAttribute('aria-selected', 'false');
        const label = card.querySelector('.face-filter-label, .face-filter-name, span:last-of-type');
        if (label) label.textContent = option.label; else card.textContent = option.label;
        card.addEventListener('click', () => selectFaceAccessory(option.id));
        selector.appendChild(card);
    });
    updateFaceAccessoryButtons();
}

// ---------------------------------------------------------------------------
// 1) Scratch canvases + blur helper
// ---------------------------------------------------------------------------
const scratchCanvases = {};
function getScratch(name, w, h) {
    let c = scratchCanvases[name];
    if (!c) c = scratchCanvases[name] = document.createElement('canvas');
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.filter = 'none';
    g.clearRect(0, 0, w, h);
    return c;
}

function blurInto(dstCtx, src, w, h, px) {
    if (CANVAS_FILTER_OK) {
        dstCtx.filter = 'blur(' + px.toFixed(1) + 'px)';
        dstCtx.drawImage(src, 0, 0, w, h);
        dstCtx.filter = 'none';
        return;
    }
    const f = Math.max(1, Math.round(px * 0.9));   // Safari: down/up-scale blur
    const small = getScratch('blur-small', Math.max(2, Math.round(w / f)), Math.max(2, Math.round(h / f)));
    small.getContext('2d').drawImage(src, 0, 0, small.width, small.height);
    dstCtx.imageSmoothingEnabled = true;
    dstCtx.drawImage(small, 0, 0, w, h);
}

// ---------------------------------------------------------------------------
// 2) Face landmarker (multi-face, GPU -> CPU fallback) + head pose  [replaces feedback.js versions]
// ---------------------------------------------------------------------------
async function ensureFaceLandmarkerReady() {
    if (faceLandmarker) return faceLandmarker;
    if (faceLandmarkerLoadPromise) return faceLandmarkerLoadPromise;

    faceLandmarkerLoadPromise = import(AR_MEDIAPIPE_URL)
        .then(async ({ FaceLandmarker, FilesetResolver }) => {
            updateFaceDetectionStatus('Loading AR face effects...', 'loading');
            const vision = await FilesetResolver.forVisionTasks(AR_WASM_URL);
            const landmarkerOptions = (delegate) => ({
                baseOptions: { modelAssetPath: FACE_LANDMARKER_MODEL_URL, delegate },
                runningMode: 'VIDEO',
                numFaces: MAX_FACES,
                minFaceDetectionConfidence: 0.5,
                minFacePresenceConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            try {
                faceLandmarker = await FaceLandmarker.createFromOptions(vision, landmarkerOptions('GPU'));
            } catch (gpuError) {
                console.warn('GPU delegate failed, using CPU:', gpuError);
                faceLandmarker = await FaceLandmarker.createFromOptions(vision, landmarkerOptions('CPU'));
            }
            updateFaceDetectionStatus('Face detection ready.', 'success');
            return faceLandmarker;
        })
        .catch((error) => {
            console.error('Failed to load MediaPipe Face Landmarker:', error);
            updateFaceDetectionStatus('Face effects unavailable. Photo capture still works.', 'error');
            throw error;
        })
        .finally(() => { faceLandmarkerLoadPromise = null; });

    return faceLandmarkerLoadPromise;
}

function detectFaceAccessoryLandmarks(video) {
    if (!faceLandmarker || !video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        return null;
    }
    const result = faceLandmarker.detectForVideo(video, performance.now());
    const first = getFaceAccessoryLandmarksFromResult(result);
    const all = result?.faceLandmarks || result?.face_landmarks || [];
    if (first) faceListByFirst.set(first, all);   // so drawFaceAccessory can draw every face
    return first;
}

// Head turn / nod from the 3D landmarks (1 = facing the camera)
const poseTracks = [];
function estimateHeadPose(landmarks, w, h) {
    const lc = landmarks[234], rc = landmarks[454], nose = landmarks[1], top = landmarks[10], chin = landmarks[152];
    if (!lc || !rc || !nose || !top || !chin) return { cosYaw: 1, cosPitch: 1 };
    const px = (p) => ({ x: p.x * w, y: p.y * h });
    const L = px(lc), R = px(rc), N = px(nose), T = px(top), C = px(chin);

    const ax = R.x - L.x, ay = R.y - L.y, faceW = Math.hypot(ax, ay) || 1;
    const mx = (L.x + R.x) / 2, my = (L.y + R.y) / 2;
    const turn = ((N.x - mx) * ax + (N.y - my) * ay) / faceW / (faceW / 2);
    const yaw = Math.asin(Math.max(-1, Math.min(1, turn / 0.55)));

    const ux = C.x - T.x, uy = C.y - T.y, faceH = Math.hypot(ux, uy) || 1;
    const along = ((N.x - T.x) * ux + (N.y - T.y) * uy) / faceH / faceH;
    const pitch = Math.min(0.8, Math.max(0, Math.abs(along - 0.6) - 0.04) * 2.2);

    const cosYaw = Math.max(0.55, Math.cos(yaw));
    const cosPitch = Math.max(0.7, Math.cos(pitch));

    const now = performance.now();
    for (let i = poseTracks.length - 1; i >= 0; i--) if (now - poseTracks[i].time > 500) poseTracks.splice(i, 1);
    let best = null, bestD = faceW * 1.5;
    poseTracks.forEach((t) => { const d = Math.hypot(t.cx - mx, t.cy - my); if (d < bestD) { best = t; bestD = d; } });
    if (best) {
        best.cosYaw += (cosYaw - best.cosYaw) * 0.35;
        best.cosPitch += (cosPitch - best.cosPitch) * 0.35;
        best.cx = mx; best.cy = my; best.time = now;
        return { cosYaw: best.cosYaw, cosPitch: best.cosPitch };
    }
    poseTracks.push({ cx: mx, cy: my, cosYaw, cosPitch, time: now });
    return { cosYaw, cosPitch };
}

function getFaceAccessoryGeometry(landmarks, width, height) {
    const pose = estimateHeadPose(landmarks, width, height);
    const leftEyeOuter = getLandmarkPoint(landmarks, 33, width, height);
    const rightEyeOuter = getLandmarkPoint(landmarks, 263, width, height);
    const noseTip = getLandmarkPoint(landmarks, 1, width, height);
    const upperLip = getLandmarkPoint(landmarks, 13, width, height);
    const forehead = getLandmarkPoint(landmarks, 10, width, height);
    const chin = getLandmarkPoint(landmarks, 152, width, height);
    const leftCheek = getLandmarkPoint(landmarks, 234, width, height);
    const rightCheek = getLandmarkPoint(landmarks, 454, width, height);

    if (!leftEyeOuter || !rightEyeOuter || !noseTip) return null;

    const eyeCenter = {
        x: (leftEyeOuter.x + rightEyeOuter.x) / 2,
        y: (leftEyeOuter.y + rightEyeOuter.y) / 2
    };
    const eyeDistance = Math.hypot(rightEyeOuter.x - leftEyeOuter.x, rightEyeOuter.y - leftEyeOuter.y);
    const angle = Math.atan2(rightEyeOuter.y - leftEyeOuter.y, rightEyeOuter.x - leftEyeOuter.x);
    const faceHeight = forehead && chin ? Math.max(eyeDistance * 1.9, Math.abs(chin.y - forehead.y)) : eyeDistance * 2.2;

    return {
        angle,
        pose,
        eyeCenter,
        eyeDistance,
        faceHeight,
        noseTip,
        upperLip: upperLip || { x: noseTip.x, y: noseTip.y + eyeDistance * 0.35 },
        forehead: forehead || { x: eyeCenter.x, y: eyeCenter.y - eyeDistance * 0.85 },
        leftCheek: leftCheek || { x: eyeCenter.x - eyeDistance * 0.48, y: noseTip.y + eyeDistance * 0.2 },
        rightCheek: rightCheek || { x: eyeCenter.x + eyeDistance * 0.48, y: noseTip.y + eyeDistance * 0.2 }
    };
}

// ---------------------------------------------------------------------------
// 3) IMAGE PROPS (crown, ears, sunglasses, future-ready sticker)
// ---------------------------------------------------------------------------
const IMAGE_PROPS = {
    'rp-crown': {
        src: '/assets/propsforphototaking/rp-crown.png',
        widthEyes: 2.5, anchorX: 0.5, anchorY: 0.57, lift: 0.12
    },
    'rp-mouse-ears': {
        src: '/assets/propsforphototaking/rp-mouse-ears.png',   // must match the real file name exactly (case-sensitive)
        widthEyes: 2.3, anchorX: 0.5, anchorY: 0.45, lift: 0.15
    }
};
Object.entries(IMAGE_PROPS).forEach(([id, prop]) => {
    prop.image = new Image();
    prop.image.onerror = () => console.error(`[${id}] image not found: ${prop.src}`);
    prop.image.src = prop.src;
});

function drawWornImageProp(ctx, geometry, prop) {
    if (!prop) return;
    const image = prop.image;
    if (!image || !image.complete || !image.naturalWidth) return;

    const pose = geometry.pose || { cosYaw: 1, cosPitch: 1 };
    const trueEye = geometry.eyeDistance / pose.cosYaw;
    const drawWidth = trueEye * prop.widthEyes;
    const drawHeight = drawWidth * (image.naturalHeight / image.naturalWidth);

    ctx.save();
    ctx.translate(geometry.forehead.x, geometry.forehead.y);
    ctx.rotate(geometry.angle);
    ctx.translate(0, -geometry.faceHeight * prop.lift);
    ctx.scale(pose.cosYaw, pose.cosPitch);
    if (isMirrored) ctx.scale(-1, 1);   // un-flip so the "RP" logo reads the right way round
    ctx.drawImage(image, -drawWidth * prop.anchorX, -drawHeight * prop.anchorY, drawWidth, drawHeight);
    ctx.restore();
}

function drawRpCrownAccessory(ctx, geometry) { drawWornImageProp(ctx, geometry, IMAGE_PROPS['rp-crown']); }
function drawRpMouseEarsAccessory(ctx, geometry) { drawWornImageProp(ctx, geometry, IMAGE_PROPS['rp-mouse-ears']); }

const FUTURE_READY_STICKER = {
    src: '/assets/propsforphototaking/rp-future-ready.png',
    widthFace: 0.9, gap: 0.04, lift: 0.12, smoothing: 0.3,
    image: new Image(), pos: null, lastTime: 0
};
FUTURE_READY_STICKER.image.src = FUTURE_READY_STICKER.src;

function drawRpFutureReadyAccessory(ctx, geometry, width, height, time) {
    const sticker = FUTURE_READY_STICKER;
    const image = sticker.image;
    if (!image.complete || !image.naturalWidth) return;

    const faceWidth = Math.hypot(
        geometry.rightCheek.x - geometry.leftCheek.x,
        geometry.rightCheek.y - geometry.leftCheek.y
    );
    const faceCenterX = (geometry.leftCheek.x + geometry.rightCheek.x) / 2;
    const drawWidth = faceWidth * sticker.widthFace;
    const drawHeight = drawWidth * (image.naturalHeight / image.naturalWidth);
    const offset = faceWidth / 2 + faceWidth * sticker.gap + drawWidth / 2;

    let side = isMirrored ? -1 : 1;
    const fits = (s) => {
        const cx = faceCenterX + s * offset;
        return cx - drawWidth / 2 >= 0 && cx + drawWidth / 2 <= width;
    };
    if (!fits(side) && fits(-side)) side = -side;

    const bob = Math.sin(time / 400) * faceWidth * 0.015;
    let targetX = faceCenterX + side * offset;
    let targetY = geometry.eyeCenter.y - geometry.faceHeight * sticker.lift + bob;
    targetX = Math.max(drawWidth / 2, Math.min(width - drawWidth / 2, targetX));
    targetY = Math.max(drawHeight / 2, Math.min(height - drawHeight / 2, targetY));

    if (!sticker.pos || time - sticker.lastTime > 500) {
        sticker.pos = { x: targetX, y: targetY };
    } else {
        sticker.pos.x += (targetX - sticker.pos.x) * sticker.smoothing;
        sticker.pos.y += (targetY - sticker.pos.y) * sticker.smoothing;
    }
    sticker.lastTime = time;

    ctx.save();
    ctx.translate(sticker.pos.x, sticker.pos.y);
    if (isMirrored) ctx.scale(-1, 1);
    ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
}

const RP_SUNGLASSES = {
    src: '/assets/propsforphototaking/rp-sticker-sunglasses.png',
    widthEyes: 2.0, anchorY: 0.53, drop: 0.0,
    image: new Image()
};
RP_SUNGLASSES.image.src = RP_SUNGLASSES.src;

function drawRpSunglassesAccessory(ctx, geometry) {
    const image = RP_SUNGLASSES.image;
    if (!image.complete || !image.naturalWidth) return;

    const pose = geometry.pose || { cosYaw: 1, cosPitch: 1 };
    const drawWidth = (geometry.eyeDistance / pose.cosYaw) * RP_SUNGLASSES.widthEyes;
    const drawHeight = drawWidth * (image.naturalHeight / image.naturalWidth);

    ctx.save();
    ctx.translate(geometry.eyeCenter.x, geometry.eyeCenter.y + geometry.eyeDistance * RP_SUNGLASSES.drop);
    ctx.rotate(geometry.angle);
    ctx.scale(pose.cosYaw, pose.cosPitch);
    if (isMirrored) ctx.scale(-1, 1);
    ctx.drawImage(image, -drawWidth / 2, -drawHeight * RP_SUNGLASSES.anchorY, drawWidth, drawHeight);
    ctx.restore();
}

// ---------------------------------------------------------------------------
// 4) GO GREEN SIGN (make a fist) + FINGER HEART  (hand landmarker)
// ---------------------------------------------------------------------------
const RP_GO_GREEN = {
    srcCandidates: ['/assets/propsforphototaking/rp-go-green.png', '/assets/propsforphototaking/RPGoGreenGoRP!.png', '/assets/propsforphototaking/RPGoGreenGoRP_.png'],
    widthEyes: 2.5, anchorX: 0.55, anchorY: 0.82, smoothing: 0.5, holdMs: 400,
    fistRatio: 1.35,    // too strict? raise it (1.5). Open hand triggers it? lower it (1.2)
    debug: false,
    image: new Image(), srcIndex: 0, imageFailed: false,
    handLandmarker: null, loadPromise: null, loadFailedAt: 0,
    lastVideoTime: -1, lastHand: null, lastSeen: 0, pos: null, angle: 0, debugText: 'starting...'
};
RP_GO_GREEN.image.onerror = () => {
    RP_GO_GREEN.srcIndex += 1;
    if (RP_GO_GREEN.srcIndex < RP_GO_GREEN.srcCandidates.length) {
        RP_GO_GREEN.image.src = RP_GO_GREEN.srcCandidates[RP_GO_GREEN.srcIndex];
    } else {
        RP_GO_GREEN.imageFailed = true;
        console.error('[GoGreen] image not found. Tried:', RP_GO_GREEN.srcCandidates);
    }
};
RP_GO_GREEN.image.src = RP_GO_GREEN.srcCandidates[0];

// one hand-landmarker loader shared by Go Green and Finger Heart state objects
function arLoadHandLandmarker(holder, label) {
    if (holder.handLandmarker) return Promise.resolve(holder.handLandmarker);
    if (holder.loadPromise) return holder.loadPromise;
    if (holder.loadFailedAt && performance.now() - holder.loadFailedAt < 5000) return Promise.resolve(null);

    holder.loadPromise = import(AR_MEDIAPIPE_URL)
        .then(async ({ HandLandmarker, FilesetResolver }) => {
            const vision = await FilesetResolver.forVisionTasks(AR_WASM_URL);
            const options = (delegate) => ({
                baseOptions: { modelAssetPath: HAND_LANDMARKER_MODEL_URL, delegate },
                runningMode: 'VIDEO',
                numHands: 1,
                minHandDetectionConfidence: 0.4,
                minHandPresenceConfidence: 0.4,
                minTrackingConfidence: 0.4
            });
            try {
                holder.handLandmarker = await HandLandmarker.createFromOptions(vision, options('GPU'));
            } catch (gpuError) {
                console.warn(label + ' GPU delegate failed, using CPU:', gpuError);
                holder.handLandmarker = await HandLandmarker.createFromOptions(vision, options('CPU'));
            }
            holder.loadFailedAt = 0;
            return holder.handLandmarker;
        })
        .catch((error) => {
            console.error('Failed to load MediaPipe Hand Landmarker (' + label + '):', error);
            holder.loadFailedAt = performance.now();
            return null;
        })
        .finally(() => { holder.loadPromise = null; });

    return holder.loadPromise;
}

function ensureHandLandmarkerReady() { return arLoadHandLandmarker(RP_GO_GREEN, 'go green'); }

function isFistGesture(hand, width, height) {
    const dist = (a, b) => Math.hypot((a.x - b.x) * width, (a.y - b.y) * height);
    const wrist = hand[0];
    const fingers = [[8, 5], [12, 9], [16, 13], [20, 17]];
    let ratioSum = 0;
    fingers.forEach(([tip, knuckle]) => {
        ratioSum += dist(hand[tip], wrist) / Math.max(1, dist(hand[knuckle], wrist));
    });
    return ratioSum / fingers.length < RP_GO_GREEN.fistRatio;
}

function drawGoGreenDebug(ctx, width, text) {
    ctx.save();
    if (isMirrored) { ctx.translate(width, 0); ctx.scale(-1, 1); }
    ctx.font = '700 20px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(8, 8, 600, 34);
    ctx.fillStyle = '#00ff66';
    ctx.fillText(text, 16, 32);
    ctx.restore();
}

// HTML pill, so it never appears in the saved photo
function updateGoGreenHint(show) {
    let hint = arEl('go-green-hint');
    if (!hint) {
        const canvas = arEl('face-accessory-canvas');
        const parent = canvas && canvas.parentElement;
        if (!parent) return;
        arEnsureRelative(parent);
        hint = document.createElement('div');
        hint.id = 'go-green-hint';
        hint.textContent = '✊ Make a fist to hold the sign!';
        hint.style.cssText = 'position:absolute;left:50%;bottom:16px;transform:translateX(-50%);' +
            'padding:10px 18px;border-radius:999px;background:rgba(0,0,0,0.65);color:#fff;' +
            'font:700 18px Arial,sans-serif;pointer-events:none;z-index:5;white-space:nowrap;' +
            'opacity:0;transition:opacity 0.25s;';
        parent.appendChild(hint);
    }
    if (hint.dataset.shown === String(show)) return;
    hint.dataset.shown = String(show);
    hint.style.opacity = show ? '1' : '0';
}

function drawRpGoGreenAccessory(ctx, geometry, width, height, time) {
    const sign = RP_GO_GREEN;
    const image = sign.image;
    updateGoGreenHint(true);

    if (sign.debug) drawGoGreenDebug(ctx, width, sign.debugText);

    if (!sign.handLandmarker) {
        sign.debugText = sign.loadFailedAt ? 'hand model FAILED to load (check network / console)' : 'hand model loading...';
        ensureHandLandmarkerReady();
        return;
    }
    if (sign.imageFailed) { sign.debugText = 'IMAGE NOT FOUND: put the PNG in the propsforphototaking folder'; return; }
    if (!image.complete || !image.naturalWidth) { sign.debugText = 'image loading...'; return; }

    const video = arEl('video');
    if (video && video.readyState >= 2 && video.currentTime !== sign.lastVideoTime) {
        sign.lastVideoTime = video.currentTime;
        const result = sign.handLandmarker.detectForVideo(video, performance.now());
        const detected = result?.landmarks?.[0] || null;
        if (detected) {
            const isFist = isFistGesture(detected, width, height);
            sign.lastHand = detected;
            if (isFist) sign.lastSeen = time;
            sign.debugText = 'hand: YES | fist: ' + (isFist ? 'YES' : 'NO');
        } else {
            sign.debugText = 'hand: NO';
        }
    }

    if (!sign.lastHand || time - sign.lastSeen > sign.holdMs) {
        sign.pos = null;
        return;
    }

    const hand = sign.lastHand;
    const wrist = hand[0];
    const middleBase = hand[9];
    const palm = [0, 5, 9, 17].map((i) => hand[i]);
    const targetX = (palm.reduce((sum, p) => sum + p.x, 0) / palm.length) * width;
    const targetY = (palm.reduce((sum, p) => sum + p.y, 0) / palm.length) * height;

    let targetAngle = Math.atan2((middleBase.y - wrist.y) * height, (middleBase.x - wrist.x) * width) + Math.PI / 2;
    targetAngle = Math.max(-0.7, Math.min(0.7, targetAngle));

    if (!sign.pos) {
        sign.pos = { x: targetX, y: targetY };
        sign.angle = targetAngle;
    } else {
        sign.pos.x += (targetX - sign.pos.x) * sign.smoothing;
        sign.pos.y += (targetY - sign.pos.y) * sign.smoothing;
        sign.angle += (targetAngle - sign.angle) * sign.smoothing;
    }

    const drawWidth = geometry.eyeDistance * sign.widthEyes;
    const drawHeight = drawWidth * (image.naturalHeight / image.naturalWidth);
    updateGoGreenHint(false);
    ctx.save();
    ctx.translate(sign.pos.x, sign.pos.y);
    ctx.rotate(sign.angle);
    if (isMirrored) ctx.scale(-1, 1);
    ctx.drawImage(image, -drawWidth * sign.anchorX, -drawHeight * sign.anchorY, drawWidth, drawHeight);
    ctx.restore();
}

const FINGER_HEART = {
    src: '/assets/propsforphototaking/fingerheart.png',   // optional; a drawn heart is used if missing
    sizeEyes: 0.9,
    pinchRatio: 0.4,    // not triggering? raise it (0.55). Too easy? lower it (0.35)
    curlRatio: 0.8,
    smoothing: 0.5, holdMs: 600, popMs: 280,
    debug: false, debugText: '',
    image: new Image(), imageOk: false,
    handLandmarker: null, loadPromise: null, loadFailedAt: 0,
    lastVideoTime: -1, lastHand: null, lastSeen: 0, shownSince: 0, pos: null
};
FINGER_HEART.image.onload = () => { FINGER_HEART.imageOk = true; };
FINGER_HEART.image.onerror = () => { FINGER_HEART.imageOk = false; };
FINGER_HEART.image.src = FINGER_HEART.src;

function ensureFingerHeartLandmarkerReady() { return arLoadHandLandmarker(FINGER_HEART, 'finger heart'); }

function isFingerHeartGesture(hand, width, height) {
    const dist = (a, b) => Math.hypot((a.x - b.x) * width, (a.y - b.y) * height);
    const handSize = Math.max(1, dist(hand[0], hand[9]), dist(hand[5], hand[17]) * 1.15, dist(hand[0], hand[5]));

    let pinchValue = Infinity;
    [3, 4].forEach((t) => {
        [6, 7, 8].forEach((i) => {
            pinchValue = Math.min(pinchValue, dist(hand[t], hand[i]) / handSize);
        });
    });

    const curlValues = [[12, 9], [16, 13], [20, 17]].map(([tip, knuckle]) => dist(hand[tip], hand[knuckle]) / handSize);
    const curlValue = Math.max(...curlValues);

    const pinched = pinchValue < FINGER_HEART.pinchRatio;
    const othersCurled = curlValue < FINGER_HEART.curlRatio;

    FINGER_HEART.debugText =
        `pinch ${pinchValue.toFixed(2)} (<${FINGER_HEART.pinchRatio}) ${pinched ? 'OK' : 'X'} | ` +
        `curl ${curlValue.toFixed(2)} (<${FINGER_HEART.curlRatio}) ${othersCurled ? 'OK' : 'X'} | ` +
        `img ${FINGER_HEART.imageOk ? 'OK' : 'NOT FOUND'}`;

    return pinched && othersCurled;
}

function drawFingerHeartAccessory(ctx, geometry, width, height, time) {
    const heart = FINGER_HEART;

    if (heart.debug) {
        ctx.save();
        if (isMirrored) { ctx.translate(width, 0); ctx.scale(-1, 1); }
        ctx.font = '700 16px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(8, 8, Math.min(width - 16, 900), 30);
        ctx.fillStyle = '#00ff66';
        ctx.fillText(heart.debugText || '', 16, 29);
        ctx.restore();
    }

    if (!heart.handLandmarker) {
        heart.debugText = heart.loadFailedAt ? 'hand model FAILED to load (check network / console)' : 'hand model loading...';
        ensureFingerHeartLandmarkerReady();
        return;
    }

    const video = arEl('video');
    if (video && video.readyState >= 2 && video.currentTime !== heart.lastVideoTime) {
        heart.lastVideoTime = video.currentTime;
        const result = heart.handLandmarker.detectForVideo(video, performance.now());
        const hands = result?.landmarks || [];

        let chosen = null;
        let isHeart = false;
        for (const h of hands) {
            if (isFingerHeartGesture(h, width, height)) { chosen = h; isHeart = true; break; }
        }
        if (!chosen && hands.length) chosen = hands[0];

        if (chosen) {
            heart.lastHand = chosen;
            if (isHeart) heart.lastSeen = time;
        } else {
            heart.debugText = 'hand: NO (not detected)';
        }
    }

    if (!heart.lastHand || time - heart.lastSeen > heart.holdMs) {
        heart.pos = null;
        heart.shownSince = 0;
        return;
    }
    if (!heart.shownSince) heart.shownSince = time;

    const thumbTip = heart.lastHand[4];
    const indexTip = heart.lastHand[8];
    const targetX = ((thumbTip.x + indexTip.x) / 2) * width;
    const targetY = ((thumbTip.y + indexTip.y) / 2) * height;

    if (!heart.pos) {
        heart.pos = { x: targetX, y: targetY };
    } else {
        heart.pos.x += (targetX - heart.pos.x) * heart.smoothing;
        heart.pos.y += (targetY - heart.pos.y) * heart.smoothing;
    }

    const t = Math.min(1, (time - heart.shownSince) / heart.popMs);
    const c1 = 1.70158, c3 = c1 + 1;
    const popScale = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    const size = geometry.eyeDistance * heart.sizeEyes;
    const bob = Math.sin(time / 300) * size * 0.04;

    ctx.save();
    ctx.translate(heart.pos.x, heart.pos.y - size * 0.55 + bob);
    ctx.scale(popScale, popScale);
    if (isMirrored) ctx.scale(-1, 1);

    if (heart.imageOk && heart.image.complete && heart.image.naturalWidth) {
        const drawHeight = size * (heart.image.naturalHeight / heart.image.naturalWidth);
        ctx.drawImage(heart.image, -size / 2, -drawHeight / 2, size, drawHeight);
    } else {
        const s = size / 2;
        ctx.shadowColor = 'rgba(255, 77, 121, 0.7)';
        ctx.shadowBlur = size * 0.25;
        ctx.fillStyle = '#ff4d79';
        ctx.beginPath();
        ctx.moveTo(0, s * 0.9);
        ctx.bezierCurveTo(-s * 1.3, s * 0.1, -s * 0.8, -s * 0.9, 0, -s * 0.35);
        ctx.bezierCurveTo(s * 0.8, -s * 0.9, s * 1.3, s * 0.1, 0, s * 0.9);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.beginPath();
        ctx.ellipse(-s * 0.42, -s * 0.22, s * 0.16, s * 0.1, -0.6, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// ---------------------------------------------------------------------------
// 5) Segmentation (person / hand mask) -> hands hide worn props, background replacement
// ---------------------------------------------------------------------------
const FX = {
    bg: 'none',             // none | blur | rp-background1 | rp-background2
    occlusion: true,        // hands hide worn props (crown, ears, sunglasses)
    segmentEveryMs: 45
};
const WORN_PROPS = ['rp-crown', 'rp-mouse-ears', 'rp-sticker-sunglasses'];

const SEG = {
    segmenter: null, loadPromise: null, failedAt: 0,
    w: 0, h: 0, maskId: 0, maskTime: -99999,
    personCanvas: null, skinCanvas: null,
    personData: null, skinData: null, prev: null,
    lastRun: 0, lastVideoTime: -1, lastTs: 0, ready: false
};
const SEG_TUNE = { lo: 0.35, hi: 0.75, smoothing: 0.6 };
function smoothstep(a, b, x) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
}

function ensureSegmenter() {
    if (SEG.segmenter) return Promise.resolve(SEG.segmenter);
    if (SEG.loadPromise) return SEG.loadPromise;
    if (SEG.failedAt && performance.now() - SEG.failedAt < 10000) return Promise.resolve(null);

    SEG.loadPromise = import(AR_MEDIAPIPE_URL)
        .then(async ({ ImageSegmenter, FilesetResolver }) => {
            const vision = await FilesetResolver.forVisionTasks(AR_WASM_URL);
            const options = (delegate) => ({
                baseOptions: { modelAssetPath: SEGMENTER_MODEL_URL, delegate },
                runningMode: 'VIDEO',
                outputCategoryMask: false,
                outputConfidenceMasks: true
            });
            try {
                SEG.segmenter = await ImageSegmenter.createFromOptions(vision, options('GPU'));
            } catch (gpuError) {
                console.warn('Segmenter GPU delegate failed, using CPU:', gpuError);
                SEG.segmenter = await ImageSegmenter.createFromOptions(vision, options('CPU'));
            }
            SEG.failedAt = 0;
            return SEG.segmenter;
        })
        .catch((error) => {
            console.error('Failed to load the segmentation model:', error);
            SEG.failedAt = performance.now();
            showVisitorNotice('photo-form-alert', 'Background effect is unavailable right now. Photo capture still works.');
            return null;
        })
        .finally(() => { SEG.loadPromise = null; });
    return SEG.loadPromise;
}

function consumeSegmentationResult(result) {
    const masks = result && result.confidenceMasks;
    if (!masks || !masks.length) return;
    const bgMask = masks[0];
    const skinMask = masks[2] || null;
    const w = bgMask.width, h = bgMask.height;
    const bg = bgMask.getAsFloat32Array();
    const skin = skinMask ? skinMask.getAsFloat32Array() : null;

    if (!SEG.personCanvas) { SEG.personCanvas = document.createElement('canvas'); SEG.skinCanvas = document.createElement('canvas'); }
    if (SEG.personCanvas.width !== w || SEG.personCanvas.height !== h) {
        SEG.personCanvas.width = SEG.skinCanvas.width = w;
        SEG.personCanvas.height = SEG.skinCanvas.height = h;
    }
    if (!SEG.personData || SEG.personData.width !== w || SEG.personData.height !== h) {
        SEG.personData = new ImageData(w, h);
        SEG.skinData = new ImageData(w, h);
        SEG.prev = null;
    }
    if (!SEG.prev || SEG.prev.length !== w * h) {
        SEG.prev = new Float32Array(w * h);
        for (let i = 0; i < w * h; i++) SEG.prev[i] = 1 - bg[i];
    }

    const person = SEG.personData, skinImg = SEG.skinData, k = SEG_TUNE.smoothing;
    for (let i = 0, n = w * h; i < n; i++) {
        const p = SEG.prev[i] + ((1 - bg[i]) - SEG.prev[i]) * k;
        SEG.prev[i] = p;
        person.data[i * 4 + 3] = Math.round(smoothstep(SEG_TUNE.lo, SEG_TUNE.hi, p) * 255);
        skinImg.data[i * 4 + 3] = skin && skin[i] > 0.5 ? 255 : 0;
    }
    SEG.personCanvas.getContext('2d').putImageData(person, 0, 0);
    SEG.skinCanvas.getContext('2d').putImageData(skinImg, 0, 0);
    SEG.w = w; SEG.h = h;
    SEG.maskId++;
    SEG.maskTime = performance.now();
    SEG.ready = true;
    masks.forEach((m) => { if (m.close) m.close(); });
}

function runSegmentation(video, now, force) {
    if (!SEG.segmenter || !video || video.readyState < 2) return;
    if (!force && (now - SEG.lastRun < FX.segmentEveryMs || video.currentTime === SEG.lastVideoTime)) return;
    SEG.lastRun = now;
    SEG.lastVideoTime = video.currentTime;
    const ts = Math.max(Math.floor(performance.now()), SEG.lastTs + 1);
    SEG.lastTs = ts;
    try {
        let called = false;
        const returned = SEG.segmenter.segmentForVideo(video, ts, (result) => { called = true; consumeSegmentationResult(result); });
        if (!called && returned) consumeSegmentationResult(returned);
    } catch (error) {
        console.warn('Segmentation skipped:', error.message);
    }
}

// hands from the gesture recogniser (filled by the wrapper further down)
const HANDS = { landmarks: [], time: -99999, id: 0 };

function convexHull(points) {
    const pts = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    if (pts.length < 3) return pts;
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower = [];
    pts.forEach((p) => { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); });
    const upper = [];
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
    upper.pop(); lower.pop();
    return lower.concat(upper);
}

const OCC = { canvas: null, key: '' };
function getOcclusionMask() {
    const now = performance.now();
    if (!FX.occlusion || !SEG.skinCanvas || !HANDS.landmarks.length) return null;
    if (now - HANDS.time > 500 || now - SEG.maskTime > 500) return null;
    const key = SEG.maskId + ':' + HANDS.id;
    if (OCC.canvas && OCC.key === key) return OCC.canvas;

    const w = SEG.w, h = SEG.h;
    if (!OCC.canvas) OCC.canvas = document.createElement('canvas');
    if (OCC.canvas.width !== w || OCC.canvas.height !== h) { OCC.canvas.width = w; OCC.canvas.height = h; }
    const g = OCC.canvas.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#000';
    HANDS.landmarks.forEach((hand) => {
        const pts = hand.map((p) => ({ x: p.x * w, y: p.y * h }));
        const hull = convexHull(pts);
        if (hull.length < 3) return;
        const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length;
        const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length;
        g.beginPath();
        hull.forEach((p, i) => {
            const x = cx + (p.x - cx) * 1.35, y = cy + (p.y - cy) * 1.35;
            if (i) g.lineTo(x, y); else g.moveTo(x, y);
        });
        g.closePath();
        g.fill();
    });
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(SEG.skinCanvas, 0, 0);
    g.globalCompositeOperation = 'source-over';
    OCC.key = key;
    return OCC.canvas;
}

// draw something, then rub out the part a hand is covering
function withOcclusion(ctx, width, height, drawFn) {
    const mask = getOcclusionMask();
    if (!mask) { drawFn(ctx); return; }
    const off = getScratch('occlusion', width, height);
    const og = off.getContext('2d');
    og.setTransform(ctx.getTransform());
    drawFn(og);
    og.globalCompositeOperation = 'destination-out';
    if (CANVAS_FILTER_OK) og.filter = 'blur(2px)';
    og.drawImage(mask, 0, 0, width, height);
    og.filter = 'none';
    og.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(off, 0, 0);
    ctx.restore();
}

// ---- background images ----
const IMAGE_BACKGROUNDS = [
    { id: 'rp-background1', label: 'RP Campus', src: '/assets/propsforphototaking/rpbackground1.png' },
    { id: 'rp-background2', label: 'RP Background 2', src: '/assets/propsforphototaking/rpbackground2.png' }
];
IMAGE_BACKGROUNDS.forEach((bg) => {
    bg.image = new Image();
    bg.image.onerror = () => console.error('[' + bg.label + '] image not found: ' + bg.src);
    bg.image.src = bg.src;
    bg.cache = {};
});

function makeBackdrop(kind, w, h) {
    const bg = IMAGE_BACKGROUNDS.find((b) => b.id === kind);
    const key = w + 'x' + h + (isMirrored ? 'm' : '');
    if (bg && bg.cache[key]) return bg.cache[key];

    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    const img = bg && bg.image;

    if (!(img && img.complete && img.naturalWidth > 0)) {
        g.fillStyle = '#fdf6e9';     // plain cream until the image has loaded (or if it is missing); not cached
        g.fillRect(0, 0, w, h);
        return c;
    }

    g.save();
    if (isMirrored) { g.translate(w, 0); g.scale(-1, 1); }   // pre-flip: the mirrored drawing space flips it back
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);   // "cover" fit
    const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
    g.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    g.restore();

    bg.cache[key] = c;
    return c;
}

function drawBackdrop(ctx, video, w, h) {
    if (FX.bg === 'blur') {
        const tmp = getScratch('bg-blur', w, h);
        blurInto(tmp.getContext('2d'), video, w, h, Math.max(8, w / 45));
        ctx.drawImage(tmp, 0, 0, w, h);
    } else {
        ctx.drawImage(makeBackdrop(FX.bg, w, h), 0, 0, w, h);
    }
}

function drawPersonCutout(ctx, video, w, h) {
    const p = getScratch('person', w, h);
    const pg = p.getContext('2d');
    pg.drawImage(video, 0, 0, w, h);
    pg.globalCompositeOperation = 'destination-in';
    if (CANVAS_FILTER_OK) pg.filter = 'blur(2.5px)';
    pg.drawImage(SEG.personCanvas, 0, 0, w, h);
    pg.filter = 'none';
    pg.globalCompositeOperation = 'source-over';
    ctx.drawImage(p, 0, 0, w, h);
}

function composeFrame(ctx, video, w, h) {
    if (FX.bg !== 'none' && SEG.ready && SEG.personCanvas) {
        drawBackdrop(ctx, video, w, h);
        drawPersonCutout(ctx, video, w, h);
    } else {
        ctx.drawImage(video, 0, 0, w, h);
    }
}

// Saved photo / boomerang frames: feedback.js's own beauty filter still runs, but on the
// background-replaced frame (it only needs something drawImage can read).
const drawPhotoWithBeautyFilterBase = drawPhotoWithBeautyFilter;
drawPhotoWithBeautyFilter = function (ctx, image, x, y, width, height, faceDetection = null) {
    let source = image;
    try {
        if (FX.bg !== 'none' && SEG.segmenter && image instanceof HTMLVideoElement) {
            runSegmentation(image, performance.now(), true);
            if (SEG.ready && SEG.personCanvas) {
                const tmp = getScratch('photo-bg', width, height);
                composeFrame(tmp.getContext('2d'), image, width, height);
                source = tmp;
            }
        }
    } catch (error) {
        console.error('Background effect failed, saving the plain photo:', error);
        source = image;
    }
    drawPhotoWithBeautyFilterBase(ctx, source, x, y, width, height, faceDetection);
};

// Live view: effects drawn on a canvas that sits over the <video>
function fxStep(now) {
    const video = arEl('video');
    const wrap = arCameraView();
    if (!video || !wrap) return;

    const active = stream && arPhotoPageActive() && video.readyState >= 2 && video.videoWidth > 0;
    const handsFresh = HANDS.landmarks.length > 0 && now - HANDS.time < 400;
    const needOcclusion = FX.occlusion && WORN_PROPS.includes(selectedFaceAccessory) && handsFresh;

    if (active && (FX.bg !== 'none' || needOcclusion)) {
        if (!SEG.segmenter) ensureSegmenter(); else runSegmentation(video, now);
    }
    if (!active || FX.bg === 'none') { wrap.classList.remove('fx-on'); return; }

    const canvas = arEnsureOverlayCanvas('fx-canvas', true);   // below the prop canvases
    if (!canvas || !resizeFaceAccessoryCanvas(video, canvas)) return;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (isMirrored) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
    }
    composeFrame(ctx, video, canvas.width, canvas.height);
    canvas.style.filter = video.style.filter || '';   // keep feedback.js's live beauty look
    wrap.classList.add('fx-on');                       // hides the plain <video>, shows this canvas
}

function fxLoop(now) {
    try { fxStep(now); } catch (error) { console.error('Effects step failed (loop keeps running):', error); }
    requestAnimationFrame(fxLoop);
}

// ---------------------------------------------------------------------------
// 6) Drawing all face props  [replaces feedback.js drawFaceAccessory; old filters kept]
// ---------------------------------------------------------------------------
function drawFaceAccessory(ctx, landmarks, width, height, time = performance.now()) {
    if (selectedFaceAccessory === 'none' || !landmarks) return;

    const faces = faceListByFirst.get(landmarks) || [landmarks];   // every face found in this frame
    faces.forEach((faceLandmarks, index) => {
        const geometry = getFaceAccessoryGeometry(faceLandmarks, width, height);
        if (geometry) drawOneFaceAccessory(ctx, geometry, width, height, time, index === 0);
    });
}

// primary = the first face. Props that follow a hand or keep a smoothed position are drawn for it only.
function drawOneFaceAccessory(ctx, geometry, width, height, time, primary) {
    const worn = (drawFn) => withOcclusion(ctx, width, height, drawFn);

    switch (selectedFaceAccessory) {
        // ----- original feedback.js filters -----
        case 'glasses': drawGlassesAccessory(ctx, geometry); break;
        case 'sparkle-glasses': drawSparkleGlassesAccessory(ctx, geometry, time); break;
        case 'moustache': drawMoustacheAccessory(ctx, geometry); break;
        case 'hat': drawHatAccessory(ctx, geometry); break;
        case 'flower-crown': drawFlowerCrownAccessory(ctx, geometry, time); break;
        case 'halo': drawHaloAccessory(ctx, geometry, time); break;
        case 'blush': drawBlushAccessory(ctx, geometry, time); break;
        case 'party': drawPartyAccessory(ctx, geometry, time); break;
        case 'rp-shades': drawRpShadesAccessory(ctx, geometry); break;
        case 'leaf-crown': drawLeafCrownAccessory(ctx, geometry, time); break;
        case 'graduation': drawGraduationAccessory(ctx, geometry, time); break;
        // ----- new filters -----
        case 'rp-crown': worn((c) => drawRpCrownAccessory(c, geometry)); break;
        case 'rp-mouse-ears': worn((c) => drawRpMouseEarsAccessory(c, geometry)); break;
        case 'rp-sticker-sunglasses': worn((c) => drawRpSunglassesAccessory(c, geometry)); break;
        case 'rp-future-ready': if (primary) drawRpFutureReadyAccessory(ctx, geometry, width, height, time); break;
        case 'RPGoGreenGoRP!': if (primary) drawRpGoGreenAccessory(ctx, geometry, width, height, time); break;
        case 'fingerheart': if (primary) drawFingerHeartAccessory(ctx, geometry, width, height, time); break;
    }
}

function renderLiveFaceAccessory() {
    const video = arEl('video');
    const canvas = arEl('face-accessory-canvas');
    if (!video || !canvas || !stream) {
        clearFaceAccessoryCanvas();
        faceAccessoryAnimationFrame = null;
        return;
    }

    try {
        if (resizeFaceAccessoryCanvas(video, canvas)) {
            const ctx = canvas.getContext('2d');
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (selectedFaceAccessory !== 'none') {
                if (video.currentTime !== latestFaceAccessoryVideoTime) {
                    latestFaceAccessoryLandmarks = detectFaceAccessoryLandmarks(video);
                    latestFaceAccessoryVideoTime = video.currentTime;
                }
                drawFaceAccessoryForCameraView(ctx, latestFaceAccessoryLandmarks, canvas.width, canvas.height);
            }
        }
    } catch (error) {
        console.error('Face accessory render error:', error);   // one bad prop must not stop the preview
    }

    faceAccessoryAnimationFrame = requestAnimationFrame(renderLiveFaceAccessory);
}

function stopFaceAccessoryPreview() {
    if (faceAccessoryAnimationFrame) {
        cancelAnimationFrame(faceAccessoryAnimationFrame);
        faceAccessoryAnimationFrame = null;
    }
    latestFaceAccessoryLandmarks = null;
    latestFaceAccessoryVideoTime = -1;
    clearFaceAccessoryCanvas();
    updateGoGreenHint(false);
}

// ---------------------------------------------------------------------------
// 7) Hand gesture stickers: open hand -> mascot, two index fingers -> bear frame, one finger -> graduation bear
// ---------------------------------------------------------------------------
const GESTURE_DELEGATE = 'CPU';   // CPU avoids clashing with the face tracker; try 'GPU' if it feels slow

const HAND_PROP = {
    enabled: true,
    src: '/assets/propsforphototaking/rp-mascot.png',
    widthHands: 1.0, holdGap: 0.45, holdMs: 300, graceMs: 400, followMs: 90
};
const PARADE_PROP = {
    enabled: true,
    src: '/assets/propsforphototaking/rp-parade.png',
    widthHands: 0.5, maxWidth: 0.95, minWidth: 0.35, bearsAt: 0.80, minHandGap: 0.2,
    holdMs: 300, graceMs: 400, followMs: 90
};
const POINT = {
    enabled: true,
    src: '/assets/propsforphototaking/rp-bear-pointe.png',
    widthHands: 1.7, gap: 0.25, holdMs: 300, graceMs: 400, followMs: 90
};
const HAND_SHAPE = { minScore: 0.6, straightJoint: 1.08, straightKnuckle: 1.6, curledKnuckle: 1.45 };

let gestureRecognizer = null;
let gestureRecognizerLoadPromise = null;
let lastGestureTimestamp = 0;
let handGestureFrame = null;
let lastGestureCheckTime = 0;

function createPropState(config) {
    const image = new Image();
    image.src = config.src;
    return {
        config, image,
        active: false, openSince: null, lostSince: null,
        popStart: 0, hideStart: 0, lastScale: 0,
        x: 0, y: 0, size: 0,
        targetX: 0, targetY: 0, targetSize: 0,
        lastMoveTime: 0, hasPosition: false
    };
}
const mascotState = createPropState(HAND_PROP);
const paradeState = createPropState(PARADE_PROP);
const pointerState = createPropState(POINT);
const allPropStates = [mascotState, paradeState, pointerState];

function setGestureDebug(text) {
    const el = arEl('gesture-debug');
    if (el && el.textContent !== text) el.textContent = text;
}
function setGestureHint(text, state) {
    const el = arEl('gesture-hint');
    if (!el) return;
    el.textContent = text;
    el.dataset.state = state || '';
}
function refreshGestureBadge() {
    const badge = arEl('gesture-indicator');
    if (!badge) return;
    if (paradeState.active) {
        badge.textContent = '\u261D\uFE0F RP pose detected!';
        badge.classList.add('show');
    } else if (mascotState.active) {
        badge.textContent = '\uD83D\uDD90\uFE0F Open hand detected!';
        badge.classList.add('show');
    } else {
        badge.classList.remove('show');
    }
}

async function ensureGestureRecognizerReady() {
    if (gestureRecognizer) return gestureRecognizer;
    if (gestureRecognizerLoadPromise) return gestureRecognizerLoadPromise;

    gestureRecognizerLoadPromise = import(AR_MEDIAPIPE_URL)
        .then(async ({ GestureRecognizer, FilesetResolver }) => {
            const vision = await FilesetResolver.forVisionTasks(AR_WASM_URL);
            const options = (delegate) => ({
                baseOptions: { modelAssetPath: GESTURE_RECOGNIZER_MODEL_URL, delegate },
                runningMode: 'VIDEO',
                numHands: 2
            });
            const other = GESTURE_DELEGATE === 'CPU' ? 'GPU' : 'CPU';
            try {
                gestureRecognizer = await GestureRecognizer.createFromOptions(vision, options(GESTURE_DELEGATE));
            } catch (firstError) {
                console.warn('Gesture ' + GESTURE_DELEGATE + ' delegate failed, trying ' + other + ':', firstError);
                gestureRecognizer = await GestureRecognizer.createFromOptions(vision, options(other));
            }
            setGestureHint('\uD83D\uDD90\uFE0F Open palm  \u00B7  \u261D\uFE0F One finger  \u00B7  \u261D\uFE0F\u261D\uFE0F Two fingers  \u00B7  \uD83D\uDE09 Wink', 'ready');
            return gestureRecognizer;
        })
        .catch((error) => {
            console.error('Failed to load Gesture Recognizer:', error);
            setGestureHint('Hand gestures unavailable - pick a prop from the tray instead.', 'error');
            throw error;
        })
        .finally(() => { gestureRecognizerLoadPromise = null; });

    return gestureRecognizerLoadPromise;
}

function fingerTipRatios(landmarks, videoWidth, videoHeight, knuckle, joint, tip) {
    const dist = (p, q) => Math.hypot((p.x - q.x) * videoWidth, (p.y - q.y) * videoHeight);
    const wrist = landmarks[0];
    const tipFar = dist(landmarks[tip], wrist);
    return {
        overJoint: tipFar / dist(landmarks[joint], wrist),
        overKnuckle: tipFar / dist(landmarks[knuckle], wrist)
    };
}
const FINGERS = { index: [5, 6, 8], middle: [9, 10, 12], ring: [13, 14, 16], pinky: [17, 18, 20] };

function isFingerStraight(landmarks, w, h, finger) {
    const [knuckle, joint, tip] = FINGERS[finger];
    const r = fingerTipRatios(landmarks, w, h, knuckle, joint, tip);
    return r.overJoint > HAND_SHAPE.straightJoint && r.overKnuckle > HAND_SHAPE.straightKnuckle;
}
function isFingerCurled(landmarks, w, h, finger) {
    const [knuckle, joint, tip] = FINGERS[finger];
    return fingerTipRatios(landmarks, w, h, knuckle, joint, tip).overKnuckle < HAND_SHAPE.curledKnuckle;
}
function isOpenHand(landmarks, w, h) {
    return ['index', 'middle', 'ring', 'pinky'].every((f) => isFingerStraight(landmarks, w, h, f));
}
function isPointingHand(landmarks, w, h) {
    return isFingerStraight(landmarks, w, h, 'index') &&
        ['middle', 'ring', 'pinky'].every((f) => isFingerCurled(landmarks, w, h, f));
}
function getHandCenter(landmarks, w, h) {
    const ids = [0, 5, 9, 13, 17];
    return {
        x: ids.reduce((sum, id) => sum + landmarks[id].x, 0) / ids.length * w,
        y: ids.reduce((sum, id) => sum + landmarks[id].y, 0) / ids.length * h,
        size: Math.hypot((landmarks[9].x - landmarks[0].x) * w, (landmarks[9].y - landmarks[0].y) * h)
    };
}

function trackProp(state, target, now) {
    const cfg = state.config;
    if (target && cfg.enabled) {
        state.lostSince = null;
        if (state.openSince === null) state.openSince = now;
        state.targetX = target.x;
        state.targetY = target.y;
        state.targetSize = target.size;
        if (!state.hasPosition) {
            state.x = target.x; state.y = target.y; state.size = target.size;
            state.hasPosition = true;
            state.lastMoveTime = now;
        }
        if (!state.active && now - state.openSince >= cfg.holdMs) {
            state.active = true;
            state.popStart = now;
        }
    } else {
        state.openSince = null;
        if (state.active) {
            if (state.lostSince === null) state.lostSince = now;
            if (now - state.lostSince > cfg.graceMs) {
                state.active = false;
                state.hideStart = now;
                state.hasPosition = false;
            }
        }
    }
}

function resetGestureProps() {
    allPropStates.forEach((state) => {
        state.active = false;
        state.openSince = null;
        state.lostSince = null;
        state.hasPosition = false;
        state.lastScale = 0;
    });
    refreshGestureBadge();
}

// the three wrappers below all hook this one function (order: base -> pointer -> hands tap -> peace)
function handleGestureResult(result, videoWidth, videoHeight, now) {
    const hands = (result && result.landmarks) ? result.landmarks : [];
    const labels = [];
    let openTarget = null;
    const pointingHands = [];

    hands.forEach((landmarks, i) => {
        const category = result.gestures && result.gestures[i] ? result.gestures[i][0] : null;
        const sure = category && category.score >= HAND_SHAPE.minScore ? category.categoryName : null;
        const open = isOpenHand(landmarks, videoWidth, videoHeight) || sure === 'Open_Palm';
        const pointing = !open && (isPointingHand(landmarks, videoWidth, videoHeight) || sure === 'Pointing_Up');

        labels.push((category ? category.categoryName + ' ' + Math.round(category.score * 100) + '%' : 'hand') +
            (open ? ' + open hand' : '') + (pointing ? ' + pointing' : ''));

        if (open && !openTarget) openTarget = getHandCenter(landmarks, videoWidth, videoHeight);
        if (pointing) pointingHands.push(getHandCenter(landmarks, videoWidth, videoHeight));
    });
    setGestureDebug('Camera sees: ' + (labels.length ? labels.join('  |  ') : 'no hand'));

    let paradeTarget = null;
    if (pointingHands.length >= 2) {
        pointingHands.sort((a, b) => a.x - b.x);
        const left = pointingHands[0], right = pointingHands[pointingHands.length - 1];
        const gap = right.x - left.x;
        if (gap >= videoWidth * PARADE_PROP.minHandGap) {
            paradeTarget = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2, size: gap };
        }
    }

    trackProp(mascotState, openTarget, now);
    trackProp(paradeState, paradeTarget, now);
    refreshGestureBadge();
}

// ONE finger up -> graduation bear (two fingers = bear frame instead, so they never clash)
const handleGestureResultWithoutPointer = handleGestureResult;
handleGestureResult = function (result, videoWidth, videoHeight, now) {
    handleGestureResultWithoutPointer(result, videoWidth, videoHeight, now);

    const hands = (result && result.landmarks) ? result.landmarks : [];
    const pointing = [];
    hands.forEach((landmarks, i) => {
        const category = result.gestures && result.gestures[i] ? result.gestures[i][0] : null;
        const sure = category && category.score >= HAND_SHAPE.minScore ? category.categoryName : null;
        const open = isOpenHand(landmarks, videoWidth, videoHeight) || sure === 'Open_Palm';
        const isPointing = !open && (isPointingHand(landmarks, videoWidth, videoHeight) || sure === 'Pointing_Up');
        if (isPointing) {
            const c = getHandCenter(landmarks, videoWidth, videoHeight);
            pointing.push({ x: landmarks[8].x * videoWidth, y: landmarks[8].y * videoHeight, size: c.size });
        }
    });

    const allowed = POINT.enabled && HAND_PROP.enabled && !paradeState.active;
    trackProp(pointerState, (allowed && pointing.length === 1) ? pointing[0] : null, now);
};

// hands for the occlusion mask
const handleGestureResultWithoutHandsTap = handleGestureResult;
handleGestureResult = function (result, videoWidth, videoHeight, now) {
    HANDS.landmarks = (result && result.landmarks) ? result.landmarks : [];
    HANDS.time = now;
    HANDS.id++;
    handleGestureResultWithoutHandsTap(result, videoWidth, videoHeight, now);
};

function updatePropPosition(state, now) {
    if (!state.hasPosition) return;
    const dt = Math.min(100, now - state.lastMoveTime);
    state.lastMoveTime = now;
    const k = 1 - Math.exp(-dt / state.config.followMs);
    state.x += (state.targetX - state.x) * k;
    state.y += (state.targetY - state.y) * k;
    state.size += (state.targetSize - state.size) * k;
}

function easeOutBack(t) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function getPropAnimation(state, now) {
    if (state.active) {
        const scale = easeOutBack(Math.min(1, (now - state.popStart) / 450));
        state.lastScale = scale;
        return { scale, alpha: 1 };
    }
    const t = (now - state.hideStart) / 250;
    if (t >= 1 || state.lastScale <= 0) return null;
    return { scale: state.lastScale * (1 - t * 0.4), alpha: 1 - t };
}

function isImageReady(image) { return !!image && image.complete && image.naturalWidth > 0; }

function paintSticker(ctx, image, centerX, centerY, width, height, animation) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, animation.alpha);
    ctx.translate(centerX, centerY);
    ctx.scale(animation.scale, animation.scale);
    if (isMirrored) ctx.scale(-1, 1);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = height * 0.04;
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.restore();
}

function drawMascot(ctx, now) {
    const s = mascotState;
    if (!HAND_PROP.enabled || !isImageReady(s.image) || !s.size) return;
    const animation = getPropAnimation(s, now);
    if (!animation) return;

    const width = s.size * HAND_PROP.widthHands;
    const height = width * (s.image.naturalHeight / s.image.naturalWidth);
    const bob = Math.sin(now / 420) * s.size * 0.12;
    const x = Math.min(Math.max(s.x, width / 2), ctx.canvas.width - width / 2);
    let y = s.y - s.size * HAND_PROP.holdGap - height / 2 + bob;
    y = Math.max(y, height / 2);
    paintSticker(ctx, s.image, x, y, width, height, animation);
}

function drawParade(ctx, now) {
    const s = paradeState;
    if (!PARADE_PROP.enabled || !isImageReady(s.image) || !s.size) return;
    const animation = getPropAnimation(s, now);
    if (!animation) return;

    const canvasWidth = ctx.canvas.width;
    let width = s.size * PARADE_PROP.widthHands;
    width = Math.min(Math.max(width, canvasWidth * PARADE_PROP.minWidth), canvasWidth * PARADE_PROP.maxWidth);
    const height = width * (s.image.naturalHeight / s.image.naturalWidth);
    const bob = Math.sin(now / 520) * height * 0.012;
    const x = Math.min(Math.max(s.x, width / 2), canvasWidth - width / 2);
    let top = s.y - PARADE_PROP.bearsAt * height + bob;
    top = Math.max(top, 0);
    paintSticker(ctx, s.image, x, top + height / 2, width, height, animation);
}

function drawPointerSticker(ctx, now) {
    const s = pointerState;
    if (!POINT.enabled || !HAND_PROP.enabled || !isImageReady(s.image) || !s.size) return;
    const animation = getPropAnimation(s, now);
    if (!animation) return;

    const width = s.size * POINT.widthHands;
    const height = width * (s.image.naturalHeight / s.image.naturalWidth);
    const bob = Math.sin(now / 420) * s.size * 0.1;
    const x = Math.min(Math.max(s.x, width / 2), ctx.canvas.width - width / 2);
    let y = s.y - s.size * POINT.gap - height / 2 + bob;
    y = Math.max(y, height / 2);
    paintSticker(ctx, s.image, x, y, width, height, animation);
}

function drawHandGestureProps(ctx, now) {
    drawParade(ctx, now);    // big sticker first, so the mascot is never hidden behind it
    drawMascot(ctx, now);
    drawPointerSticker(ctx, now);
}

function handGestureLoop() {
    try { handGestureStep(); } catch (error) { console.error('Hand gesture step failed (loop keeps running):', error); }
    handGestureFrame = requestAnimationFrame(handGestureLoop);
}

function handGestureStep() {
    const video = arEl('video');
    const now = performance.now();
    const showing = video && stream && arPhotoPageActive() && video.readyState >= 2;

    if (showing) {
        const canvas = arEnsureOverlayCanvas('hand-gesture-canvas');
        if (!canvas) return;

        if (gestureRecognizer && now - lastGestureCheckTime > 50) {   // ~20 checks per second
            lastGestureCheckTime = now;
            try {
                const timestamp = Math.max(Math.floor(now), lastGestureTimestamp + 1);   // MediaPipe needs increasing timestamps
                lastGestureTimestamp = timestamp;
                const result = gestureRecognizer.recognizeForVideo(video, timestamp);
                handleGestureResult(result, video.videoWidth, video.videoHeight, now);
            } catch (error) {
                console.warn('Gesture check skipped:', error.message);
            }
        }

        if (resizeFaceAccessoryCanvas(video, canvas)) {
            const ctx = canvas.getContext('2d');
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (isMirrored) {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
            }
            allPropStates.forEach((state) => updatePropPosition(state, now));
            drawHandGestureProps(ctx, now);
        }
    } else {
        const canvas = arEl('hand-gesture-canvas');
        if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        resetGestureProps();
    }
}

function startHandGestureProps() {
    if (handGestureFrame) return;
    setGestureHint('Loading hand gestures...', 'loading');
    ensureGestureRecognizerReady().catch(() => { });
    handGestureLoop();
}

// ---------------------------------------------------------------------------
// 8) Wink -> RP heart sticker beside the winking eye
// ---------------------------------------------------------------------------
const WINK = {
    enabled: true,
    src: '/assets/propsforphototaking/rp-heart.png',
    stickerMs: 3000, widthEyes: 0.35, sideGap: 0.45, lift: 0.8,
    holdMs: 150, cooldownMs: 1000,
    eyeClosedMax: 0.17, eyeOpenMin: 0.21, ratioMax: 0.6
};
const winkState = {
    started: false, landmarkerRequested: false, frame: null, lastCheckTime: 0,
    geometry: null, eyes: null, winkSince: null, latched: false,
    lastTriggerTime: -99999, sticker: null
};
const winkImage = new Image();
winkImage.src = WINK.src;

function setWinkDebug(text) {
    const el = arEl('wink-debug');
    if (el && el.textContent !== text) el.textContent = text;
}

// ONE face detection per video frame, shared by every loop (two calls in one millisecond would crash MediaPipe)
const detectFaceLandmarksOnce = detectFaceAccessoryLandmarks;
let winkLandmarkCache = { time: -1, result: null };
detectFaceAccessoryLandmarks = function (video) {
    if (video && video.currentTime === winkLandmarkCache.time) return winkLandmarkCache.result;
    const result = detectFaceLandmarksOnce(video);
    winkLandmarkCache = { time: video ? video.currentTime : -1, result };
    return result;
};

function eyeAspectRatio(landmarks, w, h, ids) {
    const p = ids.map((id) => ({ x: landmarks[id].x * w, y: landmarks[id].y * h }));
    const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    return (d(p[1], p[5]) + d(p[2], p[4])) / (2 * d(p[0], p[3]));
}
const RIGHT_EYE_POINTS = [33, 160, 158, 133, 153, 144];
const LEFT_EYE_POINTS = [362, 385, 387, 263, 373, 380];

function isWinking(earLeft, earRight) {
    const closed = Math.min(earLeft, earRight);
    const open = Math.max(earLeft, earRight);
    return closed < WINK.eyeClosedMax && open > WINK.eyeOpenMin && closed / open < WINK.ratioMax;
}
function getEyeCenter(landmarks, w, h, ids) {
    const a = landmarks[ids[0]], b = landmarks[ids[3]];
    return { x: (a.x + b.x) / 2 * w, y: (a.y + b.y) / 2 * h };
}

function checkFaceForWink(landmarks, w, h, now) {
    if (!landmarks) {
        winkState.winkSince = null;
        winkState.latched = false;
        setWinkDebug('Wink check: no face found');
        return;
    }
    winkState.geometry = getFaceAccessoryGeometry(landmarks, w, h);
    winkState.eyes = {
        right: getEyeCenter(landmarks, w, h, RIGHT_EYE_POINTS),
        left: getEyeCenter(landmarks, w, h, LEFT_EYE_POINTS)
    };

    const earLeft = eyeAspectRatio(landmarks, w, h, LEFT_EYE_POINTS);
    const earRight = eyeAspectRatio(landmarks, w, h, RIGHT_EYE_POINTS);
    const winking = isWinking(earLeft, earRight);
    setWinkDebug('Eyes: left ' + earLeft.toFixed(2) + ' | right ' + earRight.toFixed(2) + (winking ? '  \uD83D\uDE09 wink!' : ''));

    if (!winking) {
        winkState.winkSince = null;
        winkState.latched = false;
        return;
    }
    if (winkState.winkSince === null) winkState.winkSince = now;
    if (!winkState.latched &&
        now - winkState.winkSince >= WINK.holdMs &&
        now - winkState.lastTriggerTime >= WINK.cooldownMs) {
        winkState.latched = true;
        winkState.lastTriggerTime = now;
        if (WINK.enabled) {
            winkState.sticker = { eye: earLeft < earRight ? 'left' : 'right', start: now };
        }
    }
}

function drawWinkSticker(ctx, now) {
    const sticker = winkState.sticker;
    const g = winkState.geometry;
    const eyes = winkState.eyes;
    if (!WINK.enabled || !sticker || !g || !eyes) return;
    if (!winkImage.complete || !winkImage.naturalWidth) return;

    const age = now - sticker.start;
    if (age < 0 || age > WINK.stickerMs) return;
    const pop = easeOutBack(Math.min(1, age / 450));
    const fade = age > WINK.stickerMs - 400 ? (WINK.stickerMs - age) / 400 : 1;

    const eye = sticker.eye === 'left' ? eyes.left : eyes.right;
    const outward = sticker.eye === 'left' ? 1 : -1;
    const sideX = Math.cos(g.angle), sideY = Math.sin(g.angle);
    const upX = Math.sin(g.angle), upY = -Math.cos(g.angle);

    const width = g.eyeDistance * WINK.widthEyes;
    const height = width * (winkImage.naturalHeight / winkImage.naturalWidth);
    const bob = Math.sin(age / 380) * g.eyeDistance * 0.05;

    let x = eye.x + outward * sideX * g.eyeDistance * WINK.sideGap + upX * g.eyeDistance * WINK.lift;
    let y = eye.y + outward * sideY * g.eyeDistance * WINK.sideGap + upY * g.eyeDistance * WINK.lift + bob;
    x = Math.min(Math.max(x, width / 2), ctx.canvas.width - width / 2);
    y = Math.min(Math.max(y, height / 2), ctx.canvas.height - height / 2);

    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    ctx.translate(x, y);
    ctx.rotate(g.angle * 0.5 + Math.sin(age / 450) * 0.05 - 0.25);
    ctx.scale(pop, pop);
    if (isMirrored) ctx.scale(-1, 1);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = height * 0.04;
    ctx.drawImage(winkImage, -width / 2, -height / 2, width, height);
    ctx.restore();
}

function winkLoop() {
    try { winkStep(); } catch (error) { console.error('Wink step failed (loop keeps running):', error); }
    winkState.frame = requestAnimationFrame(winkLoop);
}

function winkStep() {
    const video = arEl('video');
    const now = performance.now();
    if (!video) return;

    const pageShowing = stream && arPhotoPageActive() && video.readyState >= 2;
    if (!pageShowing) {
        const canvas = arEl('wink-canvas');
        if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        winkState.sticker = null;
        winkState.winkSince = null;
        winkState.latched = false;
        return;
    }
    const canvas = arEnsureOverlayCanvas('wink-canvas');
    if (!canvas) return;

    if (!faceLandmarker) {
        if (!winkState.landmarkerRequested) {
            winkState.landmarkerRequested = true;
            ensureFaceLandmarkerReady().catch(() => {
                winkState.landmarkerRequested = false;
                setGestureHint('Wink stickers unavailable - pick a prop from the tray instead.', 'error');
            });
        }
    } else if (now - winkState.lastCheckTime > 40) {      // ~25 checks per second
        winkState.lastCheckTime = now;
        const landmarks = detectFaceAccessoryLandmarks(video);
        checkFaceForWink(landmarks, video.videoWidth, video.videoHeight, now);
    }

    if (resizeFaceAccessoryCanvas(video, canvas)) {
        const ctx = canvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (isMirrored) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }
        drawWinkSticker(ctx, now);
    }
}

function startWinkProps() {
    if (winkState.started) return;
    winkState.started = true;
    winkLoop();
}

// ---------------------------------------------------------------------------
// 9) Reactions: smile -> sparkles, open mouth -> confetti (visitor opt-in)
// ---------------------------------------------------------------------------
const REACT = {
    enabled: false,
    smileMin: 0.55, smileHoldMs: 200, sparkleEveryMs: 110,
    jawMin: 0.5, jawHoldMs: 150, popCooldownMs: 1500, maxParticles: 160
};
const reactState = {
    particles: [], blend: {}, blendOn: false,
    smileSince: null, jawSince: null, jawLatched: false,
    lastSparkle: 0, lastPop: -99999, lastFrame: 0
};

// expression scores (blendshapes) ride along with every landmark result
const getLandmarksWithoutBlend = getFaceAccessoryLandmarksFromResult;
getFaceAccessoryLandmarksFromResult = function (result) {
    const cats = result && result.faceBlendshapes && result.faceBlendshapes[0]
        ? result.faceBlendshapes[0].categories : null;
    const scores = {};
    if (cats) cats.forEach((c) => { scores[c.categoryName] = c.score; });
    reactState.blend = scores;
    return getLandmarksWithoutBlend(result);
};

function spawnSparkle(g) {
    const a = Math.random() * Math.PI * 2;
    const spread = 0.8 + Math.random() * 0.5;
    reactState.particles.push({
        type: 'sparkle',
        x: g.noseTip.x + Math.cos(a) * g.eyeDistance * 1.0 * spread,
        y: g.noseTip.y - g.eyeDistance * 0.2 + Math.sin(a) * g.faceHeight * 0.6 * spread,
        vx: 0, vy: -g.eyeDistance * 0.25, grav: 0,
        age: 0, life: 900,
        size: g.eyeDistance * (0.07 + Math.random() * 0.07),
        rot: 0, vr: 0,
        color: ['#facc15', '#ffffff', '#f9a8d4'][Math.floor(Math.random() * 3)]
    });
}

function spawnConfetti(g) {
    const colors = ['#16a34a', '#facc15', '#60a5fa', '#f472b6', '#ffffff'];
    for (let i = 0; i < 28; i++) {
        const dir = -Math.PI / 2 + (Math.random() - 0.5) * 2;
        const speed = g.eyeDistance * (2 + Math.random() * 2.5);
        reactState.particles.push({
            type: 'confetti',
            x: g.upperLip.x, y: g.upperLip.y,
            vx: Math.cos(dir) * speed, vy: Math.sin(dir) * speed,
            grav: g.eyeDistance * 5,
            age: 0, life: 1400,
            size: g.eyeDistance * (0.05 + Math.random() * 0.04),
            rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }
}

function updateParticles(dtMs) {
    const dt = dtMs / 1000;
    const list = reactState.particles;
    for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.age += dtMs;
        if (p.age >= p.life) { list.splice(i, 1); continue; }
        p.vy += p.grav * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
    }
    if (list.length > REACT.maxParticles) list.splice(0, list.length - REACT.maxParticles);
}

function drawReactions(ctx) {
    reactState.particles.forEach((p) => {
        const t = p.age / p.life;
        const alpha = t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.4);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.type === 'sparkle') {
            const s = p.size * (0.7 + Math.sin(p.age / 90) * 0.3);
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const r = i % 2 === 0 ? s : s * 0.3;
                const a = (Math.PI * i) / 4;
                if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
                else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
    });
}

function setBlendshapesOn(stateObj) {
    if (faceLandmarker && !stateObj.blendOn) {
        stateObj.blendOn = true;
        try {
            const p = faceLandmarker.setOptions({ outputFaceBlendshapes: true });
            if (p && p.catch) p.catch((e) => console.warn('Blendshapes not enabled:', e));
        } catch (e) {
            console.warn('Blendshapes not enabled:', e);
        }
    }
}

function reactStep(now) {
    const video = arEl('video');
    if (!video) return;

    const dtMs = Math.min(50, reactState.lastFrame ? now - reactState.lastFrame : 16);
    reactState.lastFrame = now;
    const showing = stream && arPhotoPageActive() && video.readyState >= 2;

    if (!showing || !REACT.enabled) {
        reactState.particles.length = 0;
        reactState.smileSince = null;
        reactState.jawSince = null;
        reactState.jawLatched = false;
        const old = arEl('reaction-canvas');
        if (old) old.getContext('2d').clearRect(0, 0, old.width, old.height);
        return;
    }
    const canvas = arEnsureOverlayCanvas('reaction-canvas');
    if (!canvas) return;

    setBlendshapesOn(reactState);

    const b = reactState.blend;
    const g = winkState.geometry;
    const smile = ((b.mouthSmileLeft || 0) + (b.mouthSmileRight || 0)) / 2;
    const jaw = b.jawOpen || 0;

    if (g) {
        if (smile >= REACT.smileMin) {
            if (reactState.smileSince === null) reactState.smileSince = now;
            if (now - reactState.smileSince >= REACT.smileHoldMs && now - reactState.lastSparkle >= REACT.sparkleEveryMs) {
                reactState.lastSparkle = now;
                spawnSparkle(g);
            }
        } else {
            reactState.smileSince = null;
        }

        if (jaw >= REACT.jawMin) {
            if (reactState.jawSince === null) reactState.jawSince = now;
            if (!reactState.jawLatched && now - reactState.jawSince >= REACT.jawHoldMs && now - reactState.lastPop >= REACT.popCooldownMs) {
                reactState.jawLatched = true;
                reactState.lastPop = now;
                spawnConfetti(g);
            }
        } else {
            reactState.jawSince = null;
            reactState.jawLatched = false;
        }
    }

    updateParticles(dtMs);

    if (resizeFaceAccessoryCanvas(video, canvas)) {
        const ctx = canvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (isMirrored) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }
        drawReactions(ctx);
    }
}

function reactLoop(now) {
    try { reactStep(now); } catch (error) { console.error('Reaction step failed (loop keeps running):', error); }
    requestAnimationFrame(reactLoop);
}

// ---------------------------------------------------------------------------
// 10) Smile capture + Peace-sign capture
//     (they use feedback.js's own capture: photo or boomerang, with its own countdown)
// ---------------------------------------------------------------------------
const AUTO = { captureEnabled: false, smileMin: 0.6, smileHoldMs: 800, rearmMs: 700, cooldownMs: 2500 };
const autoState = { hint: null, flash: null, blendOn: false, armed: false, busy: false, smileSince: null, neutralSince: null, lastCapture: -99999 };

const PEACE = { enabled: false, minScore: 0.7, holdMs: 600, rearmMs: 800, cooldownMs: 2000 };
const peaceState = { hint: null, armed: false, holdSince: null, neutralSince: null, lastTrigger: -99999 };

function arCaptureBusy() {
    const btn = arEl('capture-btn');
    return !btn || btn.disabled;   // feedback.js disables the button during countdown / capture
}

function setAutoHint(text) {
    const el = autoState.hint;
    if (!el) return;
    if (!text) { el.style.opacity = '0'; return; }
    if (el.textContent !== text) el.textContent = text;
    el.style.opacity = '1';
}
function setPeaceHint(text) {
    const el = peaceState.hint;
    if (!el) return;
    if (!text) { el.style.opacity = '0'; return; }
    if (el.textContent !== text) el.textContent = text;
    el.style.opacity = '1';
}
function flashCameraView() {
    const f = autoState.flash;
    if (!f) return;
    f.style.transition = 'none';
    f.style.opacity = '0.85';
    requestAnimationFrame(() => {
        f.style.transition = 'opacity 0.35s ease-out';
        f.style.opacity = '0';
    });
}

// smile = capture right now (no countdown), in whichever mode (photo / boomerang) is selected
function triggerSmileCapture() {
    const btn = arEl('capture-btn');
    if (autoState.busy || arCaptureBusy()) return;
    autoState.busy = true;
    btn.disabled = true;
    flashCameraView();
    const run = captureMode === 'boomerang'
        ? captureBoomerangIfFaceDetected()
        : (photoStripEnabled ? captureStripIfFaceDetected() : capturePhotoIfFaceDetected());
    Promise.resolve(run)
        .catch((e) => console.error('Auto capture failed:', e))
        .finally(() => { autoState.busy = false; btn.disabled = false; });
}

function autoStep(now) {
    const video = arEl('video');
    if (!video) return;
    const showing = stream && arPhotoPageActive() && video.readyState >= 2;

    if (!showing || !AUTO.captureEnabled) {
        autoState.smileSince = null;
        autoState.neutralSince = null;
        autoState.armed = false;     // after a retake, wait for a neutral face before arming again
        setAutoHint('');
        return;
    }

    setBlendshapesOn(autoState);

    const b = reactState.blend || {};
    const hasFace = Object.keys(b).length > 0;
    const smile = ((b.mouthSmileLeft || 0) + (b.mouthSmileRight || 0)) / 2;

    let hintText = '';
    if (hasFace && !autoState.busy && !arCaptureBusy()) {
        if (!autoState.armed) {
            if (smile < AUTO.smileMin * 0.6) {
                if (autoState.neutralSince === null) autoState.neutralSince = now;
                if (now - autoState.neutralSince >= AUTO.rearmMs) autoState.armed = true;
            } else {
                autoState.neutralSince = null;
            }
            hintText = 'Relax your face for a moment...';
        } else if (smile >= AUTO.smileMin) {
            if (autoState.smileSince === null) autoState.smileSince = now;
            const held = now - autoState.smileSince;
            hintText = '\uD83D\uDE0A Hold that smile...';
            if (held >= AUTO.smileHoldMs && now - autoState.lastCapture >= AUTO.cooldownMs) {
                autoState.armed = false;
                autoState.neutralSince = null;
                autoState.smileSince = null;
                autoState.lastCapture = now;
                triggerSmileCapture();
                hintText = '';
            }
        } else {
            autoState.smileSince = null;
            hintText = '\uD83D\uDE0A Smile to take a photo';
        }
    } else if (!hasFace) {
        autoState.smileSince = null;
    }
    setAutoHint(hintText);
}

function autoLoop(now) {
    try { autoStep(now); } catch (error) { console.error('Smile capture step failed (loop keeps running):', error); }
    requestAnimationFrame(autoLoop);
}

// peace sign (MediaPipe gesture "Victory") -> presses feedback.js's own capture button logic (with its countdown)
const handleGestureResultWithoutPeace = handleGestureResult;
handleGestureResult = function (result, videoWidth, videoHeight, now) {
    handleGestureResultWithoutPeace(result, videoWidth, videoHeight, now);
    peaceStep(result, now);
};

function peaceStep(result, now) {
    const s = peaceState;
    if (!PEACE.enabled || arCaptureBusy()) {
        s.armed = false;
        s.holdSince = null;
        s.neutralSince = null;
        setPeaceHint('');
        return;
    }

    const lists = (result && result.gestures) ? result.gestures : [];
    const peace = lists.some((list) => list[0] && list[0].categoryName === 'Victory' && list[0].score >= PEACE.minScore);

    if (!s.armed) {
        if (!peace) {
            if (s.neutralSince === null) s.neutralSince = now;
            if (now - s.neutralSince >= PEACE.rearmMs) s.armed = true;
            setPeaceHint('\u270C\uFE0F Show a peace sign to take a photo');
        } else {
            s.neutralSince = null;
            setPeaceHint('Lower your hand for a moment...');
        }
        return;
    }

    if (peace) {
        if (s.holdSince === null) s.holdSince = now;
        if (now - s.holdSince >= PEACE.holdMs && now - s.lastTrigger >= PEACE.cooldownMs) {
            s.armed = false;
            s.neutralSince = null;
            s.holdSince = null;
            s.lastTrigger = now;
            setPeaceHint('');
            capturePhoto().catch((e) => console.error('Peace capture failed:', e));
        } else {
            setPeaceHint('\u270C\uFE0F Hold it...');
        }
    } else {
        s.holdSince = null;
        setPeaceHint('\u270C\uFE0F Show a peace sign to take a photo');
    }
}

// ---------------------------------------------------------------------------
// 11) Buttons, dropdown, hint pills (all built from JS - no HTML edits)
// ---------------------------------------------------------------------------
const arControls = { refresh: () => { } };

function arBuildControls() {
    const row = arEffectsRow();
    if (!row || row.dataset.built) return;
    row.dataset.built = '1';

    const mk = (title) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'toggle';
        b.title = title;
        row.appendChild(b);
        return b;
    };
    const fxBtn = mk('Hand gestures and wink stickers on/off');
    const reactBtn = mk('Smile and open-mouth reactions on/off');
    const smileBtn = mk('Hold a smile to take the photo automatically');
    const countdownBtn = mk('Countdown before the photo on/off');
    const peaceBtn = mk('Hold a peace sign to take the photo');
    const stripBtn = mk('Take 4 photos and combine them into one strip');

    arControls.refresh = () => {
        fxBtn.textContent = '\u2728 Effects';
        reactBtn.textContent = '\uD83D\uDE04 Reactions';
        smileBtn.textContent = '\uD83D\uDE0A Smile capture';
        countdownBtn.textContent = '\u23F1\uFE0F Countdown';
        peaceBtn.textContent = '\u270C\uFE0F Peace capture';
        stripBtn.textContent = '\uD83C\uDF9E\uFE0F Photo strip';
        fxBtn.setAttribute('aria-pressed', String(!!WINK.enabled));
        reactBtn.setAttribute('aria-pressed', String(!!REACT.enabled));
        smileBtn.setAttribute('aria-pressed', String(!!AUTO.captureEnabled));
        countdownBtn.setAttribute('aria-pressed', String(!!visitorCountdownEnabled));
        peaceBtn.setAttribute('aria-pressed', String(!!PEACE.enabled));
        stripBtn.setAttribute('aria-pressed', String(!!photoStripEnabled));
    };

    fxBtn.addEventListener('click', () => {
        const on = !WINK.enabled;
        WINK.enabled = HAND_PROP.enabled = PARADE_PROP.enabled = POINT.enabled = on;
        if (!on) { winkState.sticker = null; resetGestureProps(); }
        arControls.refresh();
    });
    reactBtn.addEventListener('click', () => {
        REACT.enabled = !REACT.enabled;
        if (!REACT.enabled) reactState.particles.length = 0;
        arControls.refresh();
    });
    smileBtn.addEventListener('click', () => {
        AUTO.captureEnabled = !AUTO.captureEnabled;
        autoState.armed = false;
        autoState.neutralSince = null;
        autoState.smileSince = null;
        arControls.refresh();
    });
    countdownBtn.addEventListener('click', () => {
        visitorCountdownEnabled = !visitorCountdownEnabled;
        arControls.refresh();
    });
    peaceBtn.addEventListener('click', () => {
        PEACE.enabled = !PEACE.enabled;
        peaceState.armed = false;
        peaceState.holdSince = null;
        peaceState.neutralSince = null;
        if (!PEACE.enabled) setPeaceHint('');
        arControls.refresh();
    });
    stripBtn.addEventListener('click', () => {
        photoStripEnabled = !photoStripEnabled;
        arControls.refresh();
    });

    // Background select already exists in feedback.html (inside the Beauty/Background card)
    const select = arEl('bg-select');
    if (select && !select.dataset.bound) {
        select.dataset.bound = '1';
        select.addEventListener('change', async () => {
            FX.bg = select.value;
            resetInactivityTimer();
            if (FX.bg === 'none') return;
            updateFaceDetectionStatus('Loading background effect...', 'loading');
            const seg = await ensureSegmenter();
            if (seg) {
                updateFaceDetectionStatus('Face detection ready.', 'success');
            } else {
                FX.bg = 'none';
                select.value = 'none';
                updateFaceDetectionStatus('Background effect unavailable. Photo capture still works.', 'error');
            }
        });
    }

    arControls.refresh();
}

function arBuildOverlays() {
    const view = arCameraView();
    if (!view || autoState.hint) return;
    arEnsureRelative(view);

    const makePill = (css) => {
        const el = document.createElement('div');
        el.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);padding:10px 18px;border-radius:999px;' +
            'background:rgba(0,0,0,0.65);color:#fff;font:700 18px Arial,sans-serif;pointer-events:none;z-index:9;' +
            'white-space:nowrap;opacity:0;transition:opacity 0.25s;' + css;
        view.appendChild(el);
        return el;
    };
    autoState.hint = makePill('bottom:16px;');
    peaceState.hint = makePill('top:60px;font-size:16px;padding:8px 16px;');

    const flash = document.createElement('div');
    flash.style.cssText = 'position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:10;';
    view.appendChild(flash);
    autoState.flash = flash;
}

// ---------------------------------------------------------------------------
// 12) Photo / boomerang capture: bake the new stickers into the saved picture
//     feedback.js draws every capture frame on #photo-canvas and calls drawFaceAccessory()
// ---------------------------------------------------------------------------
const drawFaceAccessoryWithoutExtras = drawFaceAccessory;
drawFaceAccessory = function (ctx, landmarks, width, height, time) {
    drawFaceAccessoryWithoutExtras(ctx, landmarks, width, height, time);
    if (ctx.canvas.id === 'photo-canvas') {          // only the saved photo; the live view has its own canvases
        const now = performance.now();
        drawHandGestureProps(ctx, now);
        drawWinkSticker(ctx, now);
        if (REACT.enabled) drawReactions(ctx);
    }
};

// ---------------------------------------------------------------------------
// 13) Hook into feedback.js's own camera start + visitor reset
// ---------------------------------------------------------------------------
// start the hand / wink loops only once the camera really runs (so landing + mobile never load the models)
const initializeCameraBeforeAR = initializeCamera;
initializeCamera = async function () {
    await initializeCameraBeforeAR.apply(this, arguments);
    if (stream) {
        startHandGestureProps();
        startWinkProps();
    }
};

// every new visitor starts clean
function arResetForNextVisitor() {
    FX.bg = 'none';
    const select = arEl('bg-select');
    if (select) select.value = 'none';
    winkState.sticker = null;
    resetGestureProps();
    reactState.particles.length = 0;
    REACT.enabled = false;
    AUTO.captureEnabled = false;
    PEACE.enabled = false;
    WINK.enabled = HAND_PROP.enabled = PARADE_PROP.enabled = POINT.enabled = true;
    visitorCountdownEnabled = true;
    photoStripEnabled = false;
    setAutoHint('');
    setPeaceHint('');
    arControls.refresh();
}
['returnToLandingPage', 'submitAnother', 'goHomeFromFeedbackForm'].forEach((name) => {
    const original = window[name];
    if (typeof original !== 'function') return;
    window[name] = function () {
        const result = original.apply(this, arguments);
        try { arResetForNextVisitor(); } catch (error) { console.warn('AR reset failed:', error); }
        return result;
    };
});


arOnReady(() => {
    arEnsureStyles();
    arInjectFilterCards();
    arBuildControls();
    arBuildOverlays();
    requestAnimationFrame(fxLoop);
    requestAnimationFrame(reactLoop);
    requestAnimationFrame(autoLoop);
});

function stripProgressBox() {
    const view = document.getElementById('camera-container');
    if (!view) return null;
    if (getComputedStyle(view).position === 'static') view.style.position = 'relative';
    let box = document.getElementById('strip-progress');
    if (!box) {
        box = document.createElement('div');
        box.id = 'strip-progress';
        box.style.cssText = 'position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:12;' +
            'display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;';
        view.appendChild(box);
    }
    return box;
}

function renderStripProgress(current, total, thumbs) {
    const box = stripProgressBox();
    if (!box) return;
    box.style.display = 'flex';
    const slots = Array.from({ length: total }, (_, i) => thumbs[i]
        ? `<img src="${thumbs[i]}" style="width:64px;height:48px;object-fit:cover;border-radius:8px;border:2px solid #16a34a;">`
        : `<div style="width:64px;height:48px;border-radius:8px;border:2px dashed #fff;background:rgba(0,0,0,.35);color:#fff;display:flex;align-items:center;justify-content:center;font:700 16px Arial;">${i + 1}</div>`
    ).join('');
    box.innerHTML =
        `<div style="padding:8px 18px;border-radius:999px;background:rgba(0,0,0,.7);color:#fff;font:700 18px Arial;">
            Photo ${Math.min(current, total)} of ${total}</div>
         <div style="display:flex;gap:8px;">${slots}</div>`;
}

function hideStripProgress() {
    const box = document.getElementById('strip-progress');
    if (box) { box.style.display = 'none'; box.innerHTML = ''; }
}

// Same overlay and look as the normal countdown: 3 ... 2 ... 1 then resolves
function runShotCountdown(seconds) {
    const overlay = document.getElementById('countdown-overlay');
    const text = document.getElementById('countdown-text');
    if (!overlay || !text || !seconds) return wait(600);
    return new Promise((resolve) => {
        let n = seconds;
        text.textContent = n;
        overlay.style.display = 'flex';
        const timer = setInterval(() => {
            n--;
            if (n <= 0) {
                clearInterval(timer);
                overlay.style.display = 'none';
                resolve();
            } else {
                text.textContent = n;
            }
        }, 1000);
    });
}

async function captureStripIfFaceDetected() {
    const STRIP_SHOTS = 3;
    const CELL_ASPECT = 4 / 3;
    const CELL_OUT_WIDTH = 640;
    try {
        updateFaceDetectionStatus('Checking for face...', 'loading');
        const faceDetection = await detectFaceInCurrentFrame();
        if (!faceDetection) {
            updateFaceDetectionStatus('No face detected. Position your face in frame and try again.', 'error');
            showVisitorNotice('photo-form-alert', 'No face detected. Please position your face clearly in the camera frame and capture again.', 'I could not see a face clearly. Move into the frame and try again.');
            return false;
        }

        // Use the admin countdown (same value as a normal photo)
        if (countdownSeconds === null) await loadCountdownTimer();
        const perShotSeconds = visitorCountdownEnabled && Number.isInteger(countdownSeconds) ? countdownSeconds : 0;

        const shots = [];
        for (let i = 0; i < STRIP_SHOTS; i++) {
            renderStripProgress(i + 1, STRIP_SHOTS, shots);
            updateFaceDetectionStatus(`Photo ${i + 1} of ${STRIP_SHOTS}...`, 'loading');

            await runShotCountdown(perShotSeconds);   // 3 2 1

            const landmarks = await getCurrentFaceAccessoryLandmarks();
            shots.push(captureVideoFrameDataUrl(faceDetection, landmarks));   // capture
            if (typeof flashCameraView === 'function') flashCameraView();
            renderStripProgress(i + 2, STRIP_SHOTS, shots);   // thumbnail appears
            await wait(500);
        }
        hideStripProgress();

        const images = await Promise.all(shots.map(src => loadImageElement(src)));
        const srcW = images[0].naturalWidth, srcH = images[0].naturalHeight;
        let cropW = srcW, cropH = srcW / CELL_ASPECT;
        if (cropH > srcH) { cropH = srcH; cropW = srcH * CELL_ASPECT; }
        const cropX = (srcW - cropW) / 2, cropY = (srcH - cropH) / 2;

        const cellW = CELL_OUT_WIDTH, cellH = Math.round(CELL_OUT_WIDTH / CELL_ASPECT), gap = 12;
        const canvas = document.createElement('canvas');
        canvas.width = cellW + gap * 2;
        canvas.height = cellH * STRIP_SHOTS + gap * (STRIP_SHOTS + 1);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        images.forEach((img, i) => {
            ctx.drawImage(img, cropX, cropY, cropW, cropH, gap, gap + i * (cellH + gap), cellW, cellH);
        });

        photoData = canvas.toDataURL('image/png');
        photoStripDataUrl = photoData;
        userData.photoSkipped = false;
        userData.captureMode = 'photo';
        boomerangFrames = [];
        clearRestorableBoomerang();
        userData.processedBoomerangFrames = null;
        userData.boomerangFrameDelayMs = null;
        userData.boomerangQuality = null;
        stopFaceAccessoryPreview();
        if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }

        updateFaceDetectionStatus('Photo strip captured.', 'success');
        cheerRpBear('Photo strip captured. Let us pick a frame.');
        continueToStyle();
        return true;
    } catch (error) {
        hideStripProgress();
        console.error('Photo strip capture failed:', error);
        updateFaceDetectionStatus('Photo strip failed. Please try again.', 'error');
        showVisitorNotice('photo-form-alert', `Photo strip failed: ${error.message}`, 'The photo strip stumbled. Let us try again.');
        return false;
    }
}// Retune the mouse ears so they sit on the head instead of floating

let lastInactivityReset = 0;
function resetInactivityTimer() {
    if (document.body.classList.contains('submitting-feedback')) return;
    const now = performance.now();
    if (now - lastInactivityReset < 1000) return;   // at most once a second
    lastInactivityReset = now;
    startInactivityTimer();
}

// ============================================================================
// NON-MIRRORED CAMERA BY DEFAULT
// Live preview is normal (not flipped). The "Mirror View" button still works.
// ============================================================================
(function forceNonMirroredCamera() {
    const style = document.createElement('style');
    style.id = 'no-mirror-default-style';
    style.textContent =
        '#video{transform:none !important;-webkit-transform:none !important}' +
        '#video.mirror{transform:scaleX(-1) !important;-webkit-transform:scaleX(-1) !important}' +
        '#face-accessory-canvas,#fx-canvas,#hand-gesture-canvas,#wink-canvas,#reaction-canvas{' +
        'transform:none !important;-webkit-transform:none !important}';
    document.head.appendChild(style);

    // Make sure the state and button label match "not mirrored" on load
    document.addEventListener('DOMContentLoaded', () => {
        isMirrored = false;
        const video = document.getElementById('video');
        if (video) video.classList.remove('mirror');
        const mirrorBtn = document.getElementById('mirror-btn');
        if (mirrorBtn) {
            mirrorBtn.textContent = 'Mirror View';
            mirrorBtn.setAttribute('aria-pressed', 'false');
        }
    });
})();

(function fixPropScale() {
    // 1) Make every overlay canvas crop exactly like the video (object-fit: cover)
    const style = document.createElement('style');
    style.id = 'prop-canvas-cover-fix';
    style.textContent =
        '#face-accessory-canvas,#fx-canvas,#hand-gesture-canvas,#wink-canvas,#reaction-canvas{' +
        'object-fit:cover !important;object-position:center !important}';
    document.head.appendChild(style);

    // 2) Stop head-nod from squashing the worn props vertically
    const originalEstimate = estimateHeadPose;
    estimateHeadPose = function () {
        const pose = originalEstimate.apply(this, arguments);
        return { cosYaw: pose.cosYaw, cosPitch: 1 };
    };
})();

// ============================================================================
// NON-MIRRORED CAMERA (final) - ignores the .mirror class, uses data-flip instead
// ============================================================================
(function noMirrorFinal() {
    const old = document.getElementById('no-mirror-default-style');
    if (old) old.remove();

    const style = document.createElement('style');
    style.id = 'no-mirror-final-style';
    style.textContent =
        'html body #video, html body #video.mirror{transform:none !important;-webkit-transform:none !important}' +
        'html body #video[data-flip="1"]{transform:scaleX(-1) !important;-webkit-transform:scaleX(-1) !important}' +
        'html body #face-accessory-canvas, html body #fx-canvas, html body #hand-gesture-canvas,' +
        'html body #wink-canvas, html body #reaction-canvas{transform:none !important;-webkit-transform:none !important}';
    document.head.appendChild(style);

    function syncMirrorState() {
        const video = document.getElementById('video');
        const mirrorBtn = document.getElementById('mirror-btn');
        if (video) {
            video.classList.remove('mirror');
            video.dataset.flip = isMirrored ? '1' : '0';
        }
        if (mirrorBtn) {
            mirrorBtn.textContent = isMirrored ? 'Normal View' : 'Mirror View';
            mirrorBtn.setAttribute('aria-pressed', String(isMirrored));
        }
    }

    // Start not mirrored, right now and again once the page is ready
    isMirrored = false;
    syncMirrorState();
    document.addEventListener('DOMContentLoaded', () => { isMirrored = false; syncMirrorState(); });

    // The Mirror View button still works
    const toggleMirrorBefore = toggleMirror;
    toggleMirror = function () {
        toggleMirrorBefore.apply(this, arguments);
        syncMirrorState();
    };

    // Re-apply every time the camera starts (e.g. after Retake)
    const initializeCameraBefore = initializeCamera;
    initializeCamera = async function () {
        await initializeCameraBefore.apply(this, arguments);
        syncMirrorState();
    };
})();

// ============================================================================
// CUSTOM PHOTO STRIP FRAME
// Strips get their own portrait frame instead of the standard landscape overlay.
// Normal photos and boomerangs are untouched.
// ============================================================================
(function customStripFrame() {
    const F = { cellW: 600, cellH: 450, gap: 20, side: 60, header: 150, footer: 160 };
    const cache = { key: '', url: '' };

    function isStrip() { return Boolean(photoData) && shouldContainPhoto(photoData); }

    function drawLeaf(ctx, x, y, size, rot, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.55, size * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-size * 0.5, 0);
        ctx.lineTo(size * 0.5, 0);
        ctx.stroke();
        ctx.restore();
    }

    async function buildStripFramedDataUrl() {
        const themeColor = generateColorFromThemeId(selectedTheme);
        const name = (userData.name || '').trim();
        const key = [photoData.length, photoData.slice(-40), themeColor, name].join('|');
        if (cache.key === key) return cache.url;

        const img = await loadImageElement(photoData);

        // Slice the 3 shots back out of the strip (12px gaps, same as captureStripIfFaceDetected)
        const g = 12;
        const srcCellW = img.naturalWidth - g * 2;
        const srcCellH = (img.naturalHeight - g * 4) / 3;

        const W = F.side * 2 + F.cellW;
        const H = F.header + F.cellH * 3 + F.gap * 2 + F.footer;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');

        // Background
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, shadeHexColor(themeColor, -60));
        bg.addColorStop(1, themeColor);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // Cream inner panel + dashed border
        ctx.fillStyle = '#fffdf5';
        ctx.beginPath();
        ctx.roundRect(24, 24, W - 48, H - 48, 28);
        ctx.fill();
        ctx.strokeStyle = themeColor;
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = 3;
        ctx.setLineDash([14, 10]);
        ctx.beginPath();
        ctx.roundRect(40, 40, W - 80, H - 80, 20);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        // Header
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = shadeHexColor(themeColor, -50);
        ctx.font = '900 58px Arial, sans-serif';
        ctx.fillText('RP ESG', W / 2, 82);
        ctx.fillStyle = '#52665b';
        ctx.font = '700 24px Arial, sans-serif';
        ctx.fillText('MEMORY STRIP', W / 2, 124);
        drawLeaf(ctx, 110, 90, 60, -0.5, themeColor);
        drawLeaf(ctx, W - 110, 90, 60, Math.PI + 0.5, themeColor);

        // The 3 photos
        for (let i = 0; i < 3; i++) {
            const x = F.side;
            const y = F.header + i * (F.cellH + F.gap);
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.22)';
            ctx.shadowBlur = 16;
            ctx.shadowOffsetY = 6;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.roundRect(x - 8, y - 8, F.cellW + 16, F.cellH + 16, 18);
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.beginPath();
            ctx.roundRect(x, y, F.cellW, F.cellH, 12);
            ctx.clip();
            ctx.drawImage(img, g, g + i * (srcCellH + g), srcCellW, srcCellH, x, y, F.cellW, F.cellH);
            ctx.restore();
        }

        // Footer
        const footerTop = F.header + F.cellH * 3 + F.gap * 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = shadeHexColor(themeColor, -50);
        ctx.font = '800 36px Arial, sans-serif';
        ctx.fillText(name || 'RP Visitor', W / 2, footerTop + 52);
        ctx.fillStyle = '#52665b';
        ctx.font = '600 22px Arial, sans-serif';
        const dateText = new Date().toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' });
        ctx.fillText('Republic Polytechnic  |  ' + dateText, W / 2, footerTop + 94);
        for (let i = 0; i < 5; i++) {
            drawLeaf(ctx, W / 2 - 100 + i * 50, footerTop + 128, 30, (i % 2 ? 0.5 : -0.5), i % 2 ? themeColor : shadeHexColor(themeColor, -30));
        }

        cache.key = key;
        cache.url = canvas.toDataURL('image/png');
        return cache.url;
    }

    // ---- Style page preview: show the framed strip, hide the landscape overlay ----
    function resetPreviewFrame(previewPhoto, overlay) {
        if (overlay) overlay.style.removeProperty('display');
        const frame = previewPhoto && previewPhoto.closest('.preview-frame');
        if (frame) { frame.style.removeProperty('width'); frame.style.removeProperty('height'); }
        if (previewPhoto) previewPhoto.style.removeProperty('object-fit');
    }

    const updatePreviewWithCutoutBase = updatePreviewWithCutout;
    updatePreviewWithCutout = function () {
        const previewPhoto = document.getElementById('preview-photo');
        const overlay = document.getElementById('selected-overlay');

        if (!previewPhoto || !isStrip()) {
            resetPreviewFrame(previewPhoto, overlay);
            return updatePreviewWithCutoutBase.apply(this, arguments);
        }

        stopBoomerangPreview();
        if (overlay) overlay.style.setProperty('display', 'none', 'important');

        const frame = previewPhoto.closest('.preview-frame');
        if (frame) {
            const w = currentDevice === 'mobile' ? 240 : 280;
            const h = Math.round(w * (F.header + F.cellH * 3 + F.gap * 2 + F.footer) / (F.side * 2 + F.cellW));
            frame.style.setProperty('width', w + 'px', 'important');
            frame.style.setProperty('height', h + 'px', 'important');
        }
        previewPhoto.style.setProperty('object-fit', 'contain', 'important');

        buildStripFramedDataUrl()
            .then((url) => { if (isStrip()) previewPhoto.src = url; })
            .catch((error) => console.error('Strip frame preview failed:', error));
    };

    // ---- Final image: framed strip instead of the standard overlay ----
    const processFinalPhotoFromStillFrameBase = processFinalPhotoFromStillFrame;
    processFinalPhotoFromStillFrame = function () {
        if (!isStrip()) return processFinalPhotoFromStillFrameBase.apply(this, arguments);

        return buildStripFramedDataUrl()
            .then((url) => { userData.processedPhoto = url; })
            .catch((error) => {
                console.error('Strip frame failed, using standard frame:', error);
                return processFinalPhotoFromStillFrameBase.apply(this, arguments);
            });
    };
})();

// ============================================================================
// FLORAL PHOTOSTRIP FRAME v3
// - Thinner green frames, soft mint background
// - ~40% fewer flowers, all stickers kept INSIDE the photo frames
// - All photos share one colour grade that follows the selected theme
// - Smaller RP + ESG logos, more space in the footer (slogan / Chinese / name / date)
// Overrides v2. Normal photos / boomerangs unchanged.
// ============================================================================
// ============================================================================
// FLORAL PHOTOSTRIP FRAME v4  (replaces floralStripFrameV3)
// - Layout matches the reference: pastel background, rounded photo frames,
//   corner leaves + sparkles, flower/clover stickers INSIDE the photos,
//   logo plaque, script slogan, date row and a name pill on soft hills.
// - ONE colour per theme: every decoration, frame, badge and text colour is
//   built from a single hue, so pink = all pink, blue = all blue, etc.
// - Normal photos and boomerangs are untouched.
// HOW TO USE: delete the whole  floralStripFrameV3  IIFE at the end of
//             feedback.js and paste this entire block in its place.
// ============================================================================
(function floralStripFrameV4() {
    // ---------------- settings you may want to edit ----------------
    const RP_LOGO_CANDIDATES = [
        (document.querySelector('.rp-bear-shirt img') || {}).src,
        '/assets/static/rpLogo.png',
        '/assets/rp-logo.png',
        '/assets/propsforphototaking/rp-logo.png'
    ].filter(Boolean);
    const LOGO_HAS_TEXT = false;   // true if your logo PNG already contains "REPUBLIC POLYTECHNIC"
    const SLOGAN_TEXT = 'the joy of growing green';
    const SCRIPT_FONT = '"Dancing Script","Brush Script MT","Segoe Script","Snell Roundhand",cursive';

    // Theme -> colour. The theme id AND its display name are searched for these words.
    // [regex, hue (0-360), saturation (0-100)]. Add your own overlay names here.
    const THEME_COLOURS = [
        [/\b(pink|rose|sakura|blossom|bubblegum)/, 338, 55],
        [/\b(red|ruby|crimson|maroon)\b/, 355, 50],
        [/\b(orange|sunset|peach|autumn|coral)/, 24, 60],
        [/\b(yellow|gold|sunny|sunshine|lemon)/, 45, 60],
        [/\b(green|nature|forest|leaf|eco|mint|garden)/, 135, 32],
        [/\b(teal|aqua|turquoise|cyan)/, 175, 40],
        [/\b(blue|ocean|sea|sky|water|marine)/, 208, 48],
        [/\b(purple|violet|lavender|lilac|grape)/, 268, 40],
        [/\b(brown|earth|coffee|vintage|retro|sepia)/, 28, 30],
        [/\b(grey|gray|silver|mono|steel)/, 210, 8]
    ];

    // ---------------- layout ----------------
    const L = { W: 720, sideX: 88, cellW: 544, cellH: 408, gap: 36, top: 60, footer: 520, pad: 6, radius: 34 };
    const cache = { key: '', url: '', w: 0, h: 0 };
    let logoImg;      // undefined = not tried yet, null = none found
    let P = null;     // current palette

    function isStrip() { return Boolean(photoData) && shouldContainPhoto(photoData); }
    function frameHeight(n) { return L.top + n * L.cellH + (n - 1) * L.gap + L.footer; }

    async function getLogo() {
        if (logoImg !== undefined) return logoImg;
        for (const src of RP_LOGO_CANDIDATES) {
            try { logoImg = await loadImageElement(src); return logoImg; } catch (e) { /* try next */ }
        }
        logoImg = null;
        return null;
    }

    // ---------------- colour: ONE hue per theme ----------------
    const hsl = (h, s, l, a) => (a == null ? `hsl(${h},${s}%,${l}%)` : `hsla(${h},${s}%,${l}%,${a})`);

    function hueFromHex(hex) {
        const n = parseInt(hex.slice(1), 16);
        const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
        let h = 0;
        if (d) {
            if (max === r) h = ((g - b) / d) % 6;
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
        }
        return Math.round((h * 60 + 360) % 360);
    }

    function resolveThemeColour() {
        if (window.stripColourOverride) return window.stripColourOverride;   // colour picked by visitor
        const name = ((overlayData[selectedTheme] || {}).display_name || '');
        const key = (selectedTheme + ' ' + name).toLowerCase();
        for (const [re, h, s] of THEME_COLOURS) if (re.test(key)) return { h, s };
        return { h: hueFromHex(generateColorFromThemeId(selectedTheme)), s: 45 };   // unknown theme: same colour as its swatch
    }

    function buildPalette() {
        const { h, s } = resolveThemeColour();
        const S = (d) => Math.max(0, Math.min(90, s + d));
        return {
            h,
            bgTop: hsl(h, S(15), 97), bgBottom: hsl(h, S(5), 91),
            blob: hsl(h, S(0), 86, 0.5),
            hill1: hsl(h, S(-5), 89), hill2: hsl(h, S(-8), 83), hill3: hsl(h, S(-10), 77),
            frame: hsl(h, S(-5), 34), frameDark: hsl(h, S(0), 24), frameGlow: hsl(h, S(10), 80),
            shadow: hsl(h, S(0), 22, 0.32),
            leaf: hsl(h, S(-5), 83, 0.92), leafEdge: hsl(h, S(-5), 66), stem: hsl(h, S(-5), 64),
            stickerFill: hsl(h, S(-5), 78), stickerEdge: hsl(h, S(-5), 52), stickerVein: hsl(h, S(-5), 93),
            sparkle: hsl(h, S(-5), 68),
            plaque: hsl(h, S(15), 98),
            badgeTop: hsl(h, S(-5), 44), badgeBottom: hsl(h, S(-5), 31),
            dark: hsl(h, S(0), 20), muted: hsl(h, S(-15), 38),
            pill: hsl(h, S(-12), 58), light: hsl(h, S(20), 95)
        };
    }

    // ---------------- drawing helpers (all colours come from P) ----------------
    function sparkle(ctx, x, y, r, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, y - r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.quadraticCurveTo(x, y, x, y + r);
        ctx.quadraticCurveTo(x, y, x - r, y);
        ctx.quadraticCurveTo(x, y, x, y - r);
        ctx.fill();
    }

    function leaf(ctx, x, y, len, rot, fill, stroke) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.fillStyle = fill;
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(len * 0.5, -len * 0.34, len, 0);
        ctx.quadraticCurveTo(len * 0.5, len * 0.34, 0, 0);
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(len * 0.06, 0);
        ctx.lineTo(len * 0.86, 0);
        ctx.stroke();
        ctx.restore();
    }

    function branch(ctx, x, y, len, rot) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.strokeStyle = P.stem;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(len * 0.5, -len * 0.06, len, 0);
        ctx.stroke();
        for (let i = 1; i <= 5; i++) {
            const t = i / 6, px = len * t, sz = len * 0.27 * (1 - t * 0.35);
            leaf(ctx, px, 0, sz, -0.75, P.leaf, P.leafEdge);
            leaf(ctx, px, 0, sz, 0.75, P.leaf, P.leafEdge);
        }
        leaf(ctx, len, 0, len * 0.2, 0, P.leaf, P.leafEdge);
        ctx.restore();
    }

    function bigLeaves(ctx, x, y, size, rot) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        leaf(ctx, 0, 0, size, -0.55, P.leaf, P.leafEdge);
        leaf(ctx, 0, 0, size * 0.92, 0.1, P.leaf, P.leafEdge);
        leaf(ctx, 0, 0, size * 0.8, 0.75, P.leaf, P.leafEdge);
        ctx.restore();
    }

    function heartLobe(ctx, s) {
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.08);
        ctx.bezierCurveTo(-s * 0.55, -s * 0.05, -s * 0.6, -s * 0.85, -s * 0.2, -s * 0.82);
        ctx.bezierCurveTo(-s * 0.08, -s * 0.8, 0, -s * 0.7, 0, -s * 0.62);
        ctx.bezierCurveTo(0, -s * 0.7, s * 0.08, -s * 0.8, s * 0.2, -s * 0.82);
        ctx.bezierCurveTo(s * 0.6, -s * 0.85, s * 0.55, -s * 0.05, 0, -s * 0.08);
        ctx.closePath();
    }

    // sticker-style clover: white outline, single-colour fill
    function clover(ctx, x, y, size) {
        ctx.save();
        ctx.translate(x, y);
        ctx.lineJoin = 'round';
        for (let pass = 0; pass < 2; pass++) {
            for (let i = 0; i < 4; i++) {
                ctx.save();
                ctx.rotate((Math.PI / 2) * i + Math.PI / 4);
                heartLobe(ctx, size);
                if (pass === 0) {
                    ctx.lineWidth = size * 0.16;
                    ctx.strokeStyle = '#ffffff';
                    ctx.fillStyle = '#ffffff';
                    ctx.stroke(); ctx.fill();
                } else {
                    ctx.fillStyle = P.stickerFill;
                    ctx.strokeStyle = P.stickerEdge;
                    ctx.lineWidth = 2;
                    ctx.fill(); ctx.stroke();
                    ctx.strokeStyle = P.stickerVein;
                    ctx.lineWidth = 2.5;
                    ctx.beginPath(); ctx.moveTo(0, -size * 0.14); ctx.lineTo(0, -size * 0.6); ctx.stroke();
                }
                ctx.restore();
            }
        }
        ctx.restore();
    }

    function stickerFlower(ctx, x, y, size) {
        ctx.save();
        ctx.translate(x, y);
        for (let pass = 0; pass < 2; pass++) {
            for (let i = 0; i < 5; i++) {
                ctx.save();
                ctx.rotate((Math.PI * 2 * i) / 5);
                ctx.beginPath();
                ctx.ellipse(0, -size * 0.5, size * 0.3, size * 0.46, 0, 0, Math.PI * 2);
                if (pass === 0) {
                    ctx.lineWidth = size * 0.16;
                    ctx.strokeStyle = '#ffffff';
                    ctx.fillStyle = '#ffffff';
                    ctx.stroke(); ctx.fill();
                } else {
                    ctx.fillStyle = P.stickerFill;
                    ctx.strokeStyle = P.stickerEdge;
                    ctx.lineWidth = 2;
                    ctx.fill(); ctx.stroke();
                }
                ctx.restore();
            }
        }
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(0, 0, size * 0.27, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = P.light;
        ctx.strokeStyle = P.stickerEdge;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, size * 0.18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
    }

    function tinyFlower(ctx, x, y, s) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = P.stickerEdge;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 5; i++) {
            const a = (Math.PI * 2 * i) / 5;
            ctx.beginPath();
            ctx.arc(x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.55, s * 0.45, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
        }
        ctx.fillStyle = P.stickerFill;
        ctx.beginPath(); ctx.arc(x, y, s * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    // three little "pop" lines next to a sticker
    function burst(ctx, x, y, size, startAngle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = P.frame;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
            const a = startAngle + (i - 1) * 0.5;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * size * 0.7, Math.sin(a) * size * 0.7);
            ctx.lineTo(Math.cos(a) * size * 1.1, Math.sin(a) * size * 1.1);
            ctx.stroke();
        }
        ctx.restore();
    }

    function hillLayer(ctx, W, H, y, amp, color, shift) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, H);
        ctx.lineTo(0, y + shift);
        ctx.bezierCurveTo(W * 0.25, y - amp, W * 0.4, y + amp, W * 0.62, y - amp * 0.3);
        ctx.bezierCurveTo(W * 0.8, y - amp * 1.2, W * 0.92, y + amp * 0.4, W, y - amp * 0.5);
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();
    }

    function shieldFallback(ctx, cx, top) {
        ctx.save();
        ctx.translate(cx, top);
        ctx.fillStyle = P.badgeBottom;
        ctx.beginPath();
        ctx.moveTo(-24, 0); ctx.lineTo(24, 0); ctx.lineTo(24, 30);
        ctx.quadraticCurveTo(24, 48, 0, 58);
        ctx.quadraticCurveTo(-24, 48, -24, 30);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = P.badgeTop;
        ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(-4, 0); ctx.lineTo(-24, 34); ctx.closePath(); ctx.fill();
        ctx.restore();
    }

    // ---------------- the frame ----------------
    async function buildFloralStrip() {
        P = buildPalette();
        const name = (userData.name || '').trim();
        const logo = await getLogo();
        const img = await loadImageElement(photoData);
        const key = [photoData.length, photoData.slice(-40), name, logo ? 'L' : 'N', selectedTheme, P.h, P.bgTop].join('|');
        if (cache.key === key) return cache;

        // read the shots back out of the strip (4:3 cells, 12px gaps)
        const g = 12;
        const srcCellW = img.naturalWidth - g * 2;
        const srcCellH = srcCellW * 3 / 4;
        const n = Math.max(1, Math.round((img.naturalHeight - g) / (srcCellH + g)));
        const realCellH = (img.naturalHeight - g * (n + 1)) / n;

        const W = L.W, H = frameHeight(n);
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');

        const cellX = L.sideX;
        const cellY = (i) => L.top + i * (L.cellH + L.gap);
        const E = L.top + n * L.cellH + (n - 1) * L.gap;       // bottom edge of the last photo

        // ----- background -----
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, P.bgTop);
        bg.addColorStop(1, P.bgBottom);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        // soft blob on the right side + hills at the bottom
        ctx.fillStyle = P.blob;
        ctx.beginPath();
        ctx.moveTo(W, E - L.cellH * 0.9);
        ctx.bezierCurveTo(W * 0.82, E - L.cellH * 0.75, W * 0.9, E - L.cellH * 0.2, W * 0.78, E + 40);
        ctx.lineTo(W, E + 40);
        ctx.closePath();
        ctx.fill();
        hillLayer(ctx, W, H, H - 210, 34, P.hill1, 0);
        hillLayer(ctx, W, H, H - 150, 28, P.hill2, 16);
        hillLayer(ctx, W, H, H - 90, 22, P.hill3, 10);

        // ----- background decorations (behind the photos) -----
        clover(ctx, 74, 44, 30);
        sparkle(ctx, 150, 46, 13, P.sparkle);
        sparkle(ctx, 40, 106, 11, P.sparkle);
        branch(ctx, W + 6, 74, 96, Math.PI * 0.88);
        sparkle(ctx, W - 44, 228, 12, P.sparkle);
        bigLeaves(ctx, -6, L.top + L.cellH + 10, 92, -0.95);
        sparkle(ctx, 42, L.top + L.cellH + 70, 12, P.sparkle);
        sparkle(ctx, 42, cellY(1) + L.cellH * 0.45, 11, P.sparkle);
        sparkle(ctx, W - 46, cellY(1) + 40, 12, P.sparkle);
        sparkle(ctx, W - 42, cellY(1) + 90, 9, P.sparkle);
        if (n >= 3) {
            bigLeaves(ctx, -8, cellY(2) + L.cellH * 0.8, 104, -0.7);
            sparkle(ctx, 42, cellY(2) + L.cellH * 0.35, 11, P.sparkle);
            branch(ctx, W - 28, E + 6, 150, -Math.PI * 0.55);
            sparkle(ctx, W - 44, E + 70, 12, P.sparkle);
        }

        // ----- photo cells: dark frame, soft glow, light tint of the theme -----
        for (let i = 0; i < n; i++) {
            const x = cellX, y = cellY(i);
            ctx.save();
            ctx.shadowColor = P.shadow;
            ctx.shadowBlur = 18;
            ctx.shadowOffsetY = 7;
            ctx.fillStyle = P.frame;
            ctx.beginPath();
            ctx.roundRect(x - L.pad, y - L.pad, L.cellW + L.pad * 2, L.cellH + L.pad * 2, L.radius + L.pad);
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.beginPath();
            ctx.roundRect(x, y, L.cellW, L.cellH, L.radius);
            ctx.clip();
            if (CANVAS_FILTER_OK) ctx.filter = 'saturate(1.06) contrast(1.03) brightness(1.03)';
            ctx.drawImage(img, g, g + i * (realCellH + g), srcCellW, realCellH, x, y, L.cellW, L.cellH);
            ctx.filter = 'none';
            ctx.globalAlpha = 0.06;
            ctx.fillStyle = P.badgeTop;
            ctx.fillRect(x, y, L.cellW, L.cellH);
            ctx.restore();

            // thin inner glow ring
            ctx.save();
            ctx.strokeStyle = P.frameGlow;
            ctx.globalAlpha = 0.7;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(x + 1.5, y + 1.5, L.cellW - 3, L.cellH - 3, L.radius - 1);
            ctx.stroke();
            ctx.restore();
        }

        // ----- stickers INSIDE the photos (clipped to each frame) -----
        const inCell = (i, fn) => {
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(cellX, cellY(i), L.cellW, L.cellH, L.radius);
            ctx.clip();
            fn(cellX, cellY(i));
            ctx.restore();
        };
        for (let i = 0; i < n; i++) {
            const pattern = i % 3;
            inCell(i, (x, y) => {
                if (pattern === 0) {
                    clover(ctx, x + L.cellW - 50, y + 52, 34);
                    burst(ctx, x + L.cellW - 50, y + 52, 34, Math.PI * 0.5);
                } else if (pattern === 1) {
                    stickerFlower(ctx, x + 52, y + L.cellH - 50, 34);
                    burst(ctx, x + 52, y + L.cellH - 50, 34, -Math.PI * 0.5);
                } else {
                    clover(ctx, x + L.cellW - 50, y + 52, 34);
                    burst(ctx, x + L.cellW - 50, y + 52, 34, Math.PI * 0.5);
                    tinyFlower(ctx, x + 38, y + L.cellH - 36, 13);
                    tinyFlower(ctx, x + 72, y + L.cellH - 58, 11);
                }
            });
        }

        // ----- bottom branches over the hills -----
        branch(ctx, 24, H - 6, 128, -Math.PI * 0.42);
        branch(ctx, W - 36, H - 6, 150, -Math.PI * 0.6);
        tinyFlower(ctx, W - 40, H - 34, 14);
        sparkle(ctx, 120, H - 110, 12, P.sparkle);
        sparkle(ctx, 90, E + 150, 11, P.sparkle);

        // ----- logo plaque -----
        const plaqueW = L.cellW, plaqueH = 128;
        const px = cellX, py = E + 62;
        ctx.save();
        ctx.shadowColor = P.shadow;
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 5;
        ctx.fillStyle = P.plaque;
        ctx.beginPath(); ctx.roundRect(px, py, plaqueW, plaqueH, 40); ctx.fill();
        ctx.restore();

        const midY = py + plaqueH / 2;
        const leftCx = px + plaqueW * 0.27;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (logo) {
            const maxH = LOGO_HAS_TEXT ? 100 : 56;
            const s = Math.min(130 / logo.naturalWidth, maxH / logo.naturalHeight);
            const lw = logo.naturalWidth * s, lh = logo.naturalHeight * s;
            ctx.drawImage(logo, leftCx - lw / 2, LOGO_HAS_TEXT ? midY - lh / 2 : py + 14, lw, lh);
        } else if (!LOGO_HAS_TEXT) {
            shieldFallback(ctx, leftCx, py + 12);
        }
        if (!LOGO_HAS_TEXT) {
            ctx.fillStyle = P.dark;
            ctx.font = '900 22px Arial, sans-serif';
            ctx.fillText('REPUBLIC', leftCx, py + 86);
            ctx.font = '800 18px Arial, sans-serif';
            ctx.fillText('POLYTECHNIC', leftCx, py + 108);
        }

        // divider
        ctx.strokeStyle = P.stem;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px + plaqueW * 0.5, py + 22); ctx.lineTo(px + plaqueW * 0.5, py + plaqueH - 22); ctx.stroke();

        // ESG badge
        const esgCx = px + plaqueW * 0.75;
        const bw = 190, bh = 92;
        const eg = ctx.createLinearGradient(0, midY - bh / 2, 0, midY + bh / 2);
        eg.addColorStop(0, P.badgeTop);
        eg.addColorStop(1, P.badgeBottom);
        ctx.fillStyle = eg;
        ctx.beginPath(); ctx.roundRect(esgCx - bw / 2, midY - bh / 2, bw, bh, 26); ctx.fill();
        leaf(ctx, esgCx - 78, midY - 14, 26, -0.9, P.light, P.light);
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 44px Arial, sans-serif';
        ctx.fillText('ESG', esgCx + 12, midY - 16);
        ctx.font = '600 14px Arial, sans-serif';
        ctx.fillText('Environmental,', esgCx, midY + 16);
        ctx.fillText('Social & Governance', esgCx, midY + 33);

        // ----- slogan with side lines -----
        const sloganY = py + plaqueH + 76;
        ctx.font = `italic 400 46px ${SCRIPT_FONT}`;
        ctx.fillStyle = P.frameDark;
        ctx.fillText(SLOGAN_TEXT, W / 2, sloganY);
        const sw = ctx.measureText(SLOGAN_TEXT).width;
        ctx.strokeStyle = P.frame;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px + 6, sloganY + 4); ctx.lineTo(W / 2 - sw / 2 - 18, sloganY + 4);
        ctx.moveTo(W / 2 + sw / 2 + 18, sloganY + 4); ctx.lineTo(px + plaqueW - 6, sloganY + 4);
        ctx.stroke();
        sparkle(ctx, px - 6, sloganY + 6, 10, P.sparkle);

        // ----- date row with leaf icons -----
        const dateY = sloganY + 84;
        const dateText = new Date().toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) + '  ·  RP ESG';
        ctx.font = '600 30px Arial, sans-serif';
        ctx.fillStyle = P.dark;
        ctx.fillText(dateText, W / 2, dateY);
        const dw = ctx.measureText(dateText).width;
        leaf(ctx, W / 2 - dw / 2 - 58, dateY + 6, 30, -0.6, P.stickerFill, P.stickerEdge);
        leaf(ctx, W / 2 + dw / 2 + 28, dateY - 6, 30, Math.PI + 0.6, P.stickerFill, P.stickerEdge);

        // ----- name pill with side lines -----
        const pillY = dateY + 66;
        const label = name || 'Visitor';
        ctx.font = '600 24px Arial, sans-serif';
        const pw = Math.min(plaqueW - 120, Math.max(150, ctx.measureText(label).width + 56)), ph = 46;
        ctx.strokeStyle = P.frame;
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(W / 2 - pw / 2 - 120, pillY); ctx.lineTo(W / 2 - pw / 2 - 16, pillY);
        ctx.moveTo(W / 2 + pw / 2 + 16, pillY); ctx.lineTo(W / 2 + pw / 2 + 120, pillY);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = P.pill;
        ctx.beginPath(); ctx.roundRect(W / 2 - pw / 2, pillY - ph / 2, pw, ph, ph / 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(label, W / 2, pillY + 1);

        cache.key = key;
        cache.url = canvas.toDataURL('image/png');
        cache.w = W;
        cache.h = H;
        return cache;
    }

    // ---- Style page preview (redraws every time a theme is tapped) ----
    function resetPreviewFrame(previewPhoto, overlay) {
        if (overlay) overlay.style.removeProperty('display');
        const frame = previewPhoto && previewPhoto.closest('.preview-frame');
        if (frame) { frame.style.removeProperty('width'); frame.style.removeProperty('height'); }
        if (previewPhoto) previewPhoto.style.removeProperty('object-fit');
    }

    const updatePreviewBeforeV4 = updatePreviewWithCutout;
    updatePreviewWithCutout = function () {
        const previewPhoto = document.getElementById('preview-photo');
        const overlay = document.getElementById('selected-overlay');

        if (!previewPhoto || !isStrip()) {
            resetPreviewFrame(previewPhoto, overlay);
            return updatePreviewBeforeV4.apply(this, arguments);
        }

        stopBoomerangPreview();
        if (overlay) overlay.style.setProperty('display', 'none', 'important');
        previewPhoto.style.setProperty('object-fit', 'contain', 'important');

        buildFloralStrip()
            .then((result) => {
                if (!isStrip()) return;
                const frame = previewPhoto.closest('.preview-frame');
                if (frame) {
                    const w = currentDevice === 'mobile' ? 240 : 300;
                    frame.style.setProperty('width', w + 'px', 'important');
                    frame.style.setProperty('height', Math.round(w * result.h / result.w) + 'px', 'important');
                }
                previewPhoto.src = result.url;
            })
            .catch((error) => console.error('Floral strip preview failed:', error));
    };

    // ---- Saved / emailed image ----
    const processStillBeforeV4 = processFinalPhotoFromStillFrame;
    processFinalPhotoFromStillFrame = function () {
        if (!isStrip()) return processStillBeforeV4.apply(this, arguments);
        return buildFloralStrip()
            .then((result) => { userData.processedPhoto = result.url; })
            .catch((error) => {
                console.error('Floral strip failed, using previous frame:', error);
                return processStillBeforeV4.apply(this, arguments);
            });
    };
})();

// ============================================================================
// STRIP TEMPLATE PICKER  (Floral Meadow / Gingham Dream) + COLOUR OPTIONS
// Shown on the style page only when the visitor took a photo strip.
// ============================================================================
(function stripTemplatePicker() {
    const TAG_TEXT = 'Dream';   // label on the first photo of the Dream templates

    const COLOURS = {
        green: { label: 'Green', h: 100, s: 45, dot: '#8fce5a' },
        pink: { label: 'Pink', h: 338, s: 55, dot: '#f08fb0' },
        blue: { label: 'Blue', h: 208, s: 50, dot: '#7fb4ea' },
        purple: { label: 'Purple', h: 268, s: 42, dot: '#b18fe0' },
        yellow: { label: 'Yellow', h: 45, s: 65, dot: '#f2cf55' },
        orange: { label: 'Orange', h: 24, s: 65, dot: '#f1a56a' }
    };
    const TEMPLATES = [
        { id: 'meadow', name: 'Floral Meadow', colours: ['theme', 'green', 'pink', 'blue', 'purple', 'yellow', 'orange'] },
        { id: 'dream', name: 'Nature Gingham', colours: ['green', 'pink', 'blue', 'purple', 'yellow', 'orange'] },
        { id: 'gingham', name: 'Gingham Dream', colours: ['green', 'pink', 'blue', 'purple', 'yellow', 'orange'] }
    ];
    const state = { template: 'dream', colour: 'green' };
    const cache = { key: '', url: '', w: 0, h: 0 };

    // templates that are drawn by this file (everything except the original meadow)
    const isCustom = () => state.template === 'dream' || state.template === 'gingham';
    const buildCurrent = () => (state.template === 'gingham' ? buildGingham() : buildDream());

    function isStrip() { return Boolean(photoData) && shouldContainPhoto(photoData); }

    function applyColourOverride() {
        const c = COLOURS[state.colour];
        window.stripColourOverride = (state.template === 'meadow' && c) ? { h: c.h, s: c.s } : null;
    }

    // ---------------- RP logo (shared) ----------------
    let logoImg = null;
    async function getLogo() {
        if (logoImg) return logoImg;
        const candidates = [
            (document.querySelector('.rp-bear-shirt img') || {}).src,
            '/assets/static/rpLogo.png',
            '/assets/rp-logo.png',
            '/assets/propsforphototaking/rp-logo.png'
        ].filter(Boolean);
        for (const src of candidates) {
            try { logoImg = await loadImageElement(src); return logoImg; } catch (e) { /* try next */ }
        }
        return null;   // not cached, so it is retried next time
    }

    // ---------------- picker UI ----------------
    function ensurePicker(frame) {
        let box = document.getElementById('strip-template-picker');
        if (!box) {
            box = document.createElement('div');
            box.id = 'strip-template-picker';
            box.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;margin:10px 0;';
            frame.parentNode.insertBefore(box, frame);
        }
        return box;
    }

    function renderPicker(frame) {
        const box = ensurePicker(frame);
        const tpl = TEMPLATES.find(t => t.id === state.template);
        box.innerHTML = '';

        const row1 = document.createElement('div');
        row1.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center;';
        TEMPLATES.forEach((t) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = t.name;
            b.style.cssText = 'padding:8px 16px;border-radius:999px;font:700 14px Arial,sans-serif;cursor:pointer;border:2px solid #16a34a;' +
                (t.id === state.template ? 'background:#16a34a;color:#fff;' : 'background:#fff;color:#17382a;');
            b.addEventListener('click', () => {
                state.template = t.id;
                if (!t.colours.includes(state.colour)) state.colour = t.colours[0];
                applyColourOverride();
                resetInactivityTimer();
                updatePreviewWithCutout();
            });
            row1.appendChild(b);
        });

        const row2 = document.createElement('div');
        row2.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;justify-content:center;align-items:center;';
        tpl.colours.forEach((id) => {
            const c = COLOURS[id];
            const b = document.createElement('button');
            b.type = 'button';
            b.title = c ? c.label : 'Match theme';
            b.setAttribute('aria-label', b.title);
            const active = id === state.colour;
            b.style.cssText = 'width:34px;height:34px;border-radius:50%;cursor:pointer;padding:0;font:700 11px Arial;' +
                'border:3px solid ' + (active ? '#17382a' : '#fff') + ';box-shadow:0 0 0 1px #cbd5e1;' +
                'background:' + (c ? c.dot : 'linear-gradient(135deg,#8fce5a,#f08fb0,#7fb4ea)') + ';';
            b.addEventListener('click', () => {
                state.colour = id;
                applyColourOverride();
                resetInactivityTimer();
                updatePreviewWithCutout();
            });
            row2.appendChild(b);
        });

        box.appendChild(row1);
        box.appendChild(row2);
        box.style.display = 'flex';
    }

    function hidePicker() {
        const box = document.getElementById('strip-template-picker');
        if (box) box.style.display = 'none';
    }
    // "Available Overlays" selector: only for normal (non-strip) photos
    function findOverlaySection() {
        if (findOverlaySection.el && document.contains(findOverlaySection.el)) return findOverlaySection.el;
        const label = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,div,label'))
            .find((el) => el.children.length === 0 && /^\s*available overlays\s*$/i.test(el.textContent));
        if (!label) return null;
        let box = label.parentElement;
        while (box && box !== document.body && !/Nature\s*Theme/i.test(box.textContent)) box = box.parentElement;
        findOverlaySection.el = (box && box !== document.body) ? box : null;
        return findOverlaySection.el;
    }
    function setOverlaysVisible(visible) {
        const el = findOverlaySection();
        if (!el) return;
        if (visible) el.style.removeProperty('display');
        else el.style.setProperty('display', 'none', 'important');
    }

    // ---------------- shared drawing helpers ----------------
    const hsl = (h, s, l, a) => (a == null ? `hsl(${h},${s}%,${l}%)` : `hsla(${h},${s}%,${l}%,${a})`);

    function palette() {
        const c = COLOURS[state.colour] || COLOURS.green;
        const h = c.h, s = c.s;
        return {
            base: hsl(h, s + 20, 94), stripe: hsl(h, s + 10, 72),
            edge: hsl(h, s + 15, 88), dark: hsl(h, s - 15, 28),
            bow: hsl(h, s - 5, 30), bowLine: hsl(h, s, 62),
            clover: hsl(h, s - 5, 36), cloverLight: hsl(h, s, 52),
            tag: hsl(h, s - 20, 34), pill: hsl(h, s - 10, 40),
            coat: hsl(h, s + 5, 48), coatDark: hsl(h, s, 34),
            plaque: hsl(h, s + 20, 98), shadow: hsl(h, s, 20, 0.3),
            badgeTop: hsl(h, s - 5, 44), badgeBottom: hsl(h, s - 5, 30)
        };
    }

    function gingham(ctx, W, H, P) {
        const c = 40;
        ctx.fillStyle = P.base;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = P.stripe;
        ctx.globalAlpha = 0.5;
        for (let x = 0; x < W; x += c * 2) ctx.fillRect(x, 0, c, H);
        for (let y = 0; y < H; y += c * 2) ctx.fillRect(0, y, W, c);
        ctx.globalAlpha = 1;
    }

    function bow(ctx, x, y, s, P) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-0.35);
        const loops = new Path2D();
        loops.moveTo(0, 0);
        loops.bezierCurveTo(-s * 0.9, -s * 0.9, -s * 1.15, s * 0.8, 0, 0);
        loops.moveTo(0, 0);
        loops.bezierCurveTo(s * 0.9, -s * 0.9, s * 1.15, s * 0.8, 0, 0);
        const tails = new Path2D();
        tails.moveTo(-2, 4); tails.lineTo(-s * 0.55, s * 1.05); tails.lineTo(-s * 0.2, s * 0.95); tails.lineTo(2, 8);
        tails.moveTo(2, 4); tails.lineTo(s * 0.5, s * 1.1); tails.lineTo(s * 0.18, s * 0.98); tails.lineTo(-2, 8);
        [loops, tails].forEach((path) => {
            ctx.fillStyle = P.bow;
            ctx.fill(path);
            ctx.save();
            ctx.clip(path);
            ctx.strokeStyle = P.bowLine;
            ctx.globalAlpha = 0.55;
            ctx.lineWidth = 3;
            for (let i = -s * 1.4; i < s * 1.4; i += 9) {
                ctx.beginPath(); ctx.moveTo(i, -s * 1.2); ctx.lineTo(i, s * 1.3); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-s * 1.4, i); ctx.lineTo(s * 1.4, i); ctx.stroke();
            }
            ctx.restore();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke(path);
        });
        ctx.fillStyle = P.bow;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(-s * 0.16, -s * 0.2, s * 0.32, s * 0.4, 5); ctx.fill(); ctx.stroke();
        ctx.restore();
    }

    function cloverIcon(ctx, x, y, size, P) {
        ctx.save();
        ctx.translate(x, y);
        ctx.strokeStyle = P.clover;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(size * 0.2, size * 0.7, size * 0.55, size * 1.1); ctx.stroke();
        for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.rotate((Math.PI / 2) * i + Math.PI / 4);
            ctx.beginPath();
            ctx.moveTo(0, -size * 0.06);
            ctx.bezierCurveTo(-size * 0.6, -size * 0.05, -size * 0.65, -size * 0.95, -size * 0.22, -size * 0.9);
            ctx.bezierCurveTo(-size * 0.08, -size * 0.88, 0, -size * 0.78, 0, -size * 0.7);
            ctx.bezierCurveTo(0, -size * 0.78, size * 0.08, -size * 0.88, size * 0.22, -size * 0.9);
            ctx.bezierCurveTo(size * 0.65, -size * 0.95, size * 0.6, -size * 0.05, 0, -size * 0.06);
            ctx.closePath();
            ctx.fillStyle = i % 2 ? P.clover : P.cloverLight;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    }

    // little hooded character, bottom-left (replace with your own PNG if you like)
    function mascot(ctx, cx, feetY, P) {
        ctx.save();
        ctx.translate(cx, feetY);
        ctx.lineJoin = 'round';
        // boots
        ctx.fillStyle = '#e5484d';
        ctx.beginPath(); ctx.roundRect(-24, -16, 20, 16, 6); ctx.fill();
        ctx.beginPath(); ctx.roundRect(4, -16, 20, 16, 6); ctx.fill();
        // coat
        ctx.fillStyle = P.coat;
        ctx.beginPath(); ctx.moveTo(-30, -16); ctx.lineTo(-22, -62); ctx.lineTo(22, -62); ctx.lineTo(30, -16); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = P.coatDark;
        ctx.fillRect(-2, -60, 4, 42);
        // head + hood
        ctx.fillStyle = P.coat;
        ctx.beginPath(); ctx.arc(0, -90, 38, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        [-20, 20].forEach((ex) => {          // hood "eyes"
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(ex, -124, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#1f2937';
            ctx.beginPath(); ctx.arc(ex, -123, 5, 0, Math.PI * 2); ctx.fill();
        });
        ctx.fillStyle = '#fde8d8';           // face
        ctx.beginPath(); ctx.ellipse(0, -86, 27, 26, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f3f4f6';           // fringe
        ctx.beginPath(); ctx.ellipse(0, -104, 25, 11, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#1f2937';
        ctx.beginPath(); ctx.arc(-10, -86, 3.2, 0, Math.PI * 2); ctx.arc(10, -86, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(244,114,182,0.5)';
        ctx.beginPath(); ctx.arc(-17, -78, 5, 0, Math.PI * 2); ctx.arc(17, -78, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, -78, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
        ctx.restore();
    }

    // ---------------- Gingham Dream (bow + clover + mascot, with RP logo) ----------------
    async function buildGingham() {
        const P = palette();
        const logo = await getLogo();
        const name = (userData.name || '').trim();
        const key = [photoData.length, photoData.slice(-40), name, state.colour, logo ? 'L' : 'N', 'gingham1'].join('|');
        if (cache.key === key) return cache;

        const img = await loadImageElement(photoData);
        const g = 12;
        const srcCellW = img.naturalWidth - g * 2;
        const srcCellH = srcCellW * 3 / 4;
        const n = Math.max(1, Math.round((img.naturalHeight - g) / (srcCellH + g)));
        const realCellH = (img.naturalHeight - g * (n + 1)) / n;

        const W = 600, cellW = 440, cellH = 330, gap = 34, top = 64, footer = 270;
        const H = top + n * cellH + (n - 1) * gap + footer;
        const xs = [56, 104, 64];
        const cellX = (i) => xs[i % xs.length];
        const cellY = (i) => top + i * (cellH + gap);
        const E = top + n * cellH + (n - 1) * gap;

        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');

        gingham(ctx, W, H, P);
        ctx.strokeStyle = P.edge; ctx.lineWidth = 14; ctx.strokeRect(7, 7, W - 14, H - 14);

        // photos: white border, soft shadow, slight alternating tilt
        for (let i = 0; i < n; i++) {
            const pad = 5;
            ctx.save();
            ctx.translate(cellX(i) + cellW / 2, cellY(i) + cellH / 2);
            ctx.rotate(i % 2 === 0 ? -0.018 : 0.018);
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.roundRect(-cellW / 2 - pad, -cellH / 2 - pad, cellW + pad * 2, cellH + pad * 2, 8); ctx.fill();
            ctx.restore();
            ctx.beginPath(); ctx.roundRect(-cellW / 2, -cellH / 2, cellW, cellH, 3); ctx.clip();
            ctx.drawImage(img, g, g + i * (realCellH + g), srcCellW, realCellH, -cellW / 2, -cellH / 2, cellW, cellH);
            ctx.restore();
        }

        // "Dream" tag overhanging the top-right corner of the first photo
        ctx.save();
        ctx.font = '700 26px Georgia, serif';
        const tw = ctx.measureText(TAG_TEXT).width + 36;
        const tx = cellX(0) + cellW - tw + 14, ty = cellY(0) - 14;
        ctx.fillStyle = P.tag; ctx.globalAlpha = 0.95;
        ctx.beginPath(); ctx.roundRect(tx, ty, tw, 40, 4); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(TAG_TEXT, tx + tw / 2, ty + 21);
        ctx.restore();

        // gingham bow on photos 1, 3, ... and four-leaf clover on photos 2, 4, ...
        for (let i = 0; i < n; i++) {
            if (i % 2 === 0) bow(ctx, cellX(i) + 6, cellY(i) + cellH - 30, 34, P);
            else cloverIcon(ctx, cellX(i) + cellW - 26, cellY(i) + cellH - 30, 30, P);
        }

        // mascot bottom-left
        mascot(ctx, 84, H - 34, P);

        // plaque with RP logo + ESG badge
        const px = 150, pw = W - 200, ph = 92, py = E + 30;
        ctx.save();
        ctx.shadowColor = P.shadow; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5;
        ctx.fillStyle = P.plaque;
        ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 30); ctx.fill();
        ctx.restore();

        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const leftCx = px + pw * 0.27, midY = py + ph / 2;
        if (logo) {
            const sc = Math.min(110 / logo.naturalWidth, 46 / logo.naturalHeight);
            const lw = logo.naturalWidth * sc, lh = logo.naturalHeight * sc;
            ctx.drawImage(logo, leftCx - lw / 2, py + 10, lw, lh);
        } else {
            cloverIcon(ctx, leftCx - 6, py + 30, 14, P);
        }
        ctx.fillStyle = P.dark;
        ctx.font = '900 18px Arial, sans-serif';
        ctx.fillText('REPUBLIC', leftCx, py + 66);
        ctx.font = '800 14px Arial, sans-serif';
        ctx.fillText('POLYTECHNIC', leftCx, py + 82);

        ctx.strokeStyle = P.stripe; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px + pw * 0.52, py + 18); ctx.lineTo(px + pw * 0.52, py + ph - 18); ctx.stroke();

        const esgCx = px + pw * 0.77, bw = 132, bh = 62;
        const eg = ctx.createLinearGradient(0, midY - bh / 2, 0, midY + bh / 2);
        eg.addColorStop(0, P.badgeTop); eg.addColorStop(1, P.badgeBottom);
        ctx.fillStyle = eg;
        ctx.beginPath(); ctx.roundRect(esgCx - bw / 2, midY - bh / 2, bw, bh, 18); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 28px Arial, sans-serif';
        ctx.fillText('ESG', esgCx, midY - 10);
        ctx.font = '600 10px Arial, sans-serif';
        ctx.fillText('Environmental,', esgCx, midY + 10);
        ctx.fillText('Social & Governance', esgCx, midY + 22);

        // name pill + date
        const cx2 = px + pw / 2;
        const label = name || 'Visitor';
        ctx.font = '700 24px Arial, sans-serif';
        const lw2 = Math.min(300, Math.max(150, ctx.measureText(label).width + 50));
        ctx.fillStyle = P.plaque;
        ctx.beginPath(); ctx.roundRect(cx2 - lw2 / 2, E + 142, lw2, 44, 22); ctx.fill();
        ctx.fillStyle = P.dark;
        ctx.fillText(label, cx2, E + 165);

        const dateText = new Date().toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) + '  ·  RP ESG';
        ctx.font = '600 18px Arial, sans-serif';
        const dw = ctx.measureText(dateText).width + 36;
        ctx.fillStyle = P.pill;
        ctx.beginPath(); ctx.roundRect(cx2 - dw / 2, E + 198, dw, 34, 17); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(dateText, cx2, E + 216);

        cache.key = key; cache.url = canvas.toDataURL('image/png'); cache.w = W; cache.h = H;
        return cache;
    }

    // ---------------- Nature Gingham (leaves, hills, daisies) ----------------
    async function buildDream() {
        const c0 = COLOURS[state.colour] || COLOURS.green;
        const h = c0.h, s = c0.s;
        const sat = (v) => Math.max(0, Math.min(95, v));
        const hsl2 = (hh, ss, l, a) => (a == null ? `hsl(${hh},${sat(ss)}%,${l}%)` : `hsla(${hh},${sat(ss)}%,${l}%,${a})`);
        const P = {
            base: hsl2(h, s + 20, 94), stripe: hsl2(h, s + 10, 72), edge: hsl2(h, s + 15, 88),
            dark: hsl2(h, s - 10, 22),
            leaf1: hsl2(h, s + 5, 40), leaf2: hsl2(h, s, 54), leaf3: hsl2(h, s - 5, 68), leafEdge: hsl2(h, s, 26),
            hill1: hsl2(h, s, 82), hill2: hsl2(h, s + 5, 66), hill3: hsl2(h, s + 8, 46),
            tag: hsl2(h, s - 20, 34), plaque: hsl2(h, s + 20, 98),
            badgeTop: hsl2(h, s - 5, 44), badgeBottom: hsl2(h, s - 5, 30), shadow: hsl2(h, s, 20, 0.3)
        };

        const logo = await getLogo();

        const name = (userData.name || '').trim();
        const key = [photoData.length, photoData.slice(-40), name, state.colour, logo ? 'L' : 'N', 'dream2'].join('|');
        if (cache.key === key) return cache;

        const img = await loadImageElement(photoData);
        const g = 12;
        const srcCellW = img.naturalWidth - g * 2;
        const srcCellH = srcCellW * 3 / 4;
        const n = Math.max(1, Math.round((img.naturalHeight - g) / (srcCellH + g)));
        const realCellH = (img.naturalHeight - g * (n + 1)) / n;

        const W = 600, cellW = 460, cellH = 345, gap = 30, top = 70, footer = 280;
        const H = top + n * cellH + (n - 1) * gap + footer;
        const xs = [44, 96, 54];
        const cellX = (i) => xs[i % xs.length];
        const cellY = (i) => top + i * (cellH + gap);
        const E = top + n * cellH + (n - 1) * gap;

        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');

        const leaf = (x, y, len, rot, fill) => {
            ctx.save();
            ctx.translate(x, y); ctx.rotate(rot);
            ctx.fillStyle = fill; ctx.strokeStyle = P.leafEdge; ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(len * 0.5, -len * 0.36, len, 0);
            ctx.quadraticCurveTo(len * 0.5, len * 0.36, 0, 0);
            ctx.fill(); ctx.stroke();
            ctx.globalAlpha = 0.5;
            ctx.beginPath(); ctx.moveTo(len * 0.05, 0); ctx.lineTo(len * 0.85, 0); ctx.stroke();
            ctx.restore();
        };
        const branch = (x, y, len, rot) => {
            ctx.save();
            ctx.translate(x, y); ctx.rotate(rot);
            ctx.strokeStyle = P.leaf1; ctx.lineWidth = 4; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -len * 0.08, len, 0); ctx.stroke();
            for (let i = 1; i <= 6; i++) {
                const t = i / 7, px = len * t, sz = len * 0.28 * (1 - t * 0.3);
                leaf(px, 0, sz, -0.8, i % 2 ? P.leaf2 : P.leaf1);
                leaf(px, 0, sz, 0.8, i % 2 ? P.leaf1 : P.leaf3);
            }
            leaf(len, 0, len * 0.22, 0, P.leaf2);
            ctx.restore();
        };
        const daisy = (x, y, r) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.fillStyle = '#ffffff'; ctx.strokeStyle = P.leaf3; ctx.lineWidth = 1.5;
            for (let i = 0; i < 8; i++) {
                ctx.save(); ctx.rotate((Math.PI * 2 * i) / 8);
                ctx.beginPath(); ctx.ellipse(0, -r * 0.7, r * 0.26, r * 0.5, 0, 0, Math.PI * 2);
                ctx.fill(); ctx.stroke(); ctx.restore();
            }
            ctx.fillStyle = '#f6c945';
            ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        };
        const clover = (x, y, size) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.lineJoin = 'round';
            for (let i = 0; i < 4; i++) {
                ctx.save(); ctx.rotate((Math.PI / 2) * i + Math.PI / 4);
                ctx.beginPath();
                ctx.moveTo(0, -size * 0.06);
                ctx.bezierCurveTo(-size * 0.6, -size * 0.05, -size * 0.65, -size * 0.95, -size * 0.22, -size * 0.9);
                ctx.bezierCurveTo(-size * 0.08, -size * 0.88, 0, -size * 0.78, 0, -size * 0.7);
                ctx.bezierCurveTo(0, -size * 0.78, size * 0.08, -size * 0.88, size * 0.22, -size * 0.9);
                ctx.bezierCurveTo(size * 0.65, -size * 0.95, size * 0.6, -size * 0.05, 0, -size * 0.06);
                ctx.closePath();
                ctx.fillStyle = i % 2 ? P.leaf1 : P.leaf2;
                ctx.fill();
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke();
                ctx.restore();
            }
            ctx.restore();
        };
        const hill = (y, amp, color, shift) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(0, H); ctx.lineTo(0, y + shift);
            ctx.bezierCurveTo(W * 0.25, y - amp, W * 0.4, y + amp, W * 0.62, y - amp * 0.3);
            ctx.bezierCurveTo(W * 0.8, y - amp * 1.2, W * 0.92, y + amp * 0.4, W, y - amp * 0.5);
            ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
        };
        const grass = (x, y, hgt, color) => {
            ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round';
            [-8, 0, 8].forEach((dx, k) => {
                ctx.beginPath();
                ctx.moveTo(x + dx, y);
                ctx.quadraticCurveTo(x + dx + (k - 1) * 4, y - hgt * 0.6, x + dx + (k - 1) * 9, y - hgt * (k === 1 ? 1 : 0.75));
                ctx.stroke();
            });
        };

        const cs = 40;
        ctx.fillStyle = P.base; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = P.stripe; ctx.globalAlpha = 0.5;
        for (let x = 0; x < W; x += cs * 2) ctx.fillRect(x, 0, cs, H);
        for (let y = 0; y < H; y += cs * 2) ctx.fillRect(0, y, W, cs);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = P.edge; ctx.lineWidth = 14; ctx.strokeRect(7, 7, W - 14, H - 14);

        for (let i = 0; i < n; i++) {
            const x = cellX(i), y = cellY(i), pad = 9;
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.roundRect(x - pad, y - pad, cellW + pad * 2, cellH + pad * 2, 16); ctx.fill();
            ctx.restore();
            ctx.save();
            ctx.beginPath(); ctx.roundRect(x, y, cellW, cellH, 8); ctx.clip();
            ctx.drawImage(img, g, g + i * (realCellH + g), srcCellW, realCellH, x, y, cellW, cellH);
            ctx.restore();
        }

        ctx.save();
        ctx.font = '700 26px Georgia, serif';
        const tw = ctx.measureText(TAG_TEXT).width + 36;
        const tx = cellX(0) + cellW - tw - 12, ty = cellY(0) + 12;
        ctx.fillStyle = P.tag; ctx.globalAlpha = 0.92;
        ctx.beginPath(); ctx.roundRect(tx, ty, tw, 40, 4); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(TAG_TEXT, tx + tw / 2, ty + 21);
        ctx.restore();

        for (let i = 0; i < n; i++) {
            const y = cellY(i);
            if (i % 2 === 0) {
                branch(W + 6, y + cellH * 0.72, 118, Math.PI - 0.12);
                daisy(cellX(i) + cellW - 6, y + cellH - 26, 15);
            } else {
                branch(-6, y + cellH * 0.3, 118, 0.12);
                clover(cellX(i) + cellW - 34, y + cellH - 40, 30);
            }
        }
        branch(-6, 44, 100, 0.25);
        daisy(40, 36, 13);
        daisy(66, 22, 9);

        hill(E + 50, 16, P.hill1, 0);
        hill(E + 92, 18, P.hill2, 10);
        hill(E + 140, 14, P.hill3, 6);
        [70, 150, 250, 340, 430, 520].forEach((gx, k) => grass(gx, E + 128 + (k % 2) * 18, 20, P.leaf1));
        daisy(40, E + 150, 12); daisy(W - 44, E + 160, 12); daisy(W - 80, E + 132, 9);
        branch(-6, H - 10, 120, -Math.PI * 0.35);
        branch(W + 6, H - 10, 120, -Math.PI * 0.65);

        const px = 70, pw = W - 140, ph = 100, py = E + 34;
        ctx.save();
        ctx.shadowColor = P.shadow; ctx.shadowBlur = 16; ctx.shadowOffsetY = 5;
        ctx.fillStyle = P.plaque;
        ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 36); ctx.fill();
        ctx.restore();

        const midY = py + ph / 2, leftCx = px + pw * 0.27;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (logo) {
            const sc = Math.min(120 / logo.naturalWidth, 52 / logo.naturalHeight);
            const lw = logo.naturalWidth * sc, lh = logo.naturalHeight * sc;
            ctx.drawImage(logo, leftCx - lw / 2, py + 12, lw, lh);
        } else {
            leaf(leftCx - 14, py + 38, 28, -0.9, P.leaf2);
        }
        ctx.fillStyle = P.dark;
        ctx.font = '900 20px Arial, sans-serif';
        ctx.fillText('REPUBLIC', leftCx, py + 72);
        ctx.font = '800 16px Arial, sans-serif';
        ctx.fillText('POLYTECHNIC', leftCx, py + 90);

        ctx.strokeStyle = P.leaf3; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px + pw * 0.5, py + 20); ctx.lineTo(px + pw * 0.5, py + ph - 20); ctx.stroke();

        const esgCx = px + pw * 0.75, bw = 170, bh = 74;
        const eg = ctx.createLinearGradient(0, midY - bh / 2, 0, midY + bh / 2);
        eg.addColorStop(0, P.badgeTop); eg.addColorStop(1, P.badgeBottom);
        ctx.fillStyle = eg;
        ctx.beginPath(); ctx.roundRect(esgCx - bw / 2, midY - bh / 2, bw, bh, 22); ctx.fill();
        leaf(esgCx - 70, midY - 10, 22, -0.9, '#ffffff');
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 36px Arial, sans-serif';
        ctx.fillText('ESG', esgCx + 10, midY - 12);
        ctx.font = '600 12px Arial, sans-serif';
        ctx.fillText('Environmental,', esgCx, midY + 13);
        ctx.fillText('Social & Governance', esgCx, midY + 27);

        const label = name || 'Visitor';
        ctx.font = '700 24px Arial, sans-serif';
        const lw2 = Math.min(360, Math.max(150, ctx.measureText(label).width + 50));
        ctx.fillStyle = P.plaque;
        ctx.beginPath(); ctx.roundRect(W / 2 - lw2 / 2, E + 160, lw2, 44, 22); ctx.fill();
        ctx.fillStyle = P.dark;
        ctx.fillText(label, W / 2, E + 183);
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 20px Arial, sans-serif';
        ctx.fillText(new Date().toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' }) + '  ·  RP ESG', W / 2, E + 232);

        cache.key = key; cache.url = canvas.toDataURL('image/png'); cache.w = W; cache.h = H;
        return cache;
    }

    // ---------------- hooks (chained on top of the existing strip frames) ----------------
    const updatePreviewBeforePicker = updatePreviewWithCutout;
    updatePreviewWithCutout = function () {
        const previewPhoto = document.getElementById('preview-photo');
        const frame = previewPhoto && previewPhoto.closest('.preview-frame');

        if (!previewPhoto || !frame || !isStrip()) {
            hidePicker();
            setOverlaysVisible(true);
            window.stripColourOverride = null;
            return updatePreviewBeforePicker.apply(this, arguments);
        }

        setOverlaysVisible(false);
        renderPicker(frame);
        applyColourOverride();
        if (!isCustom()) return updatePreviewBeforePicker.apply(this, arguments);

        stopBoomerangPreview();
        const overlay = document.getElementById('selected-overlay');
        if (overlay) overlay.style.setProperty('display', 'none', 'important');
        previewPhoto.style.setProperty('object-fit', 'contain', 'important');
        const tplAtStart = state.template, colourAtStart = state.colour;
        buildCurrent()
            .then((r) => {
                // ignore results that arrive after the person switched template/colour
                if (!isStrip() || state.template !== tplAtStart || state.colour !== colourAtStart) return;
                const w = currentDevice === 'mobile' ? 240 : 300;
                frame.style.setProperty('width', w + 'px', 'important');
                frame.style.setProperty('height', Math.round(w * r.h / r.w) + 'px', 'important');
                previewPhoto.src = r.url;
            })
            .catch((e) => console.error('Strip template preview failed:', e));
    };

    const processStillBeforePicker = processFinalPhotoFromStillFrame;
    processFinalPhotoFromStillFrame = function () {
        if (!isStrip() || !isCustom()) {
            applyColourOverride();
            return processStillBeforePicker.apply(this, arguments);
        }
        return buildCurrent()
            .then((r) => { userData.processedPhoto = r.url; })
            .catch((e) => {
                console.error('Strip template failed, using previous frame:', e);
                return processStillBeforePicker.apply(this, arguments);
            });
    };

    ['returnToLandingPage', 'submitAnother', 'goHomeFromFeedbackForm'].forEach((fnName) => {
        const original = window[fnName];
        if (typeof original !== 'function') return;
        window[fnName] = function () {
            const result = original.apply(this, arguments);
            state.template = 'dream'; state.colour = 'green';
            window.stripColourOverride = null;
            hidePicker();
            setOverlaysVisible(true);
            return result;
        };
    });
})();

// ============================================================================
// ESG CENTRE PHOTO FRAME  (ordinary photos only - NOT strips, NOT boomerang)
// - Adds an "ESG Centre" option to the style page theme list
// - Fits the photo inside the frame's cutout (cover-fit, rounded corners)
// - Works whether the frame PNG's middle is transparent OR solid white
//   (if solid white, the white cutout is removed automatically)
// ============================================================================
(function esgCentreFrame() {
    const THEME_ID = 'esg-centre';
    const THEME_NAME = 'ESG Centre';
    const FRAME_SRC = '/assets/overlays/rp-esg-centre-frame.png';   
    const MAKE_DEFAULT = true;                                      // select it automatically on the style page

    // Cutout position as a fraction of the frame image (measured from your 1447 x 1087 frame).
    // If the photo overlaps the green border or leaves a gap, nudge these numbers slightly.
    const CUT = { x: 0.0746, y: 0.1656, w: 0.8530, h: 0.7195, radius: 0.022 };
    const BLEED = 0.004;   // photo tucks slightly under the green border

    let framePromise = null;
    const cache = { key: '', url: '', w: 0, h: 0 };

    function isStrip() { return Boolean(photoData) && shouldContainPhoto(photoData); }
    function isEsgStill() {
        return selectedTheme === THEME_ID && !isStrip() && Boolean(photoData) &&
            userData.captureMode !== 'boomerang' && boomerangFrames.length === 0;
    }

    // ---------- load frame, and remove the white cutout if it is solid ----------
    function punchOutCutout(g, w, h) {
        const cx = Math.round((CUT.x + CUT.w / 2) * w);
        const cy = Math.round((CUT.y + CUT.h / 2) * h);
        const img = g.getImageData(0, 0, w, h);
        const px = img.data;
        if (px[(cy * w + cx) * 4 + 3] < 200) return;   // already transparent, nothing to do

        const inset = 0.004;
        const x0 = Math.round((CUT.x + inset) * w), x1 = Math.round((CUT.x + CUT.w - inset) * w);
        const y0 = Math.round((CUT.y + inset) * h), y1 = Math.round((CUT.y + CUT.h - inset) * h);
        const isWhite = (i) => px[i + 3] > 0 && px[i] >= 236 && px[i + 1] >= 236 && px[i + 2] >= 236;

        const stack = [cx, cy];
        while (stack.length) {
            const y = stack.pop(), x = stack.pop();
            if (x < x0 || x > x1 || y < y0 || y > y1) continue;
            const i = (y * w + x) * 4;
            if (!isWhite(i)) continue;
            px[i + 3] = 0;   // make transparent (also marks as visited)
            stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
        }
        g.putImageData(img, 0, 0);
    }

    function loadFrame() {
        if (!framePromise) {
            framePromise = loadImageElement(FRAME_SRC).then((img) => {
                const c = document.createElement('canvas');
                c.width = img.naturalWidth;
                c.height = img.naturalHeight;
                const g = c.getContext('2d', { willReadFrequently: true });
                g.drawImage(img, 0, 0);
                punchOutCutout(g, c.width, c.height);
                return c;
            }).catch((error) => { framePromise = null; throw error; });
        }
        return framePromise;
    }

    // ---------- compose photo + frame ----------
    async function compose(outW) {
        const [frame, img] = await Promise.all([loadFrame(), loadImageElement(photoData)]);
        const key = [photoData.length, photoData.slice(-40), outW].join('|');
        if (cache.key === key) return cache;

        const W = outW, H = Math.round(outW * frame.height / frame.width);
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

        const bleed = BLEED * W;
        const cx = CUT.x * W - bleed, cy = CUT.y * H - bleed;
        const cw = CUT.w * W + bleed * 2, ch = CUT.h * H + bleed * 2;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(cx, cy, cw, ch, CUT.radius * W);
        ctx.clip();
        const scale = Math.max(cw / img.width, ch / img.height);   // cover fit
        const dw = img.width * scale, dh = img.height * scale;
        ctx.drawImage(img, cx + (cw - dw) / 2, cy + (ch - dh) / 2, dw, dh);
        ctx.restore();

        ctx.drawImage(frame, 0, 0, W, H);   // frame on top

        cache.key = key;
        cache.url = canvas.toDataURL('image/png');
        cache.w = W; cache.h = H;
        return cache;
    }

    // ---------- add the "ESG Centre" option to the theme list ----------
    function injectThemeOption() {
        const list = document.getElementById('overlay-options');
        if (!list) return;

        overlayData[THEME_ID] = {
            desktop_filename: FRAME_SRC,
            mobile_filename: FRAME_SRC,
            display_name: THEME_NAME
        };

        if (!list.querySelector('[data-esg-centre]')) {
            const option = document.createElement('div');
            option.className = 'theme-option';
            option.dataset.esgCentre = '1';
            option.onclick = () => selectTheme(THEME_ID, option);
            option.innerHTML =
                '<div class="theme-swatch" style="background:#4a9d3f url(\'' + FRAME_SRC + '\') center/cover no-repeat;"></div>' +
                '<div class="theme-name">' + THEME_NAME + '</div>';
            list.insertBefore(option, list.firstChild);
        }

        if (MAKE_DEFAULT) {
            setTimeout(() => {
                const el = list.querySelector('[data-esg-centre]');
                if (el) selectTheme(THEME_ID, el);
            }, 250);   // after feedback.js picks its own default (100ms)
        }
    }

    const loadOverlayOptionsBase = loadOverlayOptions;
    loadOverlayOptions = async function () {
        await loadOverlayOptionsBase.apply(this, arguments);
        injectThemeOption();
    };

    // ---------- style page preview ----------
    function resetPreviewLook(previewPhoto, overlay) {
        if (overlay) overlay.style.removeProperty('display');
        const frame = previewPhoto && previewPhoto.closest('.preview-frame');
        if (frame) {
            frame.style.removeProperty('width');
            frame.style.removeProperty('height');
            frame.style.removeProperty('max-width');
        }
        if (previewPhoto) previewPhoto.style.removeProperty('object-fit');
    }

    const updatePreviewBeforeEsg = updatePreviewWithCutout;
    updatePreviewWithCutout = function () {
        const previewPhoto = document.getElementById('preview-photo');
        const overlay = document.getElementById('selected-overlay');

        if (!previewPhoto || !isEsgStill()) {
            resetPreviewLook(previewPhoto, overlay);
            return updatePreviewBeforeEsg.apply(this, arguments);
        }

        stopBoomerangPreview();
        updateBoomerangPreviewControls(hasRestorableBoomerang());
        if (overlay) overlay.style.setProperty('display', 'none', 'important');
        previewPhoto.style.setProperty('object-fit', 'contain', 'important');

        compose(1000)
            .then((r) => {
                if (!isEsgStill()) return;   // user switched theme while loading
                const frame = previewPhoto.closest('.preview-frame');
                if (frame) {
                    const w = currentDevice === 'mobile' ? 324 : 560;
                    frame.style.setProperty('width', w + 'px', 'important');
                    frame.style.setProperty('max-width', '100%', 'important');
                    frame.style.setProperty('height', Math.round(w * r.h / r.w) + 'px', 'important');
                }
                previewPhoto.src = r.url;
            })
            .catch((error) => console.error('ESG Centre frame preview failed:', error));
    };

    // ---------- final saved / emailed image ----------
    const processStillBeforeEsg = processFinalPhotoFromStillFrame;
    processFinalPhotoFromStillFrame = function () {
        if (!isEsgStill()) return processStillBeforeEsg.apply(this, arguments);

        return compose(1600)
            .then((r) => { userData.processedPhoto = r.url; })
            .catch((error) => {
                console.error('ESG Centre frame failed, using standard frame:', error);
                return processStillBeforeEsg.apply(this, arguments);
            });
    };
})();