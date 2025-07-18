import { Router, Request, Response } from 'express';
import { validate } from 'echt';
import { DescriptionExercise } from './model';
import { WordList } from '../lists/model';
import { Word } from '../words/model';
import { imageDescriptionAgentService } from './agent-service';
import { stockPhotoService } from './stock-photo-service';
import { getUserLanguages } from '../../utils/getUserLanguages';
import { 
  startExerciseSchema, 
  submitDescriptionSchema, 
  addWordsSchema, 
  historyQuerySchema 
} from './schemas';

const router = Router();

const getUserId = <T extends { headers: Record<string, any> }>(req: T) => {
  const userId = req.headers['user-id'] as string;
  if (!userId) throw new Error('User ID is required');
  return userId;
};

router.post('/start', validate(startExerciseSchema), async (req, res) => {
  try {
    const { context, imageSource } = req.body;
    const userId = getUserId(req);

    const exerciseContext = context || await imageDescriptionAgentService.generateContext();
    const image = imageSource === 'ai' 
      ? await imageDescriptionAgentService.generateAIImage(exerciseContext, userId)
      : await stockPhotoService.findStockImage(exerciseContext, userId);

    res.json({
      context: exerciseContext,
      image: { url: image.url, alt: image.alt_description, id: image.id },
      instructions: "Look at this image carefully and describe what you see. Include details about objects, people, actions, emotions, colors, and atmosphere. Write in your target language and be as descriptive as you can!"
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start description exercise';
    res.status(400).json({ error: message });
  }
});

router.post('/submit', validate(submitDescriptionSchema), async (req, res) => {
  try {
    const { context, imageUrl, imageAlt, userDescription } = req.body;
    const userId = getUserId(req);

    const { baseLanguage, targetLanguage } = await getUserLanguages(userId);

    console.log("Calling analyzeDescription"); 

    const analysis = await imageDescriptionAgentService.analyzeDescription(
      userDescription, 
      imageUrl, 
      context || 'General image description', 
      baseLanguage, 
      targetLanguage
    );

    console.log('analysis', analysis);

    const exercise = await DescriptionExercise.create({
      userId,
      context: context || 'General image description',
      imageUrl,
      imageAlt: imageAlt || '',
      userDescription: userDescription.trim(),
      analysis,
      recommendedWords: analysis.recommendations
    });

    res.json({
      exerciseId: exercise._id,
      analysis,
      message: 'Great job! Here\'s your personalized feedback and vocabulary recommendations.'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to analyze description';
    res.status(400).json({ error: message });
  }
});

router.post('/add-words', validate(addWordsSchema), async (req, res) => {
  try {
    const { exerciseId, listId, selectedWords, createNewList } = req.body;
    const userId = getUserId(req);

    const exercise = await DescriptionExercise.findOne({ _id: exerciseId, userId });
    if (!exercise) return res.status(404).json({ error: 'Exercise not found' });

    let targetList;
    if (createNewList) {
      const contextName = exercise.context.length > 50 ? exercise.context.substring(0, 47) + '...' : exercise.context;
      targetList = await WordList.create({
        name: `📸 ${contextName}`,
        description: `Vocabulary discovered through image description: ${exercise.context}`,
        context: exercise.context
      });
    } else {
      targetList = await WordList.findById(listId);
      if (!targetList) return res.status(404).json({ error: 'Word list not found' });
    }

    const addedWords = [];
    for (const { word, meaning } of selectedWords) {
      const existingWord = await Word.findOne({ value: word, 'ownedByLists.listId': targetList._id });
      
      if (!existingWord) {
        let wordDoc = await Word.findOne({ value: word });
        
        if (wordDoc) {
          wordDoc.ownedByLists.push({ listId: targetList._id, meaning, learnedPoint: 0 });
          await wordDoc.save();
        } else {
          await Word.create({
            value: word,
            ownedByLists: [{ listId: targetList._id, meaning, learnedPoint: 0 }]
          });
        }
        addedWords.push({ word, meaning });
      }
    }

    res.json({
      message: createNewList 
        ? `Created new list "${targetList.name}" and added ${addedWords.length} words`
        : `Successfully added ${addedWords.length} words to your list`,
      addedWords,
      listId: targetList._id.toString(),
      listName: targetList.name,
      createdNewList: !!createNewList
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add words to list';
    res.status(400).json({ error: message });
  }
});

router.get('/history', validate(historyQuerySchema), async (req, res) => {
  try {
    const userId = getUserId(req);
    const { limit } = req.query;

    const exercises = await DescriptionExercise
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('context imageUrl imageAlt userDescription analysis.feedback createdAt')
      .lean();

    res.json({ exercises });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch exercise history';
    res.status(400).json({ error: message });
  }
});

router.get('/context-suggestions', async (req: Request, res: Response) => {
  try {
    const suggestions = await Promise.all(
      Array(5).fill(null).map(() => imageDescriptionAgentService.generateContext())
    );
    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get context suggestions' });
  }
});

export default router;