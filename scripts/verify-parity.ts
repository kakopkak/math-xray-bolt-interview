import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { connectDB } from '../src/lib/mongodb';
import { Assignment } from '../src/lib/models/assignment';
import { Submission } from '../src/lib/models/submission';
import { buildAssignmentAnalytics } from '../src/lib/assignment-analytics';
import { buildTeacherSuperDashboard } from '../src/lib/super-dashboard/engine';
import { seedDemoAssignmentDataset } from '../src/scripts/seed';

function loadEnvLocalFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) {
      continue;
    }

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function loadEnvironment() {
  const candidates = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '..', '.env.local'),
  ];

  for (const candidate of candidates) {
    loadEnvLocalFile(candidate);
  }
}

function resolveMasteryCount(items: Array<{ code: string; count: number }>) {
  return items.find((item) => item.code === 'QE_NO_ERROR')?.count ?? 0;
}

function resolveTopBarrier(items: Array<{ code: string }>) {
  return items.find((item) => item.code !== 'QE_NO_ERROR')?.code ?? 'QE_NO_ERROR';
}

async function main() {
  loadEnvironment();

  if (!process.env.MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not set. Create .env.local (cp .env.example .env.local) or export MONGODB_URI before running verify:parity.'
    );
  }

  await connectDB();

  try {
    const { assignmentId } = await seedDemoAssignmentDataset();
    const assignment = await Assignment.findById(assignmentId)
      .select('_id teacherId organizationKey')
      .lean();

    assert.ok(assignment, 'Seeded assignment was not found.');

    const dashboard = await buildTeacherSuperDashboard({
      teacherId: assignment.teacherId,
      organizationKey: assignment.organizationKey,
      assignmentId,
      bypassCache: true,
    });

    const submissions = await Submission.find({ assignmentId })
      .select(
        '_id assignmentId studentName studentKey createdAt processingStatus analysis analysisMeta teacherReview'
      )
      .sort({ createdAt: -1 })
      .lean();

    const analytics = buildAssignmentAnalytics(submissions);

    const dashboardStudentCount = dashboard.overview.studentCount;
    const analyticsStudentCount = analytics.totalStudents;
    const dashboardMasteryCount = resolveMasteryCount(dashboard.misconceptionOverview);
    const analyticsMasteryCount = resolveMasteryCount(analytics.misconceptionDistribution);
    const dashboardTopBarrier = resolveTopBarrier(dashboard.misconceptionOverview);
    const analyticsTopBarrier = resolveTopBarrier(analytics.misconceptionDistribution);

    assert.equal(dashboardStudentCount, analyticsStudentCount, 'Student counts do not match.');
    assert.equal(dashboardMasteryCount, analyticsMasteryCount, 'Mastery counts do not match.');
    assert.equal(dashboardTopBarrier, analyticsTopBarrier, 'Top misconception does not match.');

    assert.ok(dashboardMasteryCount > 0, 'Demo data should produce a non-zero mastery count.');
    assert.ok(
      dashboard.filterOptions.students.every((student) => student.studentKey !== 'unknown-student'),
      'Dashboard student normalization still falls back to unknown-student.'
    );
    assert.ok(
      dashboard.dataQuality.trustLevelDistribution.high +
        dashboard.dataQuality.trustLevelDistribution.medium +
        dashboard.dataQuality.trustLevelDistribution.low >
        0,
      'Dashboard trust distribution should be populated.'
    );
    assert.ok(
      dashboard.gapHeatmap.cells.some((cell) => cell.risk > 0),
      'Gap heatmap should contain non-zero intensity cells.'
    );

    console.log(
      [
        'Parity OK.',
        `students=${dashboardStudentCount}`,
        `mastery=${dashboardMasteryCount}`,
        `top_barrier=${dashboardTopBarrier}`,
      ].join(' ')
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`verify:parity failed: ${message}`);
  process.exit(1);
});
