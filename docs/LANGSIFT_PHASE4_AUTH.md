# Langsift Phase 4 Auth

## Architecture

Google Identity Services (GIS) renders the official sign-in button in the frontend. Its credential callback sends the Google ID token once to `POST /api/auth/google`. The backend verifies the token with `google-auth-library` and the configured audience, then finds or creates a Google-backed `User` by `(provider, providerSubject)`.

After login, Langsift issues its own opaque random session token. Only the token hash is stored in MongoDB; the raw token exists only in the `langsift_session` HttpOnly cookie. Subsequent API requests use the cookie and never reuse the Google credential.

## Environment variables

Frontend:

- `VITE_API_URL`: backend origin, normally `http://localhost:3100`.
- `VITE_GOOGLE_CLIENT_ID`: Google OAuth Web Client ID.

Backend:

- `GOOGLE_CLIENT_ID`: the same Google OAuth Web Client ID, used as the required ID-token audience.
- `FRONTEND_URL`: the one allowed CORS and authenticated mutation origin, normally `http://localhost:5173`.
- `SESSION_COOKIE_NAME`: optional cookie name; defaults to `langsift_session`.
- `SESSION_DAYS`: optional session lifetime; defaults to 30 days.

The Client ID is configuration, not a secret. No Client Secret, Google access token, refresh token, raw Google credential, or raw Langsift session token is stored. `.env.example` contains placeholders only.

## Models

### User

`User` stores `provider=google`, immutable identity key `providerSubject` (Google `sub`), email attributes, optional display name/avatar, optional English level, timestamps, and `lastLoginAt`. A unique compound index covers `(provider, providerSubject)`. Email is not an identity key.

### AuthSession

`AuthSession` stores `userId`, SHA-256 `tokenHash`, timestamps, `expiresAt`, `lastSeenAt`, and optional `guestIdAtLogin`. A Mongo TTL index deletes expired sessions, while middleware also rejects expired records immediately.

### GuestMigration

`GuestMigration` has a unique `(guestId, userId)` index, status, migrated timestamp, and per-domain counts. It contains no credentials.

## Identity and guest migration

Owner namespaces remain deliberately small and compatible with the Phase 1–3 schema:

- Anonymous: `guest_<uuid>`
- Authenticated: `user_<MongoUserId>`

`optionalAuth` resolves identity once. A valid session always wins over the anonymous `user-id` header, so an authenticated client cannot switch owners by forging a header. `requireAuth` returns `401 AUTH_REQUIRED` where sign-in is mandatory.

Legacy Phase 0 routes keep their anonymous local-ID compatibility, but use the same session-first resolver. Once authenticated, their historical header can no longer override the server-derived user namespace.

On Google login, migration covers `Article`, `Lesson`, `LessonInteraction`, `LessonQuiz`, and `ReviewState`. It remaps references, merges unique-key collisions, and records the result. Supported Mongo deployments use a transaction. The local standalone Mongo path uses the same collision-aware, restartable operations; the unique audit record makes retries idempotent. If an item reference cannot be mapped safely, migration stops instead of deleting data.

The frontend removes the migrated guest ID after successful login. Logout revokes the server session, clears the cookie, and creates a fresh anonymous guest ID without deleting user data.

## Trigger rules

Guests can extract an article, create/read a lesson, mark “I know this” / “I don’t know this,” and complete a quiz.

The following actions open the lightweight auth modal and persist a short-lived pending intent:

- Save lesson
- Save term
- Open Vocabulary
- Open Review

After successful login and migration, the pending action resumes automatically. Save actions remain on the lesson page; navigation actions open their intended route.

## Security assumptions

- Google verification checks signature, issuer, expiry, and `audience=GOOGLE_CLIENT_ID` through `OAuth2Client.verifyIdToken()`.
- Only verified-email Google identities are accepted.
- Session cookies are `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` in production.
- CORS allows only `FRONTEND_URL` with credentials; wildcard origin is not used.
- Authenticated state-changing APIs require JSON plus an exact allowed `Origin`, or a matching `Referer`. This is the MVP CSRF layer in addition to SameSite cookies.
- API logs do not include Google credentials or raw session tokens.
- Google OAuth must list the frontend origin as an Authorized JavaScript Origin. An `origin_mismatch` is fixed in Google Cloud configuration, never bypassed in code.

## Dashboard contract

`GET /api/dashboard` requires auth and returns one payload:

- `continueLearning`: the latest active quiz, if any.
- `reviewDueCount`: eligible normalized terms due now.
- `vocabularyCounts`: deduplicated eligible, unknown, and saved term counts.
- `recentLessons`: up to five ready lessons with article title, source, level, date, saved timestamp, and quiz state.

The UI includes Create New Lesson, Continue Learning, Review Today, Vocabulary, and Recent Lessons. It intentionally excludes charts, XP, streaks, achievements, leaderboards, and recommendations.

## Beta metrics foundation

Existing domain timestamps and state can calculate article creation, lesson creation (including a second lesson), quiz start/completion, current vocabulary saves, and aggregate review activity. A durable event-level “Review Return” cohort metric cannot be reconstructed reliably from the current `ReviewState` counters alone. A small append-only review event should be added in the next analytics phase if that metric is required; no analytics warehouse or third-party SDK is introduced here.

## Local setup

1. Copy each `.env.example` to its local `.env` and fill the two matching Google Client ID variables.
2. Set `FRONTEND_URL=http://localhost:5173` and `VITE_API_URL=http://localhost:3100`.
3. In Google Cloud, add `http://localhost:5173` as an Authorized JavaScript Origin for the Web Client.
4. Start MongoDB, then run the backend on port 3100 and frontend on port 5173.
5. Open the frontend, trigger a protected action, and complete Google sign-in yourself. Never provide a Google password to tooling or chat.
