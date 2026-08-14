/* eslint-env jest */
import { CreateLessonBodySchema, LessonGenerationOutputSchema } from './contracts';

const item = (index: number) => ({
  type: index % 3 === 0 ? 'phrase' as const : 'word' as const,
  term: `useful term ${index}`,
  meaningZh: `有用含义${index}`,
  contextSentence: `This is original context sentence number ${index}.`,
  explanation: 'A concise contextual explanation.',
  exampleSentence: `A new transferable example number ${index}.`,
  importanceReason: 'Useful beyond this article.',
  difficulty: 'intermediate' as const,
});

const output = (count: number) => ({
  summary: 'The article explains a useful idea. It gives readers important context.',
  difficulty: 'intermediate' as const,
  learningFocus: 'This article builds practical reading vocabulary.',
  items: Array.from({ length: count }, (_, index) => item(index)),
});

describe('Lesson contracts', () => {
  it('accepts a valid lesson with 8 to 15 complete items', () => {
    expect(LessonGenerationOutputSchema.safeParse(output(10)).success).toBe(true);
  });

  it.each([4, 16])('rejects an item count of %s', (count) => {
    expect(LessonGenerationOutputSchema.safeParse(output(count)).success).toBe(false);
  });

  it('accepts a low-density lesson with 5 items', () => {
    expect(LessonGenerationOutputSchema.safeParse(output(5)).success).toBe(true);
  });

  it('rejects duplicate terms and missing required content', () => {
    const invalid = output(8);
    invalid.items[1].term = invalid.items[0].term;
    invalid.items[2].meaningZh = '';
    expect(LessonGenerationOutputSchema.safeParse(invalid).success).toBe(false);
  });

  it.each(['basic', 'intermediate', 'upper_intermediate', 'advanced'])('accepts level %s', (level) => {
    expect(CreateLessonBodySchema.safeParse({ articleId: 'abc', level }).success).toBe(true);
  });

  it('rejects an invalid level', () => {
    expect(CreateLessonBodySchema.safeParse({ articleId: 'abc', level: 'expert' }).success).toBe(false);
  });
});
