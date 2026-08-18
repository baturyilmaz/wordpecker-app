import { environment } from '../../config/environment';
import { IArticle } from '../articles/model';
import {
  LessonGenerationOutput,
  LessonInitialOutputSchema,
  LessonItemOutput,
  LessonLevel,
  LessonRefillOutputSchema,
} from './contracts';
import { LessonError } from './errors';

export const LESSON_PROMPT_VERSION = 'v3';
export const MAX_ARTICLE_CHARACTERS = 30_000;
export const MIN_USABLE_ITEMS = 5;
export const PREFERRED_VALID_ITEMS = 8;
export const MAX_FINAL_ITEMS = 15;
export const MAX_REFILL_ROUNDS = 2;
export const MAX_CONTEXT_CHARACTERS = 360;
const GENERATION_TIMEOUT_MS = 60_000;

export interface PersonalizationHistory {
  knownTerms: string[];
  unknownTerms: string[];
}

export interface GenerationAttemptTelemetry {
  generationAttempt: number;
  type: 'initial' | 'refill';
  rawCount: number;
  validCount: number;
  rejectedCount: number;
  rejectReasons: Record<string, number>;
  durationMs: number;
}

export interface GeneratedLesson {
  output: LessonGenerationOutput;
  durationMs: number;
  truncated: boolean;
  initialRawCount: number;
  finalValidCount: number;
  refillCount: number;
  attempts: GenerationAttemptTelemetry[];
}

export type GenerateLesson = (
  article: IArticle,
  level: LessonLevel,
  history: PersonalizationHistory,
) => Promise<GeneratedLesson>;

export type AgentRunner = (prompt: string, signal: AbortSignal) => Promise<unknown>;

interface RejectedCandidate {
  term: string;
  reason: string;
}

interface SalvageResult {
  accepted: LessonItemOutput[];
  rejected: RejectedCandidate[];
}

export const normalizeLessonText = (value: string): string => value
  .normalize('NFKC')
  .replace(/[“”]/g, '"')
  .replace(/[‘’]/g, "'")
  .replace(/\s+/g, ' ')
  .trim()
  .toLocaleLowerCase();

const normalizeWithOffsets = (value: string): { text: string; offsets: number[] } => {
  let text = '';
  const offsets: number[] = [];
  for (let index = 0; index < value.length;) {
    const codePoint = value.codePointAt(index);
    if (codePoint === undefined) break;
    const original = String.fromCodePoint(codePoint);
    const transformed = original.normalize('NFKC')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .toLocaleLowerCase();
    for (const character of transformed) {
      if (/\s/.test(character)) {
        if (text && text[text.length - 1] !== ' ') {
          text += ' ';
          offsets.push(index);
        }
      } else {
        text += character;
        offsets.push(index);
      }
    }
    index += original.length;
  }
  if (text.endsWith(' ')) {
    text = text.slice(0, -1);
    offsets.pop();
  }
  return { text, offsets };
};

const exampleDemonstratesTerm = (term: string, example: string): boolean => {
  const stopWords = new Set(['a', 'an', 'the', 'of', 'to', 'for', 'with', 'and', 'or', 'in', 'on']);
  const originalTokens = term.match(/[A-Za-z0-9]+/g) || [];
  const acronymTokens = originalTokens.filter((token) => token.length === 1 && token === token.toUpperCase());
  const meaningfulTokens = originalTokens
    .filter((token) => token.length >= 2 || token === token.toUpperCase())
    .map((token) => token.toLocaleLowerCase())
    .filter((token) => !stopWords.has(token));
  if (!meaningfulTokens.length) return true;
  const normalizedExample = normalizeLessonText(example);
  if (acronymTokens.some((token) => !new RegExp(`\\b${token}\\b`, 'i').test(normalizedExample))) return false;
  const matches = meaningfulTokens.filter((token) => new RegExp(`\\b${token}\\b`, 'i').test(normalizedExample)).length;
  return matches >= Math.max(1, Math.ceil(meaningfulTokens.length * 0.5));
};

