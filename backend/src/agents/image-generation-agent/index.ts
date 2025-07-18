import { Agent } from '@openai/agents';
import { generateAiImage } from './tools/generateAiImage';
import { ImageGenerationResult } from './schemas';
import * as fs from 'fs';
import * as path from 'path';

// Load prompt from markdown file
const promptPath = path.join(__dirname, 'prompt.md');
const promptContent = fs.readFileSync(promptPath, 'utf-8');

export const imageGenerationAgent = new Agent({
  name: 'AI Image Generation Agent',
  instructions: promptContent,
  tools: [generateAiImage],
  outputType: ImageGenerationResult,
  modelSettings: {
    temperature: 0.7,
    maxTokens: 1000
  }
});