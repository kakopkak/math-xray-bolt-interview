import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHeuristicRemediationExercises } from './generate-remediation';

test('buildHeuristicRemediationExercises returns 3 scaffolded/standard/transfer tasks', () => {
  const exercises = buildHeuristicRemediationExercises({
    misconceptionCode: 'QE_SIGN_ERROR',
    misconceptionLabel: 'Sign error when solving',
    misconceptionLabelEt: 'Märgiviga lahendamisel',
    exampleError: '(x+3)(x-2)=0 -> x=3, x=2',
    correctApproach: '(x+3)(x-2)=0 -> x=-3, x=2',
    prerequisiteConcept: 'Additive inverse',
    gradeLevel: 9,
  });

  assert.equal(exercises.length, 3);
  assert.deepEqual(
    exercises.map((exercise) => exercise.difficulty),
    ['scaffolded', 'standard', 'transfer']
  );
  assert.ok(exercises.every((exercise) => exercise.prompt.length > 10));
  assert.ok(exercises.every((exercise) => exercise.solutionSteps.length >= 3));
});