export const truncateArticleContent = (content: string) => {
  if (content.length <= MAX_ARTICLE_CHARACTERS) return { content, truncated: false };
  const candidate = content.slice(0, MAX_ARTICLE_CHARACTERS);
  const boundary = Math.max(candidate.lastIndexOf('. '), candidate.lastIndexOf('? '), candidate.lastIndexOf('! '), candidate.lastIndexOf('\n'));
  return {
    content: candidate.slice(0, boundary > MAX_ARTICLE_CHARACTERS * 0.8 ? boundary + 1 : MAX_ARTICLE_CHARACTERS),
    truncated: true,
  };
};

const findLeftBoundary = (content: string, termStart: number, minimum: number): number | null => {
  for (let index = termStart - 1; index >= minimum; index -= 1) {
    if ('.!?\n'.includes(content[index])) return index + 1;
  }
  return null;
};

const findRightBoundary = (content: string, termEnd: number, maximum: number): number | null => {
  for (let index = termEnd; index < maximum; index += 1) {
    if ('.!?\n'.includes(content[index])) return index + (content[index] === '\n' ? 0 : 1);
  }
  return null;
};

export const recoverArticleContext = (articleContent: string, term: string): string | null => {
  const normalizedTerm = normalizeLessonText(term);
  if (!normalizedTerm) return null;
  const normalizedArticle = normalizeWithOffsets(articleContent);
  const normalizedIndex = normalizedArticle.text.indexOf(normalizedTerm);
  if (normalizedIndex < 0) return null;

  const originalStart = normalizedArticle.offsets[normalizedIndex];
  const finalOffset = normalizedArticle.offsets[normalizedIndex + normalizedTerm.length - 1];
  if (originalStart === undefined || finalOffset === undefined) return null;
  const originalEnd = finalOffset + (String.fromCodePoint(articleContent.codePointAt(finalOffset) || 0).length || 1);
  const searchRadius = MAX_CONTEXT_CHARACTERS;
  const leftLimit = Math.max(0, originalStart - searchRadius);
  const rightLimit = Math.min(articleContent.length, originalEnd + searchRadius);
  let start = findLeftBoundary(articleContent, originalStart, leftLimit) ?? Math.max(0, originalStart - 140);
  let end = findRightBoundary(articleContent, originalEnd, rightLimit) ?? Math.min(articleContent.length, originalEnd + 180);

  if (end - start > MAX_CONTEXT_CHARACTERS) {
    const available = MAX_CONTEXT_CHARACTERS - (originalEnd - originalStart);
    start = Math.max(0, originalStart - Math.floor(available * 0.45));
    end = Math.min(articleContent.length, start + MAX_CONTEXT_CHARACTERS);
    if (end < originalEnd) {
      end = originalEnd;
      start = Math.max(0, end - MAX_CONTEXT_CHARACTERS);
    }
  }

  const context = articleContent.slice(start, end).replace(/\s+/g, ' ').trim();
  return context && normalizeLessonText(context).includes(normalizedTerm) ? context : null;
};

const rejectReasonCounts = (rejected: RejectedCandidate[]): Record<string, number> => rejected.reduce<Record<string, number>>(
  (counts, item) => ({ ...counts, [item.reason]: (counts[item.reason] || 0) + 1 }),
  {},
);

export const salvageLessonItems = (
  candidates: LessonItemOutput[],
  articleContent: string,
  acceptedTerms: Set<string> = new Set(),
): SalvageResult => {
  const accepted: LessonItemOutput[] = [];
  const rejected: RejectedCandidate[] = [];
  const seen = new Set(acceptedTerms);

  for (const item of candidates) {
    const key = normalizeLessonText(item.term);
    if (seen.has(key)) {
      rejected.push({ term: item.term, reason: 'duplicate_term' });
      continue;
    }
    const contextSentence = recoverArticleContext(articleContent, item.term);
    if (!contextSentence) {
      rejected.push({ term: item.term, reason: 'term_absent' });
      continue;
    }
    if (normalizeLessonText(item.exampleSentence) === normalizeLessonText(contextSentence)) {
      rejected.push({ term: item.term, reason: 'example_repeats_context' });
      continue;
    }
    if (!exampleDemonstratesTerm(item.term, item.exampleSentence)) {
      rejected.push({ term: item.term, reason: 'invalid_example' });
      continue;
    }
    seen.add(key);
    accepted.push({ ...item, contextSentence });
  }
  return { accepted, rejected };
};

