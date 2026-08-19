/* eslint-env jest */
import fs from 'fs';
import path from 'path';
import { GENERATION_TIMEOUT_MS } from './api/lessons/generator';

describe('Vercel lesson generation budget', () => {
  it('leaves enough runtime to return a safe response after the AI timeout', () => {
    const config = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../vercel.json'), 'utf8'),
    ) as { functions: Record<string, { maxDuration: number }> };
    const functionDurationMs = config.functions['api/[...path].ts'].maxDuration * 1000;

    expect(functionDurationMs).toBeGreaterThanOrEqual(GENERATION_TIMEOUT_MS + 30_000);
  });
});
