import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSuperDashboardFilters, toSnapshotFilterHash } from './filters';

test('parseSuperDashboardFilters normalizes allowed filter fields', () => {
  const filters = parseSuperDashboardFilters({
    teacherId: 't-1',
    organizationKey: 'school',
    classKey: ' 9b ',
    topic: 'fractions',
    severity: 'major',
    dateFrom: '2026-04-01',
    dateTo: '2026-04-17',
  });

  assert.equal(filters.classKey, '9b');
  assert.equal(filters.topic, 'fractions');
  assert.equal(filters.severity, 'major');
  assert.equal(Boolean(filters.dateFrom), true);
  assert.equal(Boolean(filters.dateTo), true);
});

test('parseSuperDashboardFilters drops unknown misconception code without topic', () => {
  const filters = parseSuperDashboardFilters({
    teacherId: 't-1',
    organizationKey: 'school',
    misconceptionCode: 'UNKNOWN_CODE',
  });

  assert.equal(filters.misconceptionCode, null);
});

test('toSnapshotFilterHash stays deterministic', () => {
  const first = toSnapshotFilterHash(
    parseSuperDashboardFilters({ teacherId: 'a', organizationKey: 'o', classKey: '9a' })
  );
  const second = toSnapshotFilterHash(
    parseSuperDashboardFilters({ teacherId: 'a', organizationKey: 'o', classKey: '9a' })
  );

  assert.equal(first, second);
});
