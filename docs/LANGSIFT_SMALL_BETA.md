# Langsift Small Beta Runbook

This runbook freezes the known-good production baseline and defines the operating process for a private **5–10 user** Small Beta. It does not authorize public promotion or new product features.

## Production checkpoint and rollback

| Item | Known-good value |
| --- | --- |
| Production URL | `https://langsift.app` |
| Production commit | `1b3fa54e7f8a197f18011fdb3ecb6fcb7f26128c` |
| Production deployment | `dpl_Gdrozv1FogKTnvDa8ChAFSncstca` (`langsift-r5xwx917u-sofies-projects-d09e6e0a.vercel.app`) |
| Stable annotated tag | `small-beta-v1` |
| Runtime | Node 24.x |

### Roll back production in Vercel

Use this when a later deployment has a production regression. It changes the production alias; it does not erase deployments or rewrite Git history.

1. In the project directory, confirm that Vercel CLI is authenticated: `npx vercel whoami`.
2. Inspect the known-good deployment: `npx vercel inspect dpl_Gdrozv1FogKTnvDa8ChAFSncstca`.
3. Point Production back to it: `npx vercel rollback dpl_Gdrozv1FogKTnvDa8ChAFSncstca`.
4. Confirm `https://langsift.app/api/health` returns `200` JSON.
5. Confirm `/` returns HTML and anonymous `/api/auth/me` returns `401` JSON.
6. Record the time, reason, affected action, and any safe request ID. Never copy credentials or user content into the incident note.

The Vercel dashboard alternative is **Project → Deployments → known-good deployment → Promote to Production**. Verify the deployment ID before confirming.

### Return `develop` to the known-good code without force-push

Do not reset or force-push the shared branch. Revert later commits so history stays auditable:

```bash
git switch develop
git pull --ff-only origin develop
git switch -c rollback/small-beta-v1
git log --oneline small-beta-v1..HEAD
git revert --no-edit small-beta-v1..HEAD
git push -u origin rollback/small-beta-v1
```

Review the revert diff and gates, then merge that branch into `develop`. If the log range is empty, the branch is already at the checkpoint and no revert is needed. The original checkpoint can always be inspected with `git show small-beta-v1`.

## Cohort and sharing

Privately share `https://langsift.app` with 5–10 people who already have an English foundation, use English as their main foreign language, genuinely read English web articles, and often encounter language they partly understand but do not want to stop and look up repeatedly. Do not recruit zero-beginner users merely to fill the cohort, publish the link broadly, or add an invite system.

Ask each participant to try the complete article workflow on material they would normally read. Do not ask them to test PDF, EPUB, YouTube, screenshots, mobile apps, payments, or gamification.

## Aggregate Beta metrics

The existing first-party ProductEvent stream is the source for the six product metrics. It stores internal resource IDs and allowlisted metadata, not email, article content, credentials, session data, or prompts.

```bash
# All recorded data
npm run metrics:beta

# Rolling seven-day window
npm run metrics:beta -- --days 7

# Explicit UTC/ISO start
npm run metrics:beta -- --since 2026-08-19T00:00:00Z
```

The output is aggregate-only and includes:

- **Activation / unique activated users:** a user with at least one successful `lesson_created` event.
- **Lesson creators:** distinct resolved owners with at least one successful Lesson.
- **Lesson engagement:** the existing Quiz Start proxy for a Lesson created by that owner.
- **Quiz starters:** distinct owners who start at least one Quiz.
- **Term savers:** distinct owners who save at least one Lesson item.
- **Second Lesson users:** distinct owners with at least two distinct Lesson IDs.
- **Review Return users:** a `review_started` event on a UTC date later than the owner’s first Lesson date.

Refreshes, retries, multiple sessions, and Guest → User migration use durable resource dedupe keys. They must not create a second Activation, Quiz Start, or Lesson. Review activity later on the same UTC day is not a return.

### Lesson generation quality aggregates

The same command queries aggregate Lesson metadata for the selected time window:

- normal Lesson count: ready Lessons with **8–15** items;
- low-density Lesson count: ready Lessons with **5–7** items, reported separately and never counted as normal success;
- average ready-Lesson item count;
- generation count and average generation duration;
- failed Lesson count.

Do not export Article bodies into analytics. Token totals may be added only if they are already reliably available as aggregate generation metadata; no SDK rewrite is justified for the Beta.

## Lesson quality sampling

Manually review each participant’s first 1–2 Lessons. Keep only a private, minimal sampling note with level, article title/source, item count, and normal/low-density status. Do not paste the full Article or credentials.

