# Langsift Phase 1

## Scope

Phase 1 implements the first Langsift path:

`Paste URL → validate → fetch public HTML → extract → save Article → preview`

It does not generate a Lesson, vocabulary, quiz, or SRS review.

## Article contract

`Article` is independent from the legacy `WordList`. It stores owner ID, original and canonical URLs, title, source, optional author/date, English plain-text content, excerpt, word count, extraction status/failure fields, and timestamps. A unique partial index on `(ownerId, canonicalUrl)` deduplicates successful extractions.

Endpoints:

- `POST /api/articles/extract` with `{ "url": "https://..." }`
- `GET /api/articles/:id`

## Extraction architecture

1. URL validation accepts only HTTP(S), rejects credentials/internal hostnames and private, loopback, link-local, or metadata addresses after DNS resolution.
2. The fetcher revalidates every redirect, limits redirects, response time and body size, identifies blocked HTTP responses, and accepts HTML only.
3. Mozilla Readability runs in JSDOM and returns clean article text and available metadata.
4. Deterministic quality checks require at least 120 words and a strong English-text signal.

Raw HTML is never persisted. Paywalls, authentication, browser cookies, anti-bot bypasses, and cached copies are not used.

## Error codes

- `INVALID_URL`
- `ARTICLE_UNAVAILABLE`
- `ARTICLE_BLOCKED`
- `ARTICLE_TOO_SHORT`
- `NOT_ENGLISH`
- `FETCH_TIMEOUT`
- `UNSUPPORTED_CONTENT`

Responses expose only `{ code, message }`; internal errors remain in backend logs.

## Sample URL results

Verified on 2026-08-13:

- Phys.org: PASS — 945 words
- The Guardian: PASS — 509 words, expected title extracted
- BBC sample 1: PASS — 507 words
- BBC sample 2: PASS — 688 words
- Jessica Adams: PASS — 908 words; the large inline discussion thread is removed before readability parsing

## Known limitations

- Generic readability extraction can still retain unusual publisher-specific live-page modules that do not use common article or comment semantics.
- The current quality classifier is deterministic and English-only.
- Fetching is server-side HTML only; JavaScript-only articles may return an unavailable or too-short error.

## Next phase interface

The next phase should create a separate `Lesson` that references `articleId`. It should consume the saved clean Article content rather than refetching the URL or copying the Article document.

Future scope: **Phase 2: EPUB/PDF content import**. Do not expand the Article URL API into a generic file-ingestion API.
