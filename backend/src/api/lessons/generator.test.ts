/* eslint-env jest */
import { IArticle } from '../articles/model';
import { LessonGenerationOutput, LessonItemOutput } from './contracts';
import {
  generateLessonWithRunners,
  LESSON_PROMPT_VERSION,
  recoverArticleContext,
  repairLessonContexts,
  salvageLessonItems,
  truncateArticleContent,
  validateLessonAgainstArticle,
} from './generator';

const validOutput: LessonGenerationOutput = {
  summary: 'Summary sentence one. Summary sentence two.',
  difficulty: 'intermediate',
  learningFocus: 'The article contains reusable expressions.',
  items: Array.from({ length: 8 }, (_, index) => ({
    type: index === 0 ? 'phrase' : 'word',
    term: index === 0 ? 'pave the way' : `term${index}`,
    meaningEn: 'A concise contextual English meaning.',
    meaningZh: '语境含义',
    contextSentence: index === 0 ? 'The discovery could pave the way for better treatments.' : `The article uses term${index} in this sentence.`,
    explanation: 'A short explanation.',
    exampleSentence: index === 0 ? 'Better data may pave the way for safer policy.' : `A fresh example uses term${index} naturally.`,
    importanceReason: null,
    difficulty: 'intermediate',
  })),
};

const articleContent = [
  'The discovery could pave the way for better treatments.',
  ...Array.from({ length: 7 }, (_, index) => `The article uses term${index + 1} in this sentence.`),
].join(' ');

describe('Lesson generator validation', () => {
  it('accepts terms and verbatim contexts from the article', () => {
    expect(validateLessonAgainstArticle(validOutput, articleContent)).toEqual([]);
  });

  it('rejects fabricated context and repeated examples', () => {
    const invalid = structuredClone(validOutput);
    invalid.items[0].contextSentence = 'This sentence was never in the article.';
    invalid.items[1].exampleSentence = invalid.items[1].contextSentence;
    expect(validateLessonAgainstArticle(invalid, articleContent)).toHaveLength(2);
  });

  it('rejects an example that changes the selected expression', () => {
    const invalid = structuredClone(validOutput);
    invalid.items[0].term = 'best ever opening';
    invalid.items[0].contextSentence = 'The film had its best ever opening this weekend.';
    invalid.items[0].exampleSentence = 'This was her best performance outside the genre.';
    const content = `${articleContent} The film had its best ever opening this weekend.`;
    expect(validateLessonAgainstArticle(invalid, content)).toContain('Example does not clearly demonstrate term: best ever opening');
  });

  it('repairs a paraphrased context with the exact source sentence', () => {
    const inaccurate = structuredClone(validOutput);
    inaccurate.items[0].contextSentence = 'The discovery opens future treatment options.';
    const repaired = repairLessonContexts(inaccurate, articleContent);
    expect(repaired.items[0].contextSentence).toBe('The discovery could pave the way for better treatments.');
    expect(validateLessonAgainstArticle(repaired, articleContent)).toEqual([]);
  });

  it('truncates a long article near a sentence boundary', () => {
    const result = truncateArticleContent(`${'A useful sentence. '.repeat(2200)}Tail`);
    expect(result.truncated).toBe(true);
    expect(result.content.length).toBeLessThanOrEqual(30_000);
    expect(result.content.endsWith('.')).toBe(true);
  });

  it('recovers a bounded context when article metadata has no sentence boundary', () => {
    const noisy = `${'metadata'.repeat(80)} The service changed at the last-minute because demand rose ${'continuation'.repeat(80)}`;
    const context = recoverArticleContext(noisy, 'last-minute');
    expect(context).toContain('last-minute');
    expect(context!.length).toBeLessThanOrEqual(360);
  });

  it('keeps a valid term when the AI context has punctuation differences', () => {
    const candidate = makeCandidate('pave the way', 'The discovery opens future options.');
    const result = salvageLessonItems([candidate], articleContent);
    expect(result.rejected).toEqual([]);
    expect(result.accepted[0].contextSentence).toBe('The discovery could pave the way for better treatments.');
  });

  it('still rejects a term absent from the Article', () => {
    const result = salvageLessonItems([makeCandidate('invented expression')], articleContent);
    expect(result.accepted).toEqual([]);
    expect(result.rejected).toEqual([{ term: 'invented expression', reason: 'term_absent' }]);
  });
});

const orchestrationContent = Array.from(
  { length: 20 },
  (_, index) => `The article uses term${index} in a useful original sentence.`,
).join(' ');

