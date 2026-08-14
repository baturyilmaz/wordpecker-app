# Langsift Phase 0 Baseline

## Environment

- Recommended Node.js: 20 LTS (`v20.20.2` verified via fnm)
- npm: `10.8.2` under Node 20
- Docker: `29.7.2`
- Docker Compose: `v5.3.1`
- MongoDB: `mongo:7.0`, healthy on `localhost:27017`

Node 20 is recommended because both project Dockerfiles use `node:20-alpine`. The lockfile versions also support Node 20.

## Local startup

```bash
cd /Users/jlhy/Developer/Langsift
docker compose -f docker-compose.mongo.yml up -d

cd backend
fnm exec --using 20.20.2 npm ci
fnm exec --using 20.20.2 npm run dev

cd ../frontend
fnm exec --using 20.20.2 npm ci
fnm exec --using 20.20.2 npm run dev
```

Default URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3100`
- MongoDB: `localhost:27017`

## Environment variables

Backend required:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `MONGODB_URL`

Backend optional:

- `OPENAI_BASE_URL`
- `PORT`
- `NODE_ENV`
- `ELEVENLABS_API_KEY`
- `PEXELS_API_KEY`

Frontend:

- `VITE_API_URL`

Local `.env` files are ignored by Git and must never be committed.

AI provider, endpoint, and model selection are environment-driven. `OPENAI_BASE_URL` may be omitted to use the OpenAI SDK default endpoint; local development may point it at an OpenAI-compatible provider. Trace export is disabled for compatibility with relay credentials.

Phase 1 adds an independent Article domain and the first Langsift flow: public URL validation, safe HTML fetching, clean article extraction, MongoDB persistence, and Article Preview. See `docs/LANGSIFT_PHASE1.md`.

## Verified

- MongoDB starts healthy and survives a container stop/start without data loss.
- Backend and frontend dependencies install with `npm ci` without lockfile changes.
- Backend build passes; backend lint passes with existing warnings.
- Frontend build passes.
- Backend starts, connects to MongoDB, and serves the API on port 3100.
- Frontend renders `/lists`, `/settings`, `/templates`, and List Detail.
- List create, read, update, delete, Mongo persistence, and cleanup pass.
- AI definition generation through the configured relay returns a non-empty meaning and persists it.
- Learn and Quiz each generate an exercise/question through the relay.
- The legacy quiz update changes `learnedPoint`, and the result survives a backend restart.
- Backend and frontend use port 3100 consistently in local and Docker configuration.

## Known debt and unavailable checks

- Backend Jest exits with “No tests found”.
- Frontend lint has 139 existing errors and 9 warnings, mainly Hook-order violations and `any` types.
- `/settings` emits a React Hook-order warning in the browser.
- Deleting a List can leave orphaned Word records because cleanup operations run concurrently.
- The frontend production bundle is larger than Vite's 500 kB warning threshold.
- Voice, ElevenLabs, Pexels, Vision Garden, image generation, Light Reading, and production prompt copying were not validated in Phase 0.
- Phase 2 may add EPUB/PDF content import; file ingestion is intentionally outside the Article URL API.

## Phase 0 acceptance

**PASS** — the core stack, frontend integration, MongoDB persistence, List/Word flow, relay-backed AI definition, Learn, Quiz, and legacy progress update work on port 3100. The known quality debt above is intentionally deferred rather than expanded into Phase 0 refactoring.
