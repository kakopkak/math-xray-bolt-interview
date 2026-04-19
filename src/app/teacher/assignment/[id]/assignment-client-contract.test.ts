import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const assignmentClientPath = new URL("./assignment-client.tsx", import.meta.url);

test("assignment view keeps cluster chart with severity color mapping", async () => {
  const source = await readFile(assignmentClientPath, "utf8");

  assert.match(source, /const severityColor:/);
  assert.match(source, /none:\s*"#14b8a6"/);
  assert.match(source, /minor:\s*"#f59e0b"/);
  assert.match(source, /major:\s*"#f97316"/);
  assert.match(source, /fundamental:\s*"#f43f5e"/);
  assert.match(source, /<BarChart[\s\S]*layout="vertical"/);
  assert.match(source, /label=\{\{ value: "Õpilaste arv"/);
});

test("assignment view emphasizes compact control center and progressive disclosure", async () => {
  const source = await readFile(assignmentClientPath, "utf8");

  assert.match(source, /Käivita klasterdamine/);
  assert.match(source, /Kõrge prioriteet/);
  assert.match(source, /Kontrolli üle/);
  assert.match(source, /setShowStudentList/);
  assert.match(source, /Ava nimekiri ainult vajadusel\./);
  assert.match(source, /Kontrolli järjekord/);
});

test("assignment student table routes teacher-facing badges through teacher-copy", async () => {
  const source = await readFile(assignmentClientPath, "utf8");

  assert.match(source, /formatPriority/);
  assert.match(source, /TrustTag/);
  assert.match(source, /header: "Prioriteet"/);
  assert.match(source, /header: "Usaldus"/);
  assert.match(source, /display\.priorityBadge\.label/);
  assert.match(source, /dataQuality/);
  assert.match(source, /title=\{display\.priorityBadge\.tooltip\}/);
  assert.match(source, /reviewPriorityScore/);
  assert.match(source, /Tänane andmestik:/);
});

test("assignment view retains demo walkthrough integration", async () => {
  const source = await readFile(assignmentClientPath, "utf8");

  assert.match(source, /DemoWalkthrough/);
  assert.match(source, /DEMO_WALKTHROUGH_DISMISS_KEY/);
  assert.match(source, /DEMO_SEED_MARKER/);
  assert.match(source, /isDemoWalkthroughOpen && <DemoWalkthrough onClose=\{handleCloseDemoWalkthrough\} \/>/);
});

test("assignment view sweeps stuck active submissions during polling", async () => {
  const source = await readFile(assignmentClientPath, "utf8");

  assert.match(source, /PIPELINE_TIMEOUT_OBSERVE_MS/);
  assert.match(source, /isActiveSubmissionProcessingStatus/);
  assert.match(source, /fetch\(`\/api\/submissions\/\$\{submissionId\}\/sweep`, \{ method: "POST" \}\)/);
});

test("assignment view exposes live mode entry point", async () => {
  const source = await readFile(assignmentClientPath, "utf8");

  assert.match(source, /Start live session/);
  assert.match(source, /\/teacher\/live\/\$\{assignmentId\}/);
});
