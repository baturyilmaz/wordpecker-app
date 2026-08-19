# Langsift Beta Release Contract

This document records the Phase 4.2 analytics foundation and the Phase 4.3 public-Beta release gate. In the Product Spec milestone language, the current implementation corresponds to **Product Spec Phase 7 — Beta**. The implementation and Product Spec phase numbers are intentionally different.

## ProductEvent contract

Langsift stores a minimal first-party `ProductEvent` stream in MongoDB:

- `article_extracted`
- `lesson_created`
- `lesson_opened`
- `quiz_started`
- `quiz_completed`
- `term_saved`
- `vocabulary_opened`
- `review_started`
- `review_completed`

Events contain the resolved owner, applicable internal Article/Lesson/LessonItem/Quiz IDs, an allowlisted metadata object, an optional dedupe key, and a UTC timestamp. They do **not** contain email, article body, AI prompt, quiz answers, URL, Authorization header, Google credential, cookie, session token, or API key. New Article records remove credential-like query parameters such as `token`, `signature`, `credential`, and `X-Amz-*` before URL persistence.

The partial unique MongoDB index on `dedupeKey` is the durability boundary. Event recording uses an atomic upsert. Analytics writes are awaited but best-effort: failure is logged with request ID, event name, identity type, and error class only, and never changes the successful business response.

## Canonical metric contract

`npm run metrics:beta` calculates all-time metrics over the ProductEvent rows selected by the script. Counts use distinct owner/resource identities where stated; raw event counts remain available under `eventCounts` for diagnostics.

| Metric | Numerator / value | Denominator | Triggering event | Resource and dedupe rule |
| --- | --- | --- | --- | --- |
| Activation | Distinct owners with both a successful extraction and at least one usable Lesson | Distinct owners with `article_extracted` | `lesson_created`, emitted only after a ready 5–15 item Lesson exists | One event per resolved owner + Lesson ID |
| Lesson engagement proxy | Activated owners who start a Quiz for one of their generated Lessons | Activated owners | `quiz_started` | Quiz must reference a `lesson_created` Lesson for the same owner; one per Quiz ID |
| Quiz Start | Distinct Quiz IDs started; also reports distinct owners | Not applicable (count metric) | `quiz_started` | One per resolved owner + Quiz ID |
| Vocabulary Save | Distinct LessonItem IDs saved; also reports distinct owners | Not applicable (count metric) | `term_saved` | One per resolved owner + LessonItem ID |
| Second Lesson | Activated owners with at least two distinct `lesson_created.lessonId` values | Activated owners | second distinct `lesson_created` | Refresh, retry, and duplicate Lesson IDs do not count |
| Review Return | Activated owners with `review_started` on a UTC date after their first Lesson date | Activated owners | later-day `review_started` | One event per owner + UTC date; same-day Review does not count |

The current Lesson engagement proxy deliberately uses `quiz_started`: it is a real post-generation learning action, not a page open. It does not claim that Langsift has a formal “Lesson completed” workflow. `lesson_opened` is retained as a repeatable diagnostic event and is excluded from the six canonical metrics.

## Identity and migration rules

- Guest events use `guest_<uuid>` ownership.
- Authenticated events use `user_<MongoUserId>` plus internal `userId`.
- The backend-resolved identity is authoritative; frontend owner parameters cannot override an authenticated session.
- Guest migration moves Article, Lesson, LessonInteraction, LessonQuiz, ReviewState, and ProductEvent in the same collision-aware workflow.
- Event resource IDs and dedupe keys are rebuilt from the final Article/Lesson/LessonItem/Quiz mappings.
- If Guest and User records collapse onto the same final resource, the unique final dedupe key retains one event. This prevents a retry or migration collision from manufacturing Activation, Second Lesson, Quiz Start, or Vocabulary Save.
- A completed migration audit makes repeat migration idempotent.

## Time rules

