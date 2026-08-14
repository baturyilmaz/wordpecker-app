# Langsift Phase 2

## Flow

`Article Preview → choose level → generate Lesson → overview → words and expressions → Know / Don't Know / Save`

Quiz, Vocabulary aggregation, and SRS remain outside this phase.

## Identity and level

The frontend creates `guest_<crypto.randomUUID()>` once and stores it in `langsift-guest-id`. Every Article, Lesson, and interaction request sends that ID in `user-id`. Article and Lesson reads enforce owner equality.

The four UI levels are `basic`, `intermediate` (default), `upper_intermediate`, and `advanced`. The preference is stored in `langsift-english-level`, explicitly sent during generation, and copied to immutable `levelAtGeneration`.

## Lesson schema

`Lesson` stores `ownerId`, an `articleId` reference, `levelAtGeneration`, generation status, summary, difficulty, learning focus, embedded AI-content items, generation metadata, failure details, and timestamps. It never copies Article content. `(ownerId, articleId, levelAtGeneration)` is unique.

Each item has a stable Mongo subdocument ID, type, term, contextual Chinese meaning, verified source sentence, concise explanation, transferable example, and optional importance/difficulty fields.

`LessonInteraction` separately stores owner, lesson, item, article, term, `knowledgeStatus` (`unset|known|unknown`), and independent `saved`. This preserves `unknown + saved` and supports future Vocabulary queries.

## AI generation (prompt v2)

- Provider and model use the central OpenAI-compatible configuration and `OPENAI_MODEL`.
- Structured output uses the existing Agents SDK and strict Zod schema.
- Prompt version: `v2`.
- Initial generation targets 14 candidates and requests 12–15; the final Lesson still accepts 8–15 valid items.
- The prompt prioritizes reusable phrases and level-appropriate value instead of raw difficulty.
- Recent known and unknown terms are supplied separately, capped at 50 each.
- Article input is capped at 30,000 characters near a sentence boundary; `truncated` is recorded.
- Generation has one initial run, item-level salvage, and at most two missing-only refill runs under one 60-second timeout.
- Terms absent from the Article are rejected. Every accepted term is located in normalized Article text and its final context is deterministically recovered from the original Article, bounded to 360 characters. AI context is only a hint.
- If at least eight candidates survive, generation succeeds immediately. If fewer survive, refill requests only the missing count plus a two-item buffer; accepted items and the overview are preserved and refill terms are deduplicated.
- Duration, configured model, provider hostname, item count (through items), Article word count, generated time, prompt version, and truncation status are recorded. Token usage is omitted because the current SDK path does not expose it without broader changes.
- Metadata also records `initialRawCount`, `finalValidCount`, and `refillCount`; per-attempt counts, reject reasons, and duration are logged without model output or Article duplication.

## API and errors

- `POST /api/lessons` — `{ articleId, level }`; returns an existing lesson for the same owner/article/level.
- `GET /api/lessons/:id`
- `PUT /api/lessons/:lessonId/items/:itemId/interaction`

Errors: `ARTICLE_NOT_FOUND`, `ARTICLE_FORBIDDEN`, `INVALID_LEVEL`, `LESSON_GENERATION_FAILED`, `LESSON_OUTPUT_INVALID`, `LESSON_NOT_FOUND`, `LESSON_FORBIDDEN`, and `INVALID_INTERACTION`.

## Verification

Reverified 2026-08-13 with prompt v2 and the model selected by `OPENAI_MODEL`:

| Article | Initial raw | Initial valid | Refills | Final valid | Duration | Status |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Phys.org | 12 | 10 | 0 | 10 | 16.7s | READY |
| Guardian | 14 | 14 | 0 | 14 | 17.7s | READY |
| BBC #1 | 13 | 12 | 0 | 12 | 16.6s | READY |
| BBC #2 | 12 | 12 | 0 | 12 | 12.6s | READY |
| Jessica Adams | 13 | 11 | 0 | 11 | 18.1s | READY |

All accepted terms and recovered contexts matched the saved Article. Median successful generation was 16.7 seconds and maximum was 18.1 seconds. Jessica Adams first encountered one transient SDK `Invalid output type`; the persisted failed Lesson was then regenerated successfully through the normal retry path.

Guardian Basic/Intermediate/Advanced produced 13/14/13 items. Pairwise overlap was 7, 7, and 5 terms, with 5 Basic-only, 4 Intermediate-only, and 5 Advanced-only terms. Interaction regression persisted known, unknown, and unknown+saved states across a fresh GET.

Automated verification passed: 71 backend tests, backend build, frontend build, and targeted lint for modified Langsift files.

## Known limitations

- AI quality and provider latency remain nondeterministic; one real initial call returned an invalid structured output before succeeding through failed-Lesson regeneration.
- Concurrent duplicate requests return the unique in-progress Lesson and the frontend polls its status; there is no background job queue yet.
- Generating Lessons older than two minutes are treated as stale and can regenerate; an active generating Lesson is reused.
- Guest identity isolates browser data but is not authentication. Future registration must migrate guest-owned records.

## Next boundary

Quiz should reference `lessonId` and stable Lesson item IDs. Vocabulary should aggregate `unknown` or `saved` interactions; simplified SRS should be added only after that query contract is defined.
