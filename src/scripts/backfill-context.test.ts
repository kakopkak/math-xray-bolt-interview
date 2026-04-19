import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('backfill context script is wired for dry-run and update fields', () => {
  const source = readFileSync(new URL('./backfill-context.ts', import.meta.url), 'utf8');

  assert.match(source, /export async function backfillTeacherAndClassContext/);
  assert.match(source, /--dry-run/);
  assert.match(source, /Backfill \$\{result\.dryRun \? '\(dry run\)' : 'complete'\}/);
  assert.match(source, /assignmentTitle/);
  assert.match(source, /teacherId/);
  assert.match(source, /organizationKey/);
  assert.match(source, /classLabel/);
  assert.match(source, /classKey/);
  assert.match(source, /topic/);
  assert.match(source, /gradeLevel/);
  assert.match(source, /studentKey/);
});
