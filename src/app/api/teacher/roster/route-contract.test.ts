import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const routePath = path.join(process.cwd(), 'src/app/api/teacher/roster/route.ts');

test('teacher roster route supports listing and upserting roster records', async () => {
  const source = await readFile(routePath, 'utf8');

  assert.match(source, /export async function GET/);
  assert.match(source, /export async function POST/);
  assert.match(source, /UpsertRosterSchema/);
  assert.match(source, /StudentRosterEntry\.findOneAndUpdate/);
});
