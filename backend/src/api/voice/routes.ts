import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { openai } from '../../config/openai';
import { getUserLanguages } from '../../utils/getUserLanguages';
import { WordList } from '../lists/model';

const router = Router();

// Rate limiting for voice session creation
const voiceSessionLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 voice sessions per windowMs
  message: {
    error: 'Too many voice session requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/voice/session
 * Generate ephemeral token for voice agent
 */
router.post('/session',
  voiceSessionLimit,
  [
    body('listId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('List ID is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { listId } = req.body;
      const userId = req.headers['user-id'] as string;

      if (!userId) {
        return res.status(401).json({
          error: 'User ID is required',
        });
      }

      // Get user's language preferences
      const userLanguages = await getUserLanguages(userId);

      // Get the word list to provide context
      const wordList = await WordList.findById(listId);
      if (!wordList) {
        return res.status(404).json({
          error: 'Word list not found',
        });
      }

      // Generate ephemeral token
      const sessionResponse = await openai.beta.realtime.sessions.create({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'alloy', // Default voice for now
      });

      res.json({
        success: true,
        data: {
          clientSecret: sessionResponse.client_secret.value,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
          sessionId: sessionResponse.client_secret.value, // Use client secret as session identifier
          listContext: {
            listId: wordList._id.toString(),
            listName: wordList.name,
            description: wordList.description,
            context: wordList.context,
          },
          userLanguages: {
            baseLanguage: userLanguages.baseLanguage,
            targetLanguage: userLanguages.targetLanguage,
          }
        },
      });
    } catch (error) {
      console.error('Voice session creation error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      res.status(500).json({
        error: 'Failed to create voice session',
        message: errorMessage,
      });
    }
  }
);


export default router;