export const validateLessonAgainstArticle = (
  output: LessonGenerationOutput,
  articleContent: string,
): string[] => {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const item of output.items) {
    const key = normalizeLessonText(item.term);
    if (seen.has(key)) errors.push(`Duplicate term: ${item.term}`);
    seen.add(key);
    if (!recoverArticleContext(articleContent, item.term)) errors.push(`Term is absent from article: ${item.term}`);
    if (!normalizeLessonText(articleContent).includes(normalizeLessonText(item.contextSentence))) {
      errors.push(`Context is not verbatim article text: ${item.term}`);
    }
    if (normalizeLessonText(item.exampleSentence) === normalizeLessonText(item.contextSentence)) {
      errors.push(`Example repeats original context: ${item.term}`);
    }
    if (!exampleDemonstratesTerm(item.term, item.exampleSentence)) {
      errors.push(`Example does not clearly demonstrate term: ${item.term}`);
    }
  }
  return errors;
};

export const repairLessonContexts = (
  output: LessonGenerationOutput,
  articleContent: string,
): LessonGenerationOutput => ({
  ...output,
  items: salvageLessonItems(output.items, articleContent).accepted,
});

const buildInitialPrompt = (
  article: IArticle,
  content: string,
  level: LessonLevel,
  history: PersonalizationHistory,
) => `Create a personalized Langsift lesson with 12 to 15 candidate items; aim for 14.

Target learner: an English learner with an existing foundation who actively reads English content.
Instruction language: English-first, Chinese-assisted. English definitions and explanations are primary; Chinese is only a short supporting gloss.
Selected level: ${level}
Level calibration: basic uses simple English definitions; intermediate uses natural learner English; upper_intermediate adds nuance and collocation; advanced emphasizes nuance, register, collocation, and sophisticated usage.
Recent known terms (avoid unless a valuable new phrase/meaning): ${history.knownTerms.join(', ') || 'none'}
Recent unknown terms (use only as a compressed signal of learner boundary): ${history.unknownTerms.join(', ') || 'none'}

Article title: ${article.title}
Source: ${article.source}
Article content:
---
${content}
---`;

const buildRefillPrompt = (
  article: IArticle,
  content: string,
  level: LessonLevel,
  acceptedTerms: string[],
  rejected: RejectedCandidate[],
  needed: number,
) => `Add ${needed} new learning-item candidates to this Langsift lesson.

Target learner: an English learner with an existing foundation who actively reads English content.
Instruction language: English-first, Chinese-assisted. English definitions and explanations are primary; Chinese is only a short supporting gloss.
Selected level: ${level}
Level calibration: basic uses simple English definitions; intermediate uses natural learner English; upper_intermediate adds nuance and collocation; advanced emphasizes nuance, register, collocation, and sophisticated usage.
Already accepted terms: ${JSON.stringify(acceptedTerms)}
Rejected terms: ${JSON.stringify(rejected)}

Article title: ${article.title}
Source: ${article.source}
Article content:
---
${content}
---`;

const logAttempt = (article: IArticle, telemetry: GenerationAttemptTelemetry) => {
  if (environment.nodeEnv !== 'test') console.info('Lesson generation attempt', { articleId: article._id, ...telemetry });
};

