import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSubmissionDataQuality } from './data-quality';

test('buildSubmissionDataQuality scores low quality when heuristics and manual review are present', () => {
  const quality = buildSubmissionDataQuality({
    processingStatus: 'needs_manual_review',
    analysisMeta: {
      extractionSource: 'heuristic',
      classificationSource: 'not_run',
      extractionIsComplete: false,
      deterministicGateApplied: false,
      averageConfidence: 0.2,
      lowConfidenceStepCount: 3,
    },
    intelligence: {
      uncertaintyLevel: 'high',
      uncertaintyReasons: ['analysis_missing'],
    },
  });

  assert.equal(quality.trustLevel, 'low');
  assert.equal(quality.signalQualityScore < 50, true);
  assert.equal(quality.reasons.includes('manual_review_required'), true);
});

test('buildSubmissionDataQuality keeps high trust for solid ai pipeline output', () => {
  const quality = buildSubmissionDataQuality({
    processingStatus: 'complete',
    analysisMeta: {
      extractionSource: 'ai',
      classificationSource: 'ai',
      extractionIsComplete: true,
      deterministicGateApplied: false,
      averageConfidence: 0.91,
      lowConfidenceStepCount: 0,
    },
    intelligence: {
      uncertaintyLevel: 'low',
      uncertaintyReasons: [],
    },
  });

  assert.equal(quality.trustLevel, 'high');
  assert.equal(quality.signalQualityScore >= 80, true);
});
