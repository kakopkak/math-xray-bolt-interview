import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const progressPath = path.join(process.cwd(), 'src/lib/assignment-progress.ts');

test('assignment progress summary includes teacher review counters', async () => {
  const source = await readFile(progressPath, 'utf8');

  assert.match(source, /reviewedCount:/);
  assert.match(source, /overriddenCount:/);
  assert.match(source, /unreviewedCompleteCount:/);
  assert.match(source, /needsManualReviewCount:/);
  assert.match(source, /highPriorityReviewCount:/);
  assert.match(source, /highUncertaintyCount:/);
  assert.match(source, /\$group: \{ _id: '\$teacherReview\.status'/);
  assert.match(
    source,
    /\$group:[\s\S]*_id:[\s\S]*priority:\s*'\$intelligence\.reviewPriority'/
  );
});
