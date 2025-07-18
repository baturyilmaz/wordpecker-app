import { Agent } from '@openai/agents';
import { ImageAnalysisResult } from './schemas';
import * as fs from 'fs';
import * as path from 'path';

// Load prompt from markdown file
const promptPath = path.join(__dirname, 'prompt.md');
const promptContent = fs.readFileSync(promptPath, 'utf-8');

export const imageAnalysisAgent = new Agent({
  name: 'Image Analysis Agent',
  instructions: promptContent,
  outputType: ImageAnalysisResult,
  modelSettings: {
    temperature: 0.7,
    maxTokens: 1500
  }
});