import { Router, Request, Response } from 'express';
import { validate } from 'echt';
import { openaiRateLimiter } from '../../middleware/rateLimiter';
import { WordList } from '../lists/model';
import { Word, IWord } from './model';
import { wordAgentService } from './agent-service';
import mongoose from 'mongoose';
import { getUserLanguages } from '../../utils/getUserLanguages';
import { 
  listIdSchema, 
  addWordSchema, 
  wordIdSchema, 
  wordContextSchema, 
  deleteWordSchema, 
  validateAnswerSchema 
} from './schemas';

const router = Router();

const transformWord = (word: IWord, listId: string) => {
  const context = word.ownedByLists.find(ctx => ctx.listId.toString() === listId);
  return {
    id: word._id.toString(),
    value: word.value,
    meaning: context?.meaning || '',
    learnedPoint: context?.learnedPoint || 0,
    created_at: word.created_at.toISOString(),
    updated_at: word.updated_at.toISOString()
  };
};

router.post('/:listId/words', validate(addWordSchema), async (req, res) => {
  try {
    const { listId } = req.params;
    const { word: value, meaning: providedMeaning } = req.body;

    const list = await WordList.findById(listId).lean();
    if (!list) return res.status(404).json({ message: 'List not found' });

    const definition = providedMeaning?.trim() || await (async () => {
      const userId = req.headers['user-id'] as string;
      if (!userId) throw new Error('User ID is required');
      const { baseLanguage, targetLanguage } = await getUserLanguages(userId);
      return wordAgentService.generateDefinition(value, list.context || '', baseLanguage, targetLanguage);
    })();

    const normalizedValue = value.toLowerCase().trim();
    let word = await Word.findOne({ value: normalizedValue });
    
    if (word) {
      if (word.ownedByLists.some(ctx => ctx.listId.toString() === listId)) {
        return res.status(400).json({ message: 'Word already exists in this list' });
      }
      word.ownedByLists.push({ listId: new mongoose.Types.ObjectId(listId), meaning: definition, learnedPoint: 0 });
      await word.save();
    } else {
      word = await Word.create({
        value: normalizedValue,
        ownedByLists: [{ listId: new mongoose.Types.ObjectId(listId), meaning: definition, learnedPoint: 0 }]
      });
    }

    await WordList.findByIdAndUpdate(listId, { updatedAt: new Date() });
    res.status(201).json({ ...transformWord(word, listId), _id: word._id });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:listId/words', validate(listIdSchema), async (req, res) => {
  try {
    const { listId } = req.params;
    const words = await Word.find({ 'ownedByLists.listId': listId }).lean();
    res.json(words.map(word => ({ ...transformWord(word as IWord, listId), _id: word._id })));
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:listId/words/:wordId', validate(deleteWordSchema), async (req, res) => {
  try {
    const { listId, wordId } = req.params;

    const word = await Word.findById(wordId);
    if (!word) return res.status(404).json({ message: 'Word not found' });

    word.ownedByLists = word.ownedByLists.filter(ctx => ctx.listId.toString() !== listId);
    
    if (word.ownedByLists.length === 0) {
      await Word.findByIdAndDelete(wordId);
    } else {
      await word.save();
    }

    await WordList.findByIdAndUpdate(listId, { updatedAt: new Date() });
    res.json({ message: 'Word deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/validate-answer', validate(validateAnswerSchema), async (req: any, res) => {
  try {
    const { userAnswer, correctAnswer, context } = req.body;
    const userId = req.headers['user-id'] as string;
    if (!userId) return res.status(400).json({ message: 'User ID is required' });
    const { baseLanguage, targetLanguage } = await getUserLanguages(userId);
    const result = await wordAgentService.validateAnswer(userAnswer, correctAnswer, context, baseLanguage, targetLanguage);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/word/:wordId', validate(wordIdSchema), async (req, res) => {
  try {
    const { wordId } = req.params;
    const word = await Word.findById(wordId).lean();
    if (!word) return res.status(404).json({ message: 'Word not found' });

    const contexts = await Promise.all(
      word.ownedByLists.map(async (context) => {
        const list = await WordList.findById(context.listId).lean();
        return {
          listId: context.listId.toString(),
          listName: list?.name || 'Unknown List',
          listContext: list?.context,
          meaning: context.meaning,
          learnedPoint: context.learnedPoint
        };
      })
    );

    res.json({
      id: word._id.toString(),
      value: word.value,
      contexts,
      created_at: word.created_at.toISOString(),
      updated_at: word.updated_at.toISOString()
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/word/:wordId/sentences', validate(wordContextSchema), async (req, res) => {
  try {
    const { wordId } = req.params;
    const { contextIndex } = req.body;

    const word = await Word.findById(wordId).lean();
    if (!word || contextIndex >= word.ownedByLists.length) {
      return res.status(404).json({ message: 'Word not found or invalid context' });
    }

    const wordContext = word.ownedByLists[contextIndex];
    const list = await WordList.findById(wordContext.listId).lean();
    const context = list?.context || 'General';

    const userId = req.headers['user-id'] as string;
    const { baseLanguage, targetLanguage } = await getUserLanguages(userId);
    const sentences = await wordAgentService.generateExamples(word.value, wordContext.meaning, context, baseLanguage, targetLanguage);

    res.json({ examples: sentences });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/word/:wordId/similar', openaiRateLimiter, validate(wordContextSchema), async (req, res) => {
  try {
    const { wordId } = req.params;
    const { contextIndex } = req.body;

    const word = await Word.findById(wordId).lean();
    if (!word || contextIndex >= word.ownedByLists.length) {
      return res.status(404).json({ message: 'Word not found or invalid context' });
    }

    const wordContext = word.ownedByLists[contextIndex];
    const list = await WordList.findById(wordContext.listId).lean();
    const context = list?.context || 'General';

    const userId = req.headers['user-id'] as string;
    const { baseLanguage, targetLanguage } = await getUserLanguages(userId);
    const similarWords = await wordAgentService.generateSimilarWords(word.value, wordContext.meaning, context, baseLanguage, targetLanguage);

    res.json({
      word: word.value,
      meaning: wordContext.meaning,
      context,
      similar_words: similarWords
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/:listId/light-reading', openaiRateLimiter, validate(listIdSchema), async (req, res) => {
  try {
    const { listId } = req.params;

    const [words, list] = await Promise.all([
      Word.find({ 'ownedByLists.listId': listId }).lean(),
      WordList.findById(listId).lean()
    ]);

    if (words.length === 0) {
      return res.status(400).json({ message: 'No words found in this list' });
    }

    const userId = req.headers['user-id'] as string;
    if (!userId) return res.status(400).json({ message: 'User ID is required' });
    const { baseLanguage, targetLanguage } = await getUserLanguages(userId);

    const wordsForReading = words.map(word => {
      const wordContext = word.ownedByLists.find(ctx => ctx.listId.toString() === listId);
      return { value: word.value, meaning: wordContext?.meaning || '' };
    });

    const reading = await wordAgentService.generateLightReading(wordsForReading, list?.context || 'General', baseLanguage, targetLanguage);
    res.json(reading);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router; 