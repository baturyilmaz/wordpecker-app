import { Router, Request, Response } from 'express';
import { validate } from 'echt';
import { openaiRateLimiter } from '../../middleware/rateLimiter';
import { vocabularyAgentService } from './agent-service';
import { Word } from '../words/model';
import { getUserLanguages } from '../../utils/getUserLanguages';
import { generateWordsSchema, getWordDetailsSchema } from './schemas';

const router = Router();

const validateRequest = <T extends { headers: Record<string, any> }>(req: T) => {
  const userId = req.headers['user-id'] as string;
  if (!userId) return { error: 'User ID is required' };
  return { userId };
};

router.post('/generate-words', openaiRateLimiter, validate(generateWordsSchema), async (req, res) => {
  try {
    const validation = validateRequest(req);
    if ('error' in validation) {
      return res.status(400).json({ error: validation.error });
    }

    const { context, count = 10, difficulty = 'intermediate' } = req.body;
    
    if (!context || typeof context !== 'string') {
      return res.status(400).json({ error: 'Context is required and must be a string' });
    }
    if (!['basic', 'intermediate', 'advanced'].includes(difficulty)) {
      return res.status(400).json({ error: 'Difficulty must be basic, intermediate, or advanced' });
    }

    const wordCount = Math.min(Math.max(parseInt(String(count)) || 10, 1), 20);

    const existingWords = await Word.find({ 'ownedByLists.0': { $exists: true } })
      .populate({
        path: 'ownedByLists.listId',
        match: { 
          $or: [
            { context: { $regex: context, $options: 'i' } },
            { name: { $regex: context, $options: 'i' } }
          ]
        }
      });

    const wordsToExclude = existingWords
      .filter(word => word.ownedByLists.some((list: any) => list.listId !== null))
      .map(word => word.value.toLowerCase());

    const { baseLanguage, targetLanguage } = await getUserLanguages(validation.userId);
    const vocabularyWords = await vocabularyAgentService.generateWords(
      wordCount, 
      difficulty, 
      context, 
      baseLanguage, 
      targetLanguage, 
      wordsToExclude
    );

    const actuallyExcluded = wordsToExclude.filter(excludedWord =>
      vocabularyWords.every((generatedWord: { word: string }) => 
        generatedWord.word.toLowerCase() !== excludedWord.toLowerCase()
      )
    ).length;

    res.json({
      context,
      difficulty,
      words: vocabularyWords,
      count: vocabularyWords.length,
      excludedWords: actuallyExcluded
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate vocabulary words' });
  }
});

router.post('/get-word-details', openaiRateLimiter, validate(getWordDetailsSchema), async (req, res) => {
  try {
    const validation = validateRequest(req);
    if ('error' in validation) {
      return res.status(400).json({ error: validation.error });
    }

    const { word, context } = req.body;
    
    if (!word || typeof word !== 'string') {
      return res.status(400).json({ error: 'Word is required and must be a string' });
    }
    if (!context || typeof context !== 'string') {
      return res.status(400).json({ error: 'Context is required and must be a string' });
    }

    const { baseLanguage, targetLanguage } = await getUserLanguages(validation.userId);
    const wordInfo = await vocabularyAgentService.getWordDetails(word, context, baseLanguage, targetLanguage);

    res.json({
      word: wordInfo.word,
      meaning: wordInfo.meaning,
      example: wordInfo.example,
      difficulty_level: wordInfo.difficulty_level,
      context: wordInfo.context
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get word details' });
  }
});

export default router;