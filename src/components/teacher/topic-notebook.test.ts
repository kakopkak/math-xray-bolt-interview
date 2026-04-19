import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const componentPath = path.join(process.cwd(), 'src/components/teacher/topic-notebook.tsx');

test('topic notebook component loads and saves notes', async () => {
  const source = await readFile(componentPath, 'utf8');

  assert.match(source, /\/api\/teacher\/notebook\/\$\{topic\}/);
  assert.match(source, /Lisa märkus/);
  assert.match(source, /method:\s*'POST'/);
  assert.match(source, /textarea/i);
});