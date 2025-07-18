import { Agent } from '@openai/agents';
import { ValidationResult } from './schemas';
import * as fs from 'fs';
import * as path from 'path';

// Load prompt from markdown file
const promptPath = path.join(__dirname, 'prompt.md');
const promptContent = fs.readFileSync(promptPath, 'utf-8');

export const validationAgent = new Agent({
  name: 'Validation Agent',
  instructions: promptContent,
  outputType: ValidationResult,
  modelSettings: {
    temperature: 0.3,
    maxTokens: 300
  }
});