For the items, check:

- terms that are too easy;
- terms that are unusually obscure;
- valuable multi-word phrases;
- correctness in the source context;
- clear English definitions;
- correct and useful Chinese support.

The initial target is **at least 80% of Lesson items rated useful/appropriate by participants**. If many items are too easy, prioritize personalized selection. If many are too hard, prioritize level interpretation. Do not respond by adding unrelated features.

## Feedback process

Use only these four short prompts:

1. Were the selected words and expressions worth learning?
2. Were they too easy, too hard, or about right?
3. Did anything feel confusing or slow?
4. Would you use Langsift again for another article?

The header provides a `Send feedback` link to `hi@langsift.app`, prefilled with these four prompts. Participants may also respond through the private channel used for their invitation.

## Error and health response

Every response includes `X-Request-Id`. When a participant reports an error:

1. Ask for approximate time, page, and action. Ask for the request ID only if it is visible.
2. Inspect Vercel runtime logs around that time and search the request ID.
3. Record only a safe category such as validation, authentication, network, generation, or database.
4. Never copy a token, cookie, MongoDB URI, Article body, Google credential, or raw request body into a report.

For an apparent whole-site outage, check in order:

1. current Vercel deployment status and alias;
2. `https://langsift.app/api/health` status and JSON content type;
3. MongoDB Atlas service/network status;
4. recent Vercel runtime errors and request IDs.

No paid uptime, Sentry, PostHog, or other new monitoring service is required for this Small Beta.

## Privacy and data deletion

The public `/privacy` page describes Google identity data, submitted/extracted Article content, learning records, AI-provider processing, product improvement, and the no-sale commitment. Privacy, feedback, and deletion requests use `hi@langsift.app`.

Logout is available in the profile menu. Account deletion is a maintainer-operated process during the Beta:

1. Receive the request through the same private channel and confirm the Google account email with the requester. Do not put it in an issue or log.
2. Identify the internal User ID and resolved `user_<id>` owner in a protected Atlas session.
3. Before deletion, count—not export—the matching User, Session, Article, Lesson, LessonInteraction, LessonQuiz, ReviewState, ProductEvent, and GuestMigration records.
4. Delete those records in a MongoDB transaction where supported. Delete child learning/session/event records before the User record. Never delete by an unverified display name.
5. Re-run the counts and confirm zero records for that internal user/owner. Record only completion time and aggregate counts.

This is intentionally manual for 5–10 users. Do not commit database exports, identifiers, or dumps to Git.

## Cost, abuse, and recovery limits

- Keep Vercel Hobby and MongoDB Atlas Free for the Small Beta.
- Atlas Free is acceptable for this validation period but is not a long-term enterprise backup solution.
- If a manual recovery copy is needed, use Atlas export tools from a protected maintainer machine, encrypt the output, store it outside the repository, restrict access, and set a deletion date. Never commit a dump.
- The existing process-local rate limiter is acceptable for private sharing. Do not add Redis.
- If bot traffic, API-key abuse, or unusual Lesson generation volume appears, stop sharing the URL and investigate before inviting anyone else.
- Observe aggregate generation count, duration, and failures to protect AI cost.

## Next-stage boundaries

Do not build new input types during this Beta. Reconsider PDF, YouTube, or screenshot input only after the web Article workflow demonstrates retention and real participants repeatedly request those formats.

After Beta validation, a possible next major stage is an Android client. It must reuse the same REST API and the same User, Article, Lesson, Quiz, Vocabulary, and Review domains. Web-only Google GIS is not the Android sign-in design; a future native client should exchange a native Google credential with the Langsift backend. This runbook records that constraint only and does not authorize Android implementation.

## Release acceptance checklist

- Technical: Production deployment READY; `/`, `/api/health`, and anonymous `/api/auth/me` satisfy their contracts.
- Product: URL → Article → Lesson → Quiz → Google Login → migration → Vocabulary → Review → Dashboard remains healthy.
- Auth: real Google login and session persistence remain healthy.
- Analytics: all six metrics and Lesson quality aggregates are measurable for an explicit time window.
- Quality: first 1–2 Lessons per participant have an 80% usefulness sampling process.
- Feedback: the header mail link and private-channel method are available.
- Privacy: `/privacy` is public and provides the operator contact.
- Rollback: commit, deployment ID, stable tag, and non-destructive recovery commands are known.
- Cost: Vercel Hobby and Atlas Free remain in use.
