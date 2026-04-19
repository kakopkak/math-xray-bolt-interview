import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const routePath = path.join(process.cwd(), 'src/app/api/teacher/super-dashboard/route.ts');

test('teacher super dashboard route uses analytics engine and teacher context', async () => {
  const source = await readFile(routePath, 'utf8');

  assert.match(source, /buildTeacherSuperDashboard/);
  assert.match(source, /resolveTeacherRequestContext/);
  assert.match(source, /searchParams\.get\('classKey'\)/);
  assert.match(source, /searchParams\.get\('topic'\)/);
  assert.match(source, /return Response\.json\(payload\)/);
});
