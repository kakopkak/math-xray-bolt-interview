import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const routePath = path.join(process.cwd(), 'src/app/api/teacher/interventions/route.ts');

test('teacher interventions route supports listing and creating interventions', async () => {
  const source = await readFile(routePath, 'utf8');

  assert.match(source, /export async function GET/);
  assert.match(source, /export async function POST/);
  assert.match(source, /CreateInterventionSchema/);
  assert.match(source, /TeacherIntervention\.create/);
});
