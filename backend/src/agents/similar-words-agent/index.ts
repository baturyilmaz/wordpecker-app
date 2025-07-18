import { Agent } from '@openai/agents';
import { SimilarWordsResult } from './schemas';
import * as fs from 'fs';
import * as path from 'path';

// Load prompt from markdown file
const promptPath = path.join(__dirname, 'prompt.md');
const promptContent = fs.readFileSync(promptPath, 'utf-8');

export const similarWordsAgent = new Agent({
  name: 'Similar Words Agent',
  instructions: promptContent,
  outputType: SimilarWordsResult,
  modelSettings: {
    temperature: 0.7,
    maxTokens: 1200
  }
});