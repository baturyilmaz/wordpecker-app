# Langsift Phase 4.2 Beta Foundation

## Product events

Langsift stores a minimal, first-party `ProductEvent` stream in MongoDB. Supported events are:

- `article_extracted`
- `lesson_created`
- `lesson_opened`
- `quiz_started`
- `quiz_completed`
- `term_saved`
- `vocabulary_opened`
- `review_started`
- `review_completed`

Backend mutations record the durable milestone events. Resource or UTC-day dedupe keys prevent refreshes and retries from inflating `lesson_created`, quiz, save, vocabulary, and review lifecycle signals. `lesson_opened` intentionally allows repeat observations. Event writes are awaited but best-effort: a failed event write is safely logged and never changes the business response.

Guest events migrate to the authenticated owner alongside Article, Lesson, Interaction, Quiz, and ReviewState records. Product events store owner and internal resource IDs plus allowlisted numeric/categorical metadata. They never store article content, AI prompts, quiz free text, email, Google credentials, cookies, session tokens, or API keys.

## Beta signals

Run `npm run metrics:beta` in `backend/` to print aggregate counts without user emails:

- Activation: first `lesson_created`
- Lesson Completion proxy: `quiz_started`
- Quiz Start: `quiz_started`
- Vocabulary Save: `term_saved`
- Second Lesson: at least two `lesson_created` events for one owner
- Review Return: `review_started` on a later UTC date than the first lesson

The script also reports quiz completions and low-density lessons. `lesson_created` metadata includes content density, item count, level, model, prompt version, and generation duration, so 5–7 item fallback lessons remain separate from the normal 8–15 item KPI.

## Request diagnostics

Every backend response includes a generated `X-Request-Id`. Unexpected error logs contain only the request ID, route, status, error code, identity type, and error class name. API responses never include stack traces. Core Langsift pages show a safe message and retry action instead of exposing server details.
