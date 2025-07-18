import { Agent } from '@openai/agents';
import { QuizResult } from './schemas';
import * as fs from 'fs';
import * as path from 'path';

// Load prompt from markdown file
const promptPath = path.join(__dirname, 'prompt.md');
const promptContent = fs.readFileSync(promptPath, 'utf-8');

export const quizAgent = new Agent({
  name: 'Quiz Agent',
  instructions: promptContent,
  outputType: QuizResult,
  modelSettings: {
    temperature: 0.7,
    maxTokens: 2000
  }
});