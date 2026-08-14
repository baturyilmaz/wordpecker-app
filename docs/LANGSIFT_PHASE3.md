# Langsift Phase 3

## Models and APIs

- `Lesson` now accepts 5–15 useful items and stores `contentDensity` (`low` for 5–7, `normal` for 8+).
- `LessonQuiz` is an independent Langsift attempt with embedded questions and answers. Questions reference both `lessonId` and `lessonItemId`.
- Vocabulary is a live, rebuildable aggregation over `LessonInteraction` + `Lesson` + `Article`; it does not duplicate source-of-truth state or use WordList.
- `ReviewState` independently stores UTC scheduling and counters keyed by owner + normalized term.

Routes:

- `POST /api/lesson-quizzes`, `GET /api/lesson-quizzes/:id`, `PUT /api/lesson-quizzes/:quizId/questions/:questionId/answer`
- `GET /api/vocabulary?filter=all|unknown|saved|due`, `GET /api/vocabulary/:term`
- `GET /api/reviews/due`, `PUT /api/reviews/:term`

The Phase 0 discovery endpoints remain available under the explicit legacy namespace: `POST /api/legacy/vocabulary/generate-words` and `POST /api/legacy/vocabulary/get-word-details`.

All routes derive owner from the stable guest header and enforce owner-scoped reads.

## Quiz strategy

Quiz creation is deterministic and sends no Article or AI request. It creates up to ten questions from saved LessonItems, alternating `fill_in_the_blank` and `multiple_choice` when four distinct meanings are available. Fill blanks use normalized case/whitespace/punctuation answer matching. MCQ distractors use other Lesson meanings, favoring similar answer length. Attempts resume while active and persist each answer; Quiz evidence never changes explicit LessonInteraction state.

## Vocabulary and review

Eligibility is `knowledgeStatus == unknown OR saved == true`. Unknown and Saved remain independent, so known+saved stays active while known+unsaved disappears without deleting interaction history. Terms dedupe by NFKC + lowercase + collapsed whitespace and preserve an occurrence for every Article/Lesson/LessonItem context.

First eligibility creates a due-now ReviewState. Ratings schedule absolute UTC durations:

- Forgot: +10 minutes
- Unsure: +1 day
- Remembered: +3 days

Due queries require both `nextReviewAt <= now` and current Vocabulary eligibility.

## Verification

- Automated: 15 suites, 105 tests passing, including Phase 0 route namespace regression; backend/frontend build and targeted Langsift lint pass.
- Low density: 5-item schema/model/service path and two-refill controlled Article test pass without filler or duplicates.
- Browser: Guardian URL → 509-word Article → 11-item Lesson → four explicit interaction states → 10-question Quiz → Vocabulary → three Review ratings → reload completed successfully.
- State transitions: unknown→known+unsaved disappeared; known+saved remained; unknown+saved displayed both states.
- Persistence: Quiz progress/completion, interactions, Vocabulary eligibility, and Review schedules survived reload/GET.
- Performance: Article extraction about 2.9s, Lesson 19.1s, Quiz creation about 3.7s in browser (deterministic server read 23ms), Vocabulary API 10.6ms, Review due API 9.8ms.

## Known limitations

- Lessons with 5–7 items are a degraded low-density fallback, not the normal success KPI; the preferred Lesson density remains 8 or more high-value items.
- SRS is intentionally fixed-interval, not FSRS/SM-2.
- MCQ distractors are deterministic from Lesson meanings; no semantic ambiguity classifier is used.
- Vocabulary aggregation is live and appropriate for MVP scale; a rebuildable projection may be warranted at larger volume.
- Quiz results do not yet influence Lesson personalization.
- Guest identity provides isolation, not formal authentication or Guest→User migration.
