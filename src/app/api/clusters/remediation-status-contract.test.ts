import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const clusterModelPath = path.join(process.cwd(), 'src/lib/models/cluster.ts');
const clusterByMisconceptionPath = path.join(
  process.cwd(),
  'src/lib/ai/cluster-submissions.ts'
);
const assignmentClusterRoutePath = path.join(
  process.cwd(),
  'src/app/api/assignments/[id]/cluster/route.ts'
);
const clusterRemediateRoutePath = path.join(
  process.cwd(),
  'src/app/api/clusters/[id]/remediate/route.ts'
);
const teacherClusterClientPath = path.join(
  process.cwd(),
  'src/app/teacher/cluster/[id]/cluster-client.tsx'
);
const teacherAssignmentClientPath = path.join(
  process.cwd(),
  'src/app/teacher/assignment/[id]/assignment-client.tsx'
);

test('cluster model tracks remediation status fields', async () => {
  const source = await readFile(clusterModelPath, 'utf8');

  assert.match(source, /remediationStatus:\s*RemediationStatus/);
  assert.match(source, /remediationStatus:\s*\{\s*type:\s*String,\s*enum:\s*\['pending',\s*'ready',\s*'failed'\],\s*default:\s*'pending'/s);
  assert.match(source, /remediationError:\s*\{\s*type:\s*String,\s*default:\s*''\s*\}/);
});

test('clustering lifecycle uses pending ready failed semantics', async () => {
  const [clusterByMisconceptionSource, assignmentClusterRouteSource, clusterRemediateRouteSource] =
    await Promise.all([
      readFile(clusterByMisconceptionPath, 'utf8'),
      readFile(assignmentClusterRoutePath, 'utf8'),
      readFile(clusterRemediateRoutePath, 'utf8'),
    ]);

  assert.match(
    clusterByMisconceptionSource,
    /remediationStatus:\s*code\s*===\s*'QE_NO_ERROR'\s*\?\s*'ready'\s*:\s*'pending'/
  );
  assert.match(clusterByMisconceptionSource, /remediationError:\s*''/);

  assert.match(assignmentClusterRouteSource, /remediationStatus:\s*'ready'/);
  assert.match(assignmentClusterRouteSource, /remediationStatus:\s*'failed'/);
  assert.match(assignmentClusterRouteSource, /remediationError:/);

  assert.match(clusterRemediateRouteSource, /cluster\.remediationStatus\s*=\s*'pending'/);
  assert.match(clusterRemediateRouteSource, /cluster\.remediationStatus\s*=\s*'ready'/);
  assert.match(clusterRemediateRouteSource, /cluster\.remediationStatus\s*=\s*'failed'/);
});

test('teacher assignment and cluster UIs render remediation status', async () => {
  const [teacherAssignmentClientSource, teacherClusterClientSource] = await Promise.all([
    readFile(teacherAssignmentClientPath, 'utf8'),
    readFile(teacherClusterClientPath, 'utf8'),
  ]);

  assert.match(teacherAssignmentClientSource, /remediationStatus/);
  assert.match(teacherClusterClientSource, /remediationStatus/);
});
