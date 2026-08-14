/* eslint-env jest */
import mongoose from 'mongoose';
import { Lesson } from './model';

const item = (index: number) => ({
  type: index % 3 === 0 ? 'phrase' : 'word',
  term: `useful term ${index}`,
  meaningZh: `有用含义${index}`,
  contextSentence: `This is original context sentence number ${index}.`,
  explanation: 'A concise contextual explanation.',
  exampleSentence: `A new transferable example number ${index}.`,
  difficulty: 'intermediate',
});

const lesson = (count: number, level = 'intermediate') => new Lesson({
  ownerId: 'guest_12345678-abcd-4000-8000-123456789abc',
  articleId: new mongoose.Types.ObjectId(),
  levelAtGeneration: level,
  status: 'ready',
  summary: 'The article explains a useful idea. It gives readers important context.',
  difficulty: 'intermediate',
  learningFocus: 'This article builds practical reading vocabulary.',
  items: Array.from({ length: count }, (_, index) => item(index)),
  generationMeta: {
    promptVersion: 'v1',
    articleWordCount: 500,
    truncated: false,
  },
});

describe('Lesson model', () => {
  it('accepts a valid ready Lesson', () => {
    expect(lesson(10).validateSync()).toBeUndefined();
  });

  it('rejects an invalid level', () => {
    expect(lesson(10, 'expert').validateSync()?.errors.levelAtGeneration).toBeDefined();
  });

  it.each([4, 16])('rejects a ready Lesson with %s items', (count) => {
    expect(lesson(count).validateSync()?.errors.items).toBeDefined();
  });

  it('accepts a low-density ready Lesson with 5 items', () => {
    const low = lesson(5);
    low.contentDensity = 'low';
    expect(low.validateSync()).toBeUndefined();
  });

  it('requires every Lesson item field', () => {
    const invalid = lesson(8);
    invalid.items[0].meaningZh = '';
    expect(invalid.validateSync()?.errors['items.0.meaningZh']).toBeDefined();
  });

  it('allows an empty Lesson while generation is in progress', () => {
    const generating = lesson(0);
    generating.status = 'generating';
    expect(generating.validateSync()).toBeUndefined();
  });
});
