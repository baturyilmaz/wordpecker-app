import { Agent } from '@openai/agents';
import { LanguageValidationResult } from './schemas';
import * as fs from 'fs';
import * as path from 'path';

// Load prompt from markdown file
const promptPath = path.join(__dirname, 'prompt.md');
const promptContent = fs.readFileSync(promptPath, 'utf-8');

export const languageValidationAgent = new Agent({
  name: 'Language Validation Agent',
  instructions: promptContent,
  outputType: LanguageValidationResult,
  modelSettings: {
    temperature: 0.2,
    maxTokens: 500
  }
});