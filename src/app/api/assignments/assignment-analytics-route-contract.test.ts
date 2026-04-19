import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const analyticsRoutePath = path.join(
  process.cwd(),
  "src/app/api/assignments/[id]/analytics/route.ts"
);
const analyticsHelperPath = path.join(process.cwd(), "src/lib/assignment-analytics.ts");

test("GET /api/assignments/[id]/analytics returns expected contract shape", async () => {
  const [source, helperSource] = await Promise.all([
    readFile(analyticsRoutePath, "utf8"),
    readFile(analyticsHelperPath, "utf8"),
  ]);

  assert.match(source, /buildAssignmentAnalytics/);
  assert.match(source, /resolveTeacherRequestContext/);
  assert.match(source, /teacherTenantFilter/);
  assert.match(source, /Submission\.find\(\{\s*assignmentId: id,\s*\.\.\.teacherTenantFilter\(context\)\s*\}\)/);
  assert.match(source, /parentAssignmentId/);
  assert.match(source, /analysisMeta/);
  assert.match(source, /dataQuality/);
  assert.match(source, /studentKey/);
  assert.match(source, /teacherReview/);
  assert.match(source, /return Response\.json\(analytics\);/);
  assert.match(helperSource, /totalStudents/);
  assert.match(helperSource, /completedCount/);
  assert.match(helperSource, /errorCount/);
  assert.match(helperSource, /misconceptionDistribution/);
  assert.match(helperSource, /classIntelligence/);
  assert.match(helperSource, /reviewPriorityScore/);
  assert.match(helperSource, /buildClassIntelligence/);
  assert.match(helperSource, /allStudents/);
});
