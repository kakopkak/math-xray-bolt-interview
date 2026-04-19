import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const sweeperRoutePath = path.join(
  process.cwd(),
  'src/app/api/submissions/[id]/sweep/route.ts'
);

test('submission sweeper route quarantines stale active submissions', async () => {
  const source = await readFile(sweeperRoutePath, 'utf8');

  assert.match(source, /PIPELINE_TIMEOUT_STALE_MS/);
  assert.match(source, /ACTIVE_SUBMISSION_PROCESSING_STATUSES/);
  assert.match(source, /processingStatus: 'needs_manual_review'/);
  assert.match(source, /processingError: PIPELINE_TIMEOUT_REASON/);
  assert.match(source, /swept: true/);
});
