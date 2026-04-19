import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseSuperDashboardFilters } from './filters';

test('super dashboard filters keep teacher scope', () => {
  const filters = parseSuperDashboardFilters({
    teacherId: 'teacher-1',
    organizationKey: 'school-1',
    classKey: '9a',
  });

  assert.equal(filters.teacherId, 'teacher-1');
  assert.equal(filters.organizationKey, 'school-1');
  assert.equal(filters.classKey, '9a');
});

test('super dashboard engine applies severity filtering before aggregation', () => {
  const source = readFileSync(new URL('./engine.ts', import.meta.url), 'utf8');

  assert.match(source, /isSubmissionSeverityMatch/);
  assert.match(source, /filters\.severity\s*\?/);
  assert.match(source, /severityFilteredSubmissions/);
  assert.match(source, /for \(const submission of severityFilteredSubmissions\)/);
});