- ProductEvent timestamps and day boundaries use UTC.
- Activation, Lesson engagement, Quiz Start, Vocabulary Save, and Second Lesson are all-time within the queried event dataset.
- Second Lesson does not require a different day; it requires a different durable Lesson ID.
- Review Return requires Review activity on a UTC date after the owner’s first Lesson date. Multiple opens on the Lesson date or repeated opens on one day cannot manufacture return behavior.
- Tests inject a deterministic clock. Production data is not edited and historical events are not backfilled.

## Security gate

### URL extraction

- Only `http` and `https` URLs without embedded credentials are accepted; input is capped at 4,096 characters.
- Localhost, `.local`/`.internal` names, loopback, RFC1918, carrier-grade NAT, link-local, metadata, IPv4-mapped private IPv6, unique-local IPv6, site-local IPv6, multicast, and documentation-only addresses are rejected.
- Every hostname resolves before fetch and every returned A/AAAA address must pass validation. The actual HTTP/TLS connection uses a validated address through a pinned lookup while preserving the original Host/TLS SNI, closing the DNS-rebinding window.
- Redirects are manual, limited to five, and every target is resolved and validated before the next request.
- Fetch timeout is 12 seconds; response body is capped at 5 MiB using both declared and streamed size checks.
- Only HTML/XHTML content types are accepted. Unreachable, blocked, too-short, non-English, invalid, oversized, and unsupported responses return stable safe errors.

### Cost and request abuse

- JSON bodies are limited to 32 KiB.
- Article extraction: 30 requests per IP/hour.
- Lesson generation: 12 requests per IP/hour and at most two concurrent generations per resolved owner per process.
- LessonService reuses the same in-flight owner/article/level generation and the database has a unique owner/article/level Lesson identity.
- Generation has a 60-second abort timeout and at most two refill rounds.
- Google sign-in: 10 attempts per IP/15 minutes.
- Legacy AI/audio/voice routes retain their existing OpenAI/provider limiters; previously uncovered legacy definition/example routes are now covered at the application boundary.
- Guest users can still complete the first URL → Lesson experience without registration.

### Auth and diagnostics

- Session tokens are 256-bit opaque random values; MongoDB stores only SHA-256 hashes, so no JWT/session signing secret exists.
- The session cookie is `HttpOnly`, `SameSite=Lax`, path `/`, and `Secure` in production.
- Authenticated JSON mutations enforce the configured frontend Origin/Referer as CSRF protection.
- Credentialed CORS accepts only the configured `FRONTEND_URL`.
- Production refuses startup without a Google client ID, an HTTPS frontend URL, or a 1–90 day session duration.
- `TRUST_PROXY_HOPS` must match the hosting proxy chain so IP rate limits use the real client address.
- Every response has `X-Request-Id`. Clients never receive a stack or raw 5xx exception message. Server diagnostics retain request ID, safe route/code/identity context, model where useful, and error class without request bodies or credentials.

## Controlled verification

The isolated `controlled-beta-flow.integration.test.ts` exercises:

1. Guest Article extraction with retry.
2. First Lesson generation with retry and repeated opens.
3. Unknown interaction.
4. Quiz start/resume and completion.
5. A distinct second Article and Lesson.
6. Guest → User migration and repeat migration.
7. Authenticated term save and Vocabulary access.
8. Review on one UTC day and deterministic future-day return.
9. Direct ProductEvent count, resource, ownership, privacy, and dedupe inspection.
10. A Guest/User duplicate-resource migration collision that must remain one Lesson event.

The canonical expected result for the controlled owner is 1/1 Activation, 1/1 Lesson engagement, 1 Quiz Start, 1 Vocabulary Save, 1/1 Second Lesson, and 1/1 Review Return.

## Known non-blockers

- The legacy WordPecker frontend has pre-existing lint failures outside Langsift Beta scope.
- The production frontend bundle remains approximately 1.08 MiB and triggers Vite's 500 KiB chunk warning; Phase 4.3 introduced no material bundle regression.
- Rate and concurrency state is process-local. This is sufficient for the planned small single-service Beta; a multi-instance deployment would need a shared limiter.
- No historical ProductEvent backfill is performed. Metrics begin with recorded events only.
