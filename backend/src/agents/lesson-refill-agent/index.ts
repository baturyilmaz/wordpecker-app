import fs from 'node:fs';
import path from 'node:path';
import { Agent } from '@openai/agents';
import { LessonRefillOutputSchema } from '../../api/lessons/contracts';

const promptPath = [
  path.join(__dirname, 'prompt.md'),
  path.resolve(process.cwd(), 'src/agents/lesson-refill-agent/prompt.md'),
].find((candidate) => fs.existsSync(candidate));

if (!promptPath) throw new Error('Lesson refill agent prompt was not found.');

export const lessonRefillAgent = new Agent({
  name: 'Langsift Lesson Refill Agent',
  instructions: fs.readFileSync(promptPath, 'utf8'),
  outputType: LessonRefillOutputSchema,
  modelSettings: {
    temperature: 0.35,
    maxTokens: 3000,
  },
});
