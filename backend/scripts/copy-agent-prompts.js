const fs = require('node:fs');
const path = require('node:path');

const sourceRoot = path.resolve(__dirname, '../src/agents');
const outputRoot = path.resolve(__dirname, '../dist/agents');

for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const source = path.join(sourceRoot, entry.name, 'prompt.md');
  if (!fs.existsSync(source)) continue;
  const outputDirectory = path.join(outputRoot, entry.name);
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.copyFileSync(source, path.join(outputDirectory, 'prompt.md'));
}
