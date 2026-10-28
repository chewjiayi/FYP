// - Flagged feedback analysis:
//   * Added keyword-based flagging for potential issues (e.g. "bad", "worst", "disappointed") (Done by Yu Kang)
//   * Admin dashboard highlights flagged feedback for review (Done by Yu Kang)

const FLAGGED_FEEDBACK_KEYWORDS = [
    'awful',
    'bad',
    'broken',
    'complaint',
    'crash',
    'disappointed',
    'disappointing',
    'dumb',
    'error',
    'fail',
    'failed',
    'frustrated',
    'hate',
    'horrible',
    'idiot',
    'inappropriate',
    'offensive',
    'pathetic',
    'poor',
    'problem',
    'rubbish',
    'stupid',
    'terrible',
    'threat',
    'useless',
    'violence',
    'violent',
    'worst'
];

function normalizeFlaggedText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function keywordMatches(text, keyword) {
    const normalizedText = normalizeFlaggedText(text).toLowerCase();
    const normalizedKeyword = normalizeFlaggedText(keyword).toLowerCase();

    if (!normalizedText || !normalizedKeyword) {
        return false;
    }

    if (normalizedKeyword.includes(' ')) {
        return normalizedText.includes(normalizedKeyword);
    }

    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedKeyword)}([^a-z0-9]|$)`, 'i');
    return pattern.test(normalizedText);
}

function getFlaggedKeywordMatches(text, keywords = FLAGGED_FEEDBACK_KEYWORDS) {
    const normalizedText = normalizeFlaggedText(text);
    if (!normalizedText) return [];

    return keywords.filter(keyword => keywordMatches(normalizedText, keyword));
}

function analyzeFlaggedFeedbackText(text, keywords = FLAGGED_FEEDBACK_KEYWORDS) {
    const normalizedText = normalizeFlaggedText(text);
    const matchedKeywords = getFlaggedKeywordMatches(normalizedText, keywords);

    return {
        flagged: matchedKeywords.length > 0,
        matchedKeywords,
        text: normalizedText
    };
}

function isFeedbackFlagged(textValues, keywords = FLAGGED_FEEDBACK_KEYWORDS) {
    return (Array.isArray(textValues) ? textValues : [textValues])
        .some(value => analyzeFlaggedFeedbackText(value, keywords).flagged);
}

module.exports = {
    FLAGGED_FEEDBACK_KEYWORDS,
    analyzeFlaggedFeedbackText,
    getFlaggedKeywordMatches,
    isFeedbackFlagged,
    normalizeFlaggedText
};
