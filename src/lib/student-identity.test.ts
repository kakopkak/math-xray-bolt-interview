import assert from 'node:assert/strict';
import test from 'node:test';
import { toStudentKey } from './student-key';

test('student key normalization stays deterministic for roster integration', () => {
  assert.equal(toStudentKey('  Mari Maasikas '), 'mari-maasikas');
  assert.equal(toStudentKey('Õie Õun'), 'oie-oun');
});
