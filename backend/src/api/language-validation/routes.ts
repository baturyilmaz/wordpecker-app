import { Router } from 'express';
import { run } from '@openai/agents';
import { languageValidationAgent } from '../../agents';
import { LanguageValidationResultType } from '../../agents/language-validation-agent/schemas';

const router = Router();

router.post('/validate', async (req, res) => {
  try {
    const { language } = req.body;

    if (!language || typeof language !== 'string') {
      return res.status(400).json({ 
        error: 'Language name is required and must be a string' 
      });
    }

    const result = await run(languageValidationAgent, language.trim());
    const validationResult = result.finalOutput as LanguageValidationResultType;

    res.json(validationResult);
  } catch (error) {
    console.error('Error validating language:', error);
    res.status(500).json({ 
      error: 'Failed to validate language' 
    });
  }
});

export default router;