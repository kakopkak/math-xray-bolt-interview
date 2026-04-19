import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const submissionModelPath = path.join(process.cwd(), 'src/lib/models/submission.ts');
const submissionReviewRoutePath = path.join(
  process.cwd(),
  'src/app/api/submissions/[id]/review/route.ts'
);
const reviewSchemaPath = path.join(process.cwd(), 'src/lib/schemas/review.ts');
const submissionRoutePath = path.join(process.cwd(), 'src/app/api/submissions/[id]/route.ts');

test('submission model tracks teacher review state fields', async () => {
  const source = await readFile(submissionModelPath, 'utf8');

  assert.match(source, /export interface TeacherReview/);
  assert.match(source, /status: 'unreviewed' \| 'reviewed' \| 'overridden'/);
  assert.match(source, /teacherReview\?: TeacherReview \| null;/);
  assert.match(source, /teacherReview: \{ type: TeacherReviewSchema, default: null \}/);
});

test('submission review route validates and applies teacher overrides', async () => {
  const [routeSource, schemaSource] = await Promise.all([
    readFile(submissionReviewRoutePath, 'utf8'),
    readFile(reviewSchemaPath, 'utf8'),
  ]);

  assert.match(routeSource, /ReviewOverrideSchema/);
  assert.match(schemaSource, /Märkus on liiga pikk \(max 600 märki\)\./);
  assert.match(schemaSource, /Vigane väärarusaama kood\./);
  assert.match(routeSource, /submission\.analysis\.primaryMisconception = overrideMisconceptionCode/);
  assert.match(routeSource, /submission\.teacherReview = \{/);
  assert.match(routeSource, /status: hasOverride \? 'overridden' : 'reviewed'/);
});

test('submission detail route exposes teacherReview payload', async () => {
  const source = await readFile(submissionRoutePath, 'utf8');

  assert.match(source, /teacherReview/);
  assert.match(source, /teacherReview: submission\.teacherReview \|\| null/);
});
