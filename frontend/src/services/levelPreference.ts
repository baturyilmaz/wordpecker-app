import type { LessonLevel } from '../types';

const LEVEL_KEY = 'langsift-english-level';
export const DEFAULT_LEVEL: LessonLevel = 'intermediate';

export const levelOptions: Array<{ value: LessonLevel; label: string; description: string }> = [
  {
    value: 'basic',
    label: 'Basic',
    description: 'I can understand simple English, but longer articles are difficult.',
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    description: 'I can understand general articles, but I often need to look up words.',
  },
  {
    value: 'upper_intermediate',
    label: 'Upper-intermediate',
    description: 'I understand most articles, but advanced vocabulary and natural expressions still slow me down.',
  },
  {
    value: 'advanced',
    label: 'Advanced',
    description: 'I read comfortably and want to improve nuance, idiomatic language, and sophisticated expression.',
  },
];

export const isLessonLevel = (value: string | null): value is LessonLevel =>
  levelOptions.some((option) => option.value === value);

export const getLevelPreference = (storage: Pick<Storage, 'getItem'> = localStorage): LessonLevel => {
  const stored = storage.getItem(LEVEL_KEY);
  return isLessonLevel(stored) ? stored : DEFAULT_LEVEL;
};

export const saveLevelPreference = (
  level: LessonLevel,
  storage: Pick<Storage, 'setItem'> = localStorage,
): void => storage.setItem(LEVEL_KEY, level);

export const getLevelLabel = (level: LessonLevel): string =>
  levelOptions.find((option) => option.value === level)?.label || 'Intermediate';
