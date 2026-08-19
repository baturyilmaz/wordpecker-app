# Langsift Vercel + Atlas deployment

## Architecture

Vercel serves the Vite build from `frontend/dist` and sends `/api/*` to one Node 24 Express Function. The Function and local `server.ts` both use the same Express app and routes. MongoDB Atlas is the production database; a warm Function reuses a module-level connection promise. The browser uses same-origin `/api` requests by default, while a future Android client can call the same HTTPS REST API directly.

The in-memory rate and lesson-concurrency limiters are best-effort per Function instance. They are not distributed limits.

## Vercel setup

1. Import the repository with its root as the project root and select the Vite preset if it is not detected.
2. Keep the production runtime at Node.js `24.x`. `vercel.json` installs both existing packages, runs the root production build, publishes `frontend/dist`, preserves `/api/*`, and falls back other paths to `index.html` for React Router.
3. Add the environment variables below for Production and the appropriate Preview values. Do not commit their values.
4. Keep Fluid Compute enabled. The single API Function has a 60-second maximum duration, which covers the measured roughly 19-second lesson request while bounding runaway calls.

## Environment variables

Backend:

- `MONGODB_URL`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`
- `GOOGLE_CLIENT_ID`
- `FRONTEND_URL`
- `NODE_ENV` (`production`)
- `SESSION_COOKIE_NAME` (optional; defaults to `langsift_session`)
- `SESSION_DAYS` (optional; defaults to `30`)
- `TRUST_PROXY_HOPS` (optional; production defaults to `1`)
- `ELEVENLABS_API_KEY` (required by voice/audio features)
- `PEXELS_API_KEY` (required by stock-photo features)

Frontend build:

- `VITE_GOOGLE_CLIENT_ID`
- `VITE_API_URL` (leave unset for same-origin production; set to `http://localhost:3100` locally)

Cookies are `HttpOnly`, `Secure` in production, `SameSite=Lax`, and `Path=/`.

## Atlas and Google requirements

- Create an Atlas database/user and permit Vercel Function connectivity using the narrowest practical Atlas network policy. Put the `mongodb+srv://...` value only in Vercel's encrypted environment settings.
- Mongoose creates the declared model indexes on first production use, including provider subject uniqueness, article canonical uniqueness, session TTL, migration idempotency, and ProductEvent indexes. The local `scripts/init-mongo.js` is not used for Atlas.
- Add the exact deployed HTTPS origin to the Google OAuth Web client Authorized JavaScript origins. Use the same client ID for `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`.
- Set `FRONTEND_URL` to that exact HTTPS origin, without a trailing slash.

## Production verification

After an explicitly approved deployment, verify:

1. `/` and deep links such as `/dashboard` and `/lessons/<id>` return the SPA.
2. `GET /api/health` returns `200 {"status":"ok"}`; a database initialization failure returns `503` without configuration details.
3. `/api/auth/me` exists, Google sign-in sets a Secure HttpOnly cookie, and logout clears it.
4. Article extraction still rejects private/metadata destinations and validates every redirect.
5. Create one controlled lesson and verify its existing Article → Lesson → Quiz → Vocabulary → Review flow. Avoid repeated AI smoke calls.
6. Confirm logs contain request IDs and safe request metadata but no credentials, cookies, Mongo URI, keys, or article text.

## Rollback

Use Vercel Instant Rollback to restore the previous deployment. If schema/index creation causes an Atlas issue, stop traffic to the new deployment and investigate the declared Mongoose index without dropping data. Do not run the local Mongo initialization script against Atlas.

## Android compatibility

Business logic remains in the shared Express API. No route depends on React state, browser local storage, or HTML responses. A future Android app can use the same `/api` contracts and Atlas-backed user data; Android authentication is intentionally outside this phase.
