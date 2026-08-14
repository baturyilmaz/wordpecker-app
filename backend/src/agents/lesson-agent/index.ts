import fs from 'node:fs';
import path from 'node:path';
import { Agent } from '@openai/agents';
import { LessonInitialOutputSchema } from '../../api/lessons/contracts';

const promptPath = [
  path.join(__dirname, 'prompt.md'),
  path.resolve(process.cwd(), 'src/agents/lesson-agent/prompt.md'),
].find((candidate) => fs.existsSync(candidate));

if (!promptPath) throw new Error('Lesson agent prompt was not found.');

const prompt = fs.readFileSync(promptPath, 'utf8');

export const lessonAgent = new Agent({
  name: 'Langsift Lesson Agent',
  instructions: prompt,
  outputType: LessonInitialOutputSchema,
  modelSettings: {
    temperature: 0.35,
    maxTokens: 6000,
  },
});
