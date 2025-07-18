import { Router, Request, Response } from 'express';
import { validate } from 'echt';
import { UserPreferences } from './model';
import { updatePreferencesSchema } from './schemas';

const router = Router();

const getUserId = <T extends { headers: Record<string, any> }>(req: T) => {
  const userId = req.headers['user-id'] as string;
  if (!userId) throw new Error('User ID is required');
  return userId;
};

const defaultExerciseTypes = {
  multiple_choice: true,
  fill_blank: true,
  matching: true,
  true_false: true,
  sentence_completion: true
};

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    
    const preferences = await UserPreferences.findOne({ userId }) || 
      await UserPreferences.create({
        userId,
        exerciseTypes: defaultExerciseTypes,
        baseLanguage: 'en',
        targetLanguage: 'en'
      });

    res.json({
      exerciseTypes: preferences.exerciseTypes,
      baseLanguage: preferences.baseLanguage,
      targetLanguage: preferences.targetLanguage
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to fetch preferences' });
  }
});

router.put('/', validate(updatePreferencesSchema), async (req, res) => {
  try {
    const userId = getUserId(req);
    const { exerciseTypes, baseLanguage, targetLanguage } = req.body;
    
    const updateData: Record<string, any> = { userId };
    
    if (exerciseTypes) {
      if (typeof exerciseTypes !== 'object') {
        return res.status(400).json({ error: 'Invalid exercise types' });
      }
      if (Object.values(exerciseTypes).filter(Boolean).length === 0) {
        return res.status(400).json({ error: 'At least one exercise type must be enabled' });
      }
      updateData.exerciseTypes = exerciseTypes;
    }
    
    if (baseLanguage) updateData.baseLanguage = baseLanguage;
    if (targetLanguage) updateData.targetLanguage = targetLanguage;

    const preferences = await UserPreferences.findOneAndUpdate(
      { userId },
      updateData,
      { new: true, upsert: true }
    );

    res.json({
      exerciseTypes: preferences.exerciseTypes,
      baseLanguage: preferences.baseLanguage,
      targetLanguage: preferences.targetLanguage
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update preferences' });
  }
});

export default router;