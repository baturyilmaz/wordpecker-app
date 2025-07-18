import { Router, Request, Response } from 'express';
import { validate } from 'echt';
import { WordList } from '../lists/model';
import { Word } from '../words/model';
import { UserPreferences } from '../preferences/model';
import { QuestionType } from '../../types';
import { quizAgentService } from './agent-service';
import { shuffleArray } from '../../utils/arrayUtils';
import { listIdSchema, updatePointsSchema } from './schemas';

const router = Router();

const transformWords = (words: any[], listId: string) => 
  words.map(word => ({
    id: word._id.toString(),
    value: word.value,
    meaning: word.ownedByLists.find((ctx: any) => ctx.listId.toString() === listId)?.meaning || ''
  }));

const getQuestionTypes = async (userId: string): Promise<QuestionType[]> => {
  if (!userId) return ['multiple_choice', 'fill_blank', 'true_false', 'sentence_completion'];
  
  const preferences = await UserPreferences.findOne({ userId });
  return preferences 
    ? Object.entries(preferences.exerciseTypes)
        .filter(([_, enabled]) => enabled)
        .map(([type]) => type as QuestionType)
    : ['multiple_choice', 'fill_blank', 'true_false', 'sentence_completion'];
};

router.post('/:listId/start', validate(listIdSchema), async (req, res) => {
  try {
    const { listId } = req.params;
    const [list, words] = await Promise.all([
      WordList.findById(listId).lean(),
      Word.find({ 'ownedByLists.listId': listId }).lean()
    ]);

    if (!list) return res.status(404).json({ message: 'List not found' });
    if (!words.length) return res.status(400).json({ message: 'List has no words' });

    const transformed = transformWords(words, listId);
    const shuffled = transformed.sort(() => Math.random() - 0.5);
    const questionTypes = await getQuestionTypes(req.headers['user-id'] as string);
    const questions = await quizAgentService.generateQuestions(shuffled.slice(0, 5), list.context || 'General', questionTypes);

    res.json({ 
      questions,
      total_questions: shuffled.length,
      list: { id: list._id.toString(), name: list.name, context: list.context }
    });
  } catch (error) {
    console.error('Error starting quiz:', error);
    res.status(500).json({ message: 'Error starting quiz' });
  }
});

router.post('/:listId/more', validate(listIdSchema), async (req, res) => {
  try {
    const { listId } = req.params;
    const [list, words] = await Promise.all([
      WordList.findById(listId).lean(),
      Word.find({ 'ownedByLists.listId': listId }).lean()
    ]);

    if (!list) return res.status(404).json({ message: 'List not found' });
    if (!words.length) return res.status(400).json({ message: 'List has no words' });

    const transformed = transformWords(words, listId);
    const selected = shuffleArray(transformed).slice(0, 5);
    const questionTypes = await getQuestionTypes(req.headers['user-id'] as string);
    const questions = await quizAgentService.generateQuestions(selected, list.context || 'General', questionTypes);

    res.json({ questions });
  } catch (error) {
    console.error('Error getting more questions:', error);
    res.status(500).json({ message: 'Error getting more questions' });
  }
});

router.put('/:listId/learned-points', validate(updatePointsSchema), async (req, res) => {
  try {
    const { listId } = req.params;
    const { results } = req.body;
    
    console.log('Updating learned points for list:', listId);
    console.log('Results:', results);
    
    await Promise.all(results.map(async (result: { wordId: string, correct: boolean }) => {
      console.log('Processing result:', result);
      const word = await Word.findById(result.wordId);
      if (!word) {
        console.log('Word not found:', result.wordId);
        return;
      }
      
      const context = word.ownedByLists.find(ctx => ctx.listId.toString() === listId);
      if (!context) {
        console.log('Context not found for word:', result.wordId, 'in list:', listId);
        return;
      }
      
      const current = context.learnedPoint || 0;
      const newPoints = result.correct 
        ? Math.min(100, current + 10) 
        : Math.max(0, current - 5);
      
      console.log(`Word ${word.value}: ${current} → ${newPoints} (${result.correct ? 'correct' : 'incorrect'})`);
      context.learnedPoint = newPoints;
      
      await word.save();
    }));
    
    res.json({ message: 'Learned points updated successfully' });
  } catch (error) {
    console.error('Error updating learned points:', error);
    res.status(500).json({ message: 'Error updating learned points' });
  }
});

export default router; 