const orchestrationArticle = {
  _id: { toString: () => 'article-id' },
  title: 'Orchestration article',
  source: 'Example',
  content: orchestrationContent,
  wordCount: 200,
} as IArticle;

function makeCandidate(term: string, contextSentence = `A context hint for ${term}.`): LessonItemOutput {
  return {
    type: term.includes(' ') ? 'phrase' : 'word',
    term,
    meaningEn: 'A concise contextual English meaning.',
    meaningZh: '语境含义',
    contextSentence,
    explanation: 'A concise explanation.',
    exampleSentence: `A new example uses ${term} naturally.`,
    importanceReason: null,
    difficulty: 'intermediate',
  };
}

const initialOutput = (terms: string[]) => ({
  summary: 'Summary sentence one. Summary sentence two.',
  difficulty: 'intermediate' as const,
  learningFocus: 'Practice reusable language.',
  items: terms.map((term) => makeCandidate(term)),
});

describe('Lesson generator orchestration', () => {
  it('salvages initial 14 → 11 valid and succeeds without refill', async () => {
    const initial = initialOutput([
      ...Array.from({ length: 11 }, (_, index) => `term${index}`),
      'absent one', 'absent two', 'absent three',
    ]);
    const refill = jest.fn();
    const result = await generateLessonWithRunners(
      orchestrationArticle,
      'intermediate',
      { knownTerms: [], unknownTerms: [] },
      jest.fn().mockResolvedValue(initial),
      refill,
    );
    expect(result.finalValidCount).toBe(11);
    expect(result.initialRawCount).toBe(14);
    expect(result.refillCount).toBe(0);
    expect(refill).not.toHaveBeenCalled();
    expect(LESSON_PROMPT_VERSION).toBe('v3');
  });

  it('salvages initial 8 → 7 and refills only missing items with dedupe', async () => {
    const initial = initialOutput([...Array.from({ length: 7 }, (_, index) => `term${index}`), 'rejected term']);
    const refill = jest.fn().mockResolvedValue({
      items: [makeCandidate('term0'), makeCandidate('term7'), makeCandidate('term8')],
    });
    const result = await generateLessonWithRunners(
      orchestrationArticle,
      'intermediate',
      { knownTerms: [], unknownTerms: [] },
      jest.fn().mockResolvedValue(initial),
      refill,
    );
    expect(result.refillCount).toBe(1);
    expect(result.finalValidCount).toBe(9);
    expect(new Set(result.output.items.map((item) => item.term)).size).toBe(9);
    const refillPrompt = refill.mock.calls[0][0] as string;
    expect(refillPrompt).toContain('Already accepted terms');
    expect(refillPrompt).toContain('rejected term');
    expect(refillPrompt).not.toContain('Create a personalized Langsift lesson');
  });

  it('stops after two refill rounds and reports the valid count', async () => {
    const initial = initialOutput(['term0', ...Array.from({ length: 7 }, (_, index) => `absent ${index}`)]);
    const refill = jest.fn()
      .mockResolvedValueOnce({ items: [makeCandidate('missing a'), makeCandidate('missing b')] })
      .mockResolvedValueOnce({ items: [makeCandidate('missing c'), makeCandidate('missing d')] });
    await expect(generateLessonWithRunners(
      orchestrationArticle,
      'intermediate',
      { knownTerms: [], unknownTerms: [] },
      jest.fn().mockResolvedValue(initial),
      refill,
    )).rejects.toMatchObject({
      code: 'LESSON_OUTPUT_INVALID',
      message: 'Only 1 valid learning items could be produced.',
    });
    expect(refill).toHaveBeenCalledTimes(2);
  });

  it('returns a usable low-density lesson after refill cannot improve five valid items', async () => {
    const initial = initialOutput([
      ...Array.from({ length: 5 }, (_, index) => `term${index}`),
      'absent one', 'absent two', 'absent three',
    ]);
    const refill = jest.fn()
      .mockResolvedValueOnce({ items: [makeCandidate('absent four'), makeCandidate('term0')] })
      .mockResolvedValueOnce({ items: [makeCandidate('absent five'), makeCandidate('term1')] });
    const result = await generateLessonWithRunners(
      orchestrationArticle,
      'intermediate',
      { knownTerms: [], unknownTerms: [] },
      jest.fn().mockResolvedValue(initial),
      refill,
    );
    expect(result.finalValidCount).toBe(5);
    expect(result.refillCount).toBe(2);
    expect(result.output.items.map((item) => item.term)).toEqual(['term0', 'term1', 'term2', 'term3', 'term4']);
  });
});