export const generateLessonWithRunners = async (
  article: IArticle,
  level: LessonLevel,
  history: PersonalizationHistory,
  runInitial: AgentRunner,
  runRefill: AgentRunner,
): Promise<GeneratedLesson> => {
  const startedAt = Date.now();
  const truncatedArticle = truncateArticleContent(article.content);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);
  const attempts: GenerationAttemptTelemetry[] = [];

  try {
    const initialStartedAt = Date.now();
    const initialRaw = await runInitial(
      buildInitialPrompt(article, truncatedArticle.content, level, history),
      controller.signal,
    );
    const initialParsed = LessonInitialOutputSchema.safeParse(initialRaw);
    if (!initialParsed.success) {
      throw new LessonError('LESSON_OUTPUT_INVALID', `Initial lesson output was invalid: ${initialParsed.error.issues[0]?.message || 'schema mismatch'}`);
    }

    const initialSalvage = salvageLessonItems(initialParsed.data.items, article.content);
    const initialTelemetry: GenerationAttemptTelemetry = {
      generationAttempt: 1,
      type: 'initial',
      rawCount: initialParsed.data.items.length,
      validCount: initialSalvage.accepted.length,
      rejectedCount: initialSalvage.rejected.length,
      rejectReasons: rejectReasonCounts(initialSalvage.rejected),
      durationMs: Date.now() - initialStartedAt,
    };
    attempts.push(initialTelemetry);
    logAttempt(article, initialTelemetry);

    const accepted = [...initialSalvage.accepted];
    const rejected = [...initialSalvage.rejected];
    let refillCount = 0;

    while (accepted.length < PREFERRED_VALID_ITEMS && refillCount < MAX_REFILL_ROUNDS) {
      refillCount += 1;
      const requested = Math.min(10, (PREFERRED_VALID_ITEMS - accepted.length) + 2);
      const refillStartedAt = Date.now();
      const refillRaw = await runRefill(
        buildRefillPrompt(
          article,
          truncatedArticle.content,
          level,
          accepted.map((item) => item.term),
          rejected,
          requested,
        ),
        controller.signal,
      );
      const refillParsed = LessonRefillOutputSchema.safeParse(refillRaw);
      if (!refillParsed.success) {
        const telemetry: GenerationAttemptTelemetry = {
          generationAttempt: refillCount + 1,
          type: 'refill',
          rawCount: Array.isArray((refillRaw as { items?: unknown[] })?.items) ? (refillRaw as { items: unknown[] }).items.length : 0,
          validCount: 0,
          rejectedCount: 1,
          rejectReasons: { schema_invalid: 1 },
          durationMs: Date.now() - refillStartedAt,
        };
        attempts.push(telemetry);
        logAttempt(article, telemetry);
        continue;
      }

      const acceptedKeys = new Set(accepted.map((item) => normalizeLessonText(item.term)));
      const refillSalvage = salvageLessonItems(refillParsed.data.items, article.content, acceptedKeys);
      accepted.push(...refillSalvage.accepted);
      rejected.push(...refillSalvage.rejected);
      const telemetry: GenerationAttemptTelemetry = {
        generationAttempt: refillCount + 1,
        type: 'refill',
        rawCount: refillParsed.data.items.length,
        validCount: refillSalvage.accepted.length,
        rejectedCount: refillSalvage.rejected.length,
        rejectReasons: rejectReasonCounts(refillSalvage.rejected),
        durationMs: Date.now() - refillStartedAt,
      };
      attempts.push(telemetry);
      logAttempt(article, telemetry);
    }

    if (accepted.length < MIN_USABLE_ITEMS) {
      throw new LessonError('LESSON_OUTPUT_INVALID', `Only ${accepted.length} valid learning items could be produced.`);
    }

    const items = accepted.slice(0, MAX_FINAL_ITEMS);
    return {
      output: {
        summary: initialParsed.data.summary,
        difficulty: initialParsed.data.difficulty,
        learningFocus: initialParsed.data.learningFocus,
        items,
      },
      durationMs: Date.now() - startedAt,
      truncated: truncatedArticle.truncated,
      initialRawCount: initialParsed.data.items.length,
      finalValidCount: items.length,
      refillCount,
      attempts,
    };
  } catch (error) {
    if (controller.signal.aborted) {
      throw new LessonError('LESSON_GENERATION_FAILED', 'Lesson generation timed out.');
    }
    if (error instanceof LessonError) throw error;
    console.error('Lesson generation failed.', {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      model: environment.openaiModel,
    });
    throw new LessonError('LESSON_GENERATION_FAILED', "We couldn't create this lesson. Please try again.");
  } finally {
    clearTimeout(timeout);
  }
};

export const generateLessonWithAgent: GenerateLesson = async (article, level, history) => {
  const [{ run }, { lessonAgent }, { lessonRefillAgent }] = await Promise.all([
    import('@openai/agents'),
    import('../../agents/lesson-agent'),
    import('../../agents/lesson-refill-agent'),
  ]);
  return generateLessonWithRunners(
    article,
    level,
    history,
    async (prompt, signal) => (await run(lessonAgent, prompt, { signal })).finalOutput,
    async (prompt, signal) => (await run(lessonRefillAgent, prompt, { signal })).finalOutput,
  );
};
