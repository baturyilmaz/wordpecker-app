import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { elevenLabsService, AudioGenerationRequest } from '../../services/elevenlabs';

const router = Router();

// Rate limiting for audio generation (more restrictive)
const audioGenerationLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 audio requests per windowMs
  message: {
    error: 'Too many audio generation requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for cache requests (less restrictive)
const audioCacheLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 cache requests per windowMs
  message: {
    error: 'Too many audio cache requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/audio/generate
 * Generate pronunciation audio for text
 */
router.post('/generate',
  audioGenerationLimit,
  [
    body('text')
      .isString()
      .isLength({ min: 1, max: 2500 })
      .withMessage('Text must be between 1 and 2500 characters'),
    body('voice')
      .optional()
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Voice ID must be a valid string'),
    body('language')
      .optional()
      .isString()
      .isIn(['en', 'tr', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar'])
      .withMessage('Language must be a supported language code'),
    body('speed')
      .optional()
      .isFloat({ min: 0.5, max: 2.0 })
      .withMessage('Speed must be between 0.5 and 2.0'),
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

      const { text, voice, language, speed } = req.body as AudioGenerationRequest;
      const userId = req.headers['user-id'] as string;

      // Generate audio with user preference integration
      const result = await elevenLabsService.generateAudio({
        text,
        voice,
        language,
        speed,
        userId, // Pass user ID for automatic language detection
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Audio generation error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      res.status(500).json({
        error: 'Failed to generate audio',
        message: errorMessage,
      });
    }
  }
);

/**
 * GET /api/audio/cache/:cacheKey
 * Serve cached audio file
 */
router.get('/cache/:cacheKey',
  audioCacheLimit,
  [
    param('cacheKey')
      .isString()
      .isLength({ min: 32, max: 32 })
      .matches(/^[a-f0-9]{32}$/)
      .withMessage('Cache key must be a valid MD5 hash'),
  ],
  async (req: Request, res: Response) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Invalid cache key format',
          details: errors.array(),
        });
      }

      const { cacheKey } = req.params;

      // Get cached audio
      const audioBuffer = elevenLabsService.getCachedAudio(cacheKey);
      
      if (!audioBuffer) {
        return res.status(404).json({
          error: 'Audio not found',
          message: 'The requested audio file was not found in cache.',
        });
      }

      // Set appropriate headers for audio streaming
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*', // Allow all origins for audio files
        'Access-Control-Allow-Methods': 'GET',
        'Cross-Origin-Resource-Policy': 'cross-origin', // Allow cross-origin access
      });

      res.send(audioBuffer);
    } catch (error) {
      console.error('Audio cache serve error:', error);
      
      res.status(500).json({
        error: 'Failed to serve audio',
        message: 'An error occurred while serving the audio file.',
      });
    }
  }
);

/**
 * GET /api/audio/voices
 * Get available voices for audio generation
 */
router.get('/voices',
  [
    query('language')
      .optional()
      .isString()
      .isIn(['en', 'tr', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar'])
      .withMessage('Language must be a supported language code'),
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

      const { language } = req.query;

      // Get available voices
      const voices = await elevenLabsService.getAvailableVoices(language as string);

      res.json({
        success: true,
        data: {
          voices,
          total: voices.length,
        },
      });
    } catch (error) {
      console.error('Voices fetch error:', error);
      
      res.status(500).json({
        error: 'Failed to fetch voices',
        message: 'An error occurred while fetching available voices.',
      });
    }
  }
);

/**
 * POST /api/audio/word-pronunciation
 * Generate pronunciation specifically for a single word
 */
router.post('/word-pronunciation',
  audioGenerationLimit,
  [
    body('word')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Word must be between 1 and 100 characters'),
    body('language')
      .optional()
      .isString()
      .isIn(['en', 'tr', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar'])
      .withMessage('Language must be a supported language code'),
    body('context')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Context must be less than 500 characters'),
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

      const { word, language, context } = req.body;
      const userId = req.headers['user-id'] as string;

      // Create text for pronunciation (add context if provided)
      let text = word;
      if (context) {
        text = `${word}. ${context}`;
      }

      // Generate audio with user language preferences
      const result = await elevenLabsService.generateAudio({
        text,
        language, // Will use user's target language if not specified
        speed: 0.9, // Slightly slower for word pronunciation
        userId,
      });

      res.json({
        success: true,
        data: {
          ...result,
          word,
          language,
        },
      });
    } catch (error) {
      console.error('Word pronunciation error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      res.status(500).json({
        error: 'Failed to generate word pronunciation',
        message: errorMessage,
      });
    }
  }
);

/**
 * POST /api/audio/sentence-pronunciation  
 * Generate pronunciation for example sentences
 */
router.post('/sentence-pronunciation',
  audioGenerationLimit,
  [
    body('sentence')
      .isString()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Sentence must be between 1 and 1000 characters'),
    body('language')
      .optional()
      .isString()
      .isIn(['en', 'tr', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar'])
      .withMessage('Language must be a supported language code'),
    body('speed')
      .optional()
      .isFloat({ min: 0.5, max: 2.0 })
      .withMessage('Speed must be between 0.5 and 2.0'),
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

      const { sentence, language, speed = 1.0 } = req.body;
      const userId = req.headers['user-id'] as string;

      // Generate audio with user language preferences
      const result = await elevenLabsService.generateAudio({
        text: sentence,
        language, // Will use user's target language if not specified
        speed,
        userId,
      });

      res.json({
        success: true,
        data: {
          ...result,
          sentence,
          language,
          speed,
        },
      });
    } catch (error) {
      console.error('Sentence pronunciation error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      res.status(500).json({
        error: 'Failed to generate sentence pronunciation',
        message: errorMessage,
      });
    }
  }
);

export default router;