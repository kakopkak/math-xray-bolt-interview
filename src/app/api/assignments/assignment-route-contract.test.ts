import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const assignmentRoutePath = path.join(
  process.cwd(),
  'src/app/api/assignments/[id]/route.ts'
);
const assignmentClustersRoutePath = path.join(
  process.cwd(),
  'src/app/api/assignments/[id]/clusters/route.ts'
);
const assignmentProgressRoutePath = path.join(
  process.cwd(),
  'src/app/api/assignments/[id]/progress/route.ts'
);

test('GET /api/assignments/[id] returns assignment detail payload with counts contract', async () => {
  const source = await readFile(assignmentRoutePath, 'utf8');

  assert.match(source, /resolveTeacherRequestContext/);
  assert.match(source, /teacherTenantFilter/);
  assert.match(source, /Submission\.countDocuments\(\{\s*assignmentId: id,\s*\.\.\.teacherTenantFilter\(context\)\s*\}\)/);
  assert.match(source, /Cluster\.countDocuments\(\{\s*assignmentId: id\s*\}\)/);
  assert.match(source, /submissionCount,/);
  assert.match(source, /clusterCount,/);
  assert.match(source, /seedMarker:\s*assignment\.seedMarker \?\? null,/);
  assert.match(source, /classLabel:/);
  assert.match(source, /classKey:/);
  assert.match(source, /teacherId:/);
  assert.match(source, /organizationKey:/);

  assert.doesNotMatch(source, /Cluster\.find\(\{\s*assignmentId: id\s*\}\)/);
  assert.doesNotMatch(source, /Response\.json\(clusters\)/);
  assert.doesNotMatch(source, /\.\.\.assignment,/);
});

test('GET /api/assignments/[id]/clusters returns cluster list contract', async () => {
  const source = await readFile(assignmentClustersRoutePath, 'utf8');

  assert.match(source, /Cluster\.find\(\{\s*assignmentId: id\s*\}\)/);
  assert.match(source, /resolveRemediationStatus/);
  assert.match(source, /resolveRemediationError/);
  assert.match(source, /return Response\.json\(clustersWithStatus\);/);

  assert.doesNotMatch(source, /Submission\.countDocuments\(/);
  assert.doesNotMatch(source, /clusterCount/);
  assert.doesNotMatch(source, /submissionCount/);
});

test('GET /api/assignments/[id]/progress returns assignment progress summary helper payload', async () => {
  const source = await readFile(assignmentProgressRoutePath, 'utf8');

  assert.match(source, /getAssignmentProgressSummary/);
  assert.match(source, /return Response\.json\(summary\);/);
});
