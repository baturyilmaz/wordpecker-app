import { Agent } from '@openai/agents';
import { ContextualImageResult } from './schemas';
import * as fs from 'fs';
import * as path from 'path';

// Load prompt from markdown file
const promptPath = path.join(__dirname, 'prompt.md');
const promptContent = fs.readFileSync(promptPath, 'utf-8');

export const contextualImageAgent = new Agent({
  name: 'Contextual Image Agent',
  instructions: promptContent,
  outputType: ContextualImageResult,
  modelSettings: {
    temperature: 0.7,
    maxTokens: 200
  }
});