import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getManualReviewMessage,
  PIPELINE_TIMEOUT_MESSAGE_ET,
  PIPELINE_TIMEOUT_REASON,
} from '@/lib/pipeline-timeout';

test('getManualReviewMessage maps pipeline timeout reason to user-facing text', () => {
  assert.equal(
    getManualReviewMessage(PIPELINE_TIMEOUT_REASON, 'Varusõnum'),
    PIPELINE_TIMEOUT_MESSAGE_ET
  );
});

test('getManualReviewMessage falls back for empty processing errors', () => {
  assert.equal(
    getManualReviewMessage('', 'Automaatne analüüs peatati.'),
    'Automaatne analüüs peatati.'
  );
});
