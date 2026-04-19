import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const pagePath = path.join(process.cwd(), 'src/app/teacher/topic/[topic]/page.tsx');

test('teacher topic page renders notebook for a topic', async () => {
  const source = await readFile(pagePath, 'utf8');

  assert.match(source, /TopicNotebook/);
  assert.match(source, /resolveTeacherRequestContext/);
  assert.match(source, /params:\s*Promise<\{\s*topic:\s*string\s*\}>/);
  assert.match(source, /redirect\('\/login'\)/);
});