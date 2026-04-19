import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import { clusterByMisconception } from './cluster-submissions';

function buildSubmission(overrides: Partial<{
  primaryMisconception: string;
  reasoningType: 'procedural' | 'conceptual' | 'mixed';
  firstErrorStep: number | null;
  firstWrongStep: number | null;
  dominantErrorDimension: 'procedural' | 'conceptual' | 'mixed';
  confidence: number;
  content: string;
  studentName: string;
}> = {}) {
  const assignmentId = new mongoose.Types.ObjectId();
  const primaryMisconception = overrides.primaryMisconception ?? 'QE_SIGN_ERROR';
  const confidence = overrides.confidence ?? 0.6;
  return {
    _id: new mongoose.Types.ObjectId(),
    assignmentId,
    studentName: overrides.studentName ?? 'Test Student',
    extractedSteps: [
      {
        stepNumber: overrides.firstWrongStep ?? 2,
        content: overrides.content ?? 'x = 3',
        isCorrect: false,
        misconceptionCode: primaryMisconception,
        explanation: 'Märgiviga.',
        confidence,
      },
    ],
    analysis: {
      primaryMisconception,
      firstErrorStep: overrides.firstErrorStep ?? 2,
      reasoningType: overrides.reasoningType ?? 'procedural',
    },
    intelligence: {
      firstWrongStep: overrides.firstWrongStep ?? 2,
      dominantErrorDimension: overrides.dominantErrorDimension ?? 'procedural',
    },
  } as unknown as Parameters<typeof clusterByMisconception>[0][number];
}

test('clusterByMisconception includes evidence summary reasoning type distribution', () => {
  const submissions = [
    buildSubmission({ reasoningType: 'procedural', confidence: 0.55 }),
    buildSubmission({ reasoningType: 'conceptual', confidence: 0.45, content: 'x = -3' }),
    buildSubmission({ reasoningType: 'procedural', confidence: 0.85, content: 'x = 2' }),
  ];

  const clusters = clusterByMisconception(submissions);
  const signErrorCluster = clusters.find((cluster) => cluster.misconceptionCode === 'QE_SIGN_ERROR');

  assert.ok(signErrorCluster);
  assert.ok(signErrorCluster?.evidenceSummary);
  assert.ok(signErrorCluster?.evidenceSummary?.reasoningTypeDistribution.length);
  assert.equal(signErrorCluster?.evidenceSummary?.reasoningTypeDistribution[0].reasoningType, 'procedural');
  assert.ok((signErrorCluster?.evidenceSummary?.lowConfidenceShare || 0) > 0);
});

test('clusterByMisconception keeps deterministic remediation defaults', () => {
  const clusters = clusterByMisconception([buildSubmission({ primaryMisconception: 'QE_NO_ERROR' })]);
  const cluster = clusters[0];

  assert.ok(cluster);
  assert.equal(cluster.remediationStatus, 'ready');
  assert.equal(cluster.remediationError, '');
});

test('clusterByMisconception adds subClusters for larger misconception groups', () => {
  const submissions = [
    buildSubmission({ firstWrongStep: 1, dominantErrorDimension: 'procedural', studentName: 'Mari' }),
    buildSubmission({ firstWrongStep: 2, dominantErrorDimension: 'procedural', studentName: 'Kati' }),
    buildSubmission({ firstWrongStep: 2, dominantErrorDimension: 'procedural', studentName: 'Karl' }),
    buildSubmission({ firstWrongStep: 1, dominantErrorDimension: 'procedural', studentName: 'Toomas' }),
    buildSubmission({ firstWrongStep: 5, dominantErrorDimension: 'conceptual', studentName: 'Liis' }),
    buildSubmission({ firstWrongStep: 6, dominantErrorDimension: 'conceptual', studentName: 'Eva' }),
    buildSubmission({ firstWrongStep: 5, dominantErrorDimension: 'conceptual', studentName: 'Sander' }),
    buildSubmission({ firstWrongStep: 7, dominantErrorDimension: 'conceptual', studentName: 'Mia' }),
  ];

  const clusters = clusterByMisconception(submissions);
  const signErrorCluster = clusters.find((cluster) => cluster.misconceptionCode === 'QE_SIGN_ERROR');

  assert.ok(signErrorCluster);
  assert.equal(signErrorCluster?.subClusters?.length, 2);
  const subClusterSizes = (signErrorCluster?.subClusters || []).map((item) => item.size).sort((a, b) => b - a);
  assert.deepEqual(subClusterSizes, [4, 4]);
  assert.ok(
    (signErrorCluster?.subClusters || []).every(
      (item) => item.memberSubmissionIds.length === item.size && item.memberStudentNames.length === item.size
    )
  );
});