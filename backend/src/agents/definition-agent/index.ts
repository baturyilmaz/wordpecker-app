import { Agent } from '@openai/agents';
import { DefinitionResult } from './schemas';
import * as fs from 'fs';
import * as path from 'path';

// Load prompt from markdown file
const promptPath = path.join(__dirname, 'prompt.md');
const promptContent = fs.readFileSync(promptPath, 'utf-8');

export const definitionAgent = new Agent({
  name: 'Definition Agent',
  instructions: promptContent,
  outputType: DefinitionResult,
  modelSettings: {
    temperature: 0.5,
    maxTokens: 200
  }
});