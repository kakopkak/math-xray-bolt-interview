import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CreateAssignmentRequestSchema,
  NextMoveRequestSchema,
  ReviewOverrideSchema,
  SubmissionInputSchema,
} from '@/lib/schemas';

test('CreateAssignmentRequestSchema trims strings and applies defaults', () => {
  const payload = CreateAssignmentRequestSchema.parse({
    title: '  Ruutvõrrandid  ',
    gradeLevel: '10',
    description: '  Näita sammud.  ',
    answerKey: '  x = 2  ',
    curriculumOutcomes: ['  M9.2  ', ''],
  });

  assert.deepEqual(payload, {
    title: 'Ruutvõrrandid',
    topic: 'quadratic_equations',
    gradeLevel: 10,
    classLabel: '',
    organizationKey: '',
    teacherId: '',
    description: 'Näita sammud.',
    answerKey: 'x = 2',
    curriculumOutcomes: ['M9.2'],
  });
});

test('CreateAssignmentRequestSchema accepts extended topics and class context', () => {
  const payload = CreateAssignmentRequestSchema.parse({
    title: 'Murrud',
    topic: 'fractions',
    gradeLevel: 7,
    classLabel: ' 7B ',
    organizationKey: ' Test School ',
    teacherId: ' teacher-01 ',
  });

  assert.equal(payload.topic, 'fractions');
  assert.equal(payload.classLabel, '7B');
  assert.equal(payload.organizationKey, 'Test School');
  assert.equal(payload.teacherId, 'teacher-01');
});

test('SubmissionInputSchema normalizes optional raw fields', () => {
  const payload = SubmissionInputSchema.parse({
    studentName: '  Mari  ',
    inputType: 'typed',
    rawContent: '  x = 2  ',
    voiceAudioBase64: '  data:audio/webm;base64,QUJD  ',
    voiceMimeType: '  audio/webm  ',
  });

  assert.deepEqual(payload, {
    studentName: 'Mari',
    inputType: 'typed',
    rawContent: 'x = 2',
    typedSolution: '',
    photoBase64: '',
    voiceAudioBase64: 'data:audio/webm;base64,QUJD',
    voiceMimeType: 'audio/webm',
  });
});

test('ReviewOverrideSchema trims note and normalizes empty override to null', () => {
  const payload = ReviewOverrideSchema.parse({
    note: '  Kontrollitud  ',
    overrideMisconceptionCode: '',
  });

  assert.deepEqual(payload, {
    note: 'Kontrollitud',
    overrideMisconceptionCode: null,
  });
});

test('ReviewOverrideSchema rejects unknown misconception codes', () => {
  assert.throws(
    () =>
      ReviewOverrideSchema.parse({
        note: '',
        overrideMisconceptionCode: 'QE_UNKNOWN',
      }),
    /Vigane väärarusaama kood/
  );
});

test('NextMoveRequestSchema defaults forceRefresh to false', () => {
  assert.deepEqual(NextMoveRequestSchema.parse({}), { forceRefresh: false });
});
