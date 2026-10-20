import { Agent, Tool } from '@openai/agents';
import { ExamplesResult } from './schemas';
import * as fs from 'fs';
import * as path from 'path';

// Load prompt from markdown file
const promptPath = path.join(__dirname, 'prompt.md');
const promptContent = fs.readFileSync(promptPath, 'utf-8');

export const createExamplesAgent = (tools: Tool[] = []) => new Agent({
  name: 'Examples Agent',
  instructions: promptContent,
  outputType: ExamplesResult,
  tools,
  modelSettings: {
    temperature: 0.7,
    maxTokens: 800
  }
});

export const examplesAgent = createExamplesAgent();
