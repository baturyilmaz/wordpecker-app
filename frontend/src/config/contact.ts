export const CONTACT_EMAIL = 'hi@langsift.app';

const feedbackSubject = 'Langsift Small Beta feedback';
const feedbackBody = `1. Were the selected words and expressions worth learning?
2. Were they too easy, too hard, or about right?
3. Did anything feel confusing or slow?
4. Would you use Langsift again for another article?`;

export const FEEDBACK_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(feedbackSubject)}&body=${encodeURIComponent(feedbackBody)}`;
