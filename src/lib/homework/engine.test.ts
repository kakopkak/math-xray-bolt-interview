import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildHomeworkAssignmentsForCluster,
  selectTemplateForSeverity,
  type HomeworkTemplate,
} from './engine';

test('selectTemplateForSeverity prefers exact severity template', () => {
  const templates: HomeworkTemplate[] = [
    { severity: 'minor', title: 'Minor', promptEt: 'minor', answerKey: '1' },
    { severity: 'major', title: 'Major', promptEt: 'major', answerKey: '2' },
  ];

  const selected = selectTemplateForSeverity(templates, 'major');

  assert.ok(selected);
  assert.equal(selected?.title, 'Major');
});

test('selectTemplateForSeverity falls back to major and first template', () => {
  const templates: HomeworkTemplate[] = [
    { severity: 'major', title: 'Major fallback', promptEt: 'major', answerKey: '2' },
    { severity: 'minor', title: 'Minor', promptEt: 'minor', answerKey: '1' },
  ];
  const fallbackToMajor = selectTemplateForSeverity(templates, 'fundamental');
  assert.ok(fallbackToMajor);
  assert.equal(fallbackToMajor?.title, 'Major fallback');

  const fallbackToFirst = selectTemplateForSeverity(
    [{ severity: 'minor', title: 'Only', promptEt: 'only', answerKey: '1' }],
    'fundamental'
  );
  assert.ok(fallbackToFirst);
  assert.equal(fallbackToFirst?.title, 'Only');
});

test('buildHomeworkAssignmentsForCluster creates one assignment per unique student', () => {
  let tokenCounter = 0;
  const dueAt = new Date('2026-05-01T00:00:00.000Z');
  const assignments = buildHomeworkAssignmentsForCluster(
    {
      teacherId: 'teacher-1',
      organizationKey: 'org-1',
      classKey: 'class-1',
      assignmentId: 'assignment-1',
      clusterId: 'cluster-1',
      studentKeys: ['anna', 'bob', 'anna', ''],
      template: {
        severity: 'major',
        title: 'Targeted homework',
        promptEt: 'Lahenda ruutvõrrand.',
        answerKey: 'x=2 või x=-2',
      },
      dueAt,
      topic: 'quadratic_equations',
    },
    () => {
      tokenCounter += 1;
      return `token-${tokenCounter}`;
    }
  );

  assert.equal(assignments.length, 2);
  assert.deepEqual(
    assignments.map((row) => row.studentKey),
    ['anna', 'bob']
  );
  assert.deepEqual(
    assignments.map((row) => row.shareToken),
    ['token-1', 'token-2']
  );
  assert.ok(assignments.every((row) => row.status === 'active'));
  assert.ok(assignments.every((row) => row.title === 'Targeted homework'));
  assert.ok(assignments.every((row) => row.dueAt?.toISOString() === dueAt.toISOString()));
  assert.ok(assignments.every((row) => row.assignmentId === 'assignment-1'));
  assert.ok(assignments.every((row) => row.topic === 'quadratic_equations'));
});