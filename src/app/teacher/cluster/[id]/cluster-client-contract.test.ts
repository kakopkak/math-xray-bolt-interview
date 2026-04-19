import assert from "node:assert/strict";
import test from "node:test";
import {
  buildClusterRemediationEndpoint,
  CLUSTER_TOKEN_CLASS_CONTRACT,
  difficultyLabelEt,
  hasLegacyClusterPaletteClass,
  processingStatusLabelEt,
  remediationStatusLabel,
  severityLabelEt,
} from "./cluster-client";

test("cluster detail preserves compact Estonian labels", () => {
  assert.deepEqual(remediationStatusLabel, {
    pending: "töös",
    ready: "valmis",
    failed: "viga",
  });
  assert.deepEqual(severityLabelEt, {
    none: "puudub",
    minor: "kerge",
    major: "suur",
    fundamental: "fundamentaalne",
  });
  assert.deepEqual(processingStatusLabelEt, {
    pending: "Järjekorras",
    extracting: "Sammud",
    classifying: "Tuvastus",
    needs_manual_review: "Vajab ülevaatust",
    complete: "Valmis",
    error: "Viga",
  });
  assert.deepEqual(difficultyLabelEt, {
    scaffolded: "Juhendatud",
    standard: "Tavaseeria",
    transfer: "Ülekanne",
  });
});

test("cluster remediation endpoint helper composes expected api path", () => {
  assert.equal(buildClusterRemediationEndpoint("cluster-42"), "/api/clusters/cluster-42/remediate");
  assert.equal(buildClusterRemediationEndpoint("abc"), "/api/clusters/abc/remediate");
});

test("cluster token class contract stays design-token based", () => {
  assert.equal(CLUSTER_TOKEN_CLASS_CONTRACT.mutedText, "text-[var(--color-text-muted)]");
  assert.equal(
    CLUSTER_TOKEN_CLASS_CONTRACT.raisedPanel,
    "border-[var(--color-border)] bg-[var(--color-surface-raised)]"
  );

  for (const classToken of Object.values(CLUSTER_TOKEN_CLASS_CONTRACT)) {
    assert.equal(hasLegacyClusterPaletteClass(classToken), false);
  }

  assert.equal(hasLegacyClusterPaletteClass("text-zinc-500"), true);
  assert.equal(hasLegacyClusterPaletteClass("bg-rose-200"), true);
  assert.equal(hasLegacyClusterPaletteClass("border-emerald-300"), true);
});

test("cluster detail source keeps progressive disclosure and compact analytics", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("./cluster-client.tsx", import.meta.url), "utf8");

  assert.match(source, /Õpilased/);
  assert.match(source, /Sammud \(vajadusel\)/);
  assert.match(source, /setOpenStepsBySubmissionId/);
  assert.match(source, /Kontrollimata/);
  assert.match(source, /formatPriority/);
  assert.match(source, /TrustTag/);
  assert.match(source, /header: "Usaldus"/);
  assert.match(source, /label="Vajab silmi kohe"/);
  assert.match(source, /Tänane andmestik:/);
  assert.match(source, /Osa õpilasi tuvastati automaatse lugemisega/);
  assert.match(source, /ResponsiveTable/);
  assert.doesNotMatch(source, /\{row\.priority\} \{row\.priorityScore\}/);
  assert.doesNotMatch(source, /\{row\.uncertainty\}/);
  assert.doesNotMatch(source, /header: "Kindlus"/);
});

test("cluster detail source supports sub-cluster tabs when data exists", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("./cluster-client.tsx", import.meta.url), "utf8");

  assert.match(source, /Ala-klastrid/);
  assert.match(source, /activeSubClusterId/);
  assert.match(source, /setActiveSubClusterId/);
  assert.match(source, /cluster\.subClusters\?\.length/);
  assert.match(source, /representativeExample/);
  assert.match(source, /remediationHint/);
});

test("cluster detail source includes homework push controls for selected students", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("./cluster-client.tsx", import.meta.url), "utf8");

  assert.match(source, /selectedStudentKeys/);
  assert.match(source, /Saada valitutele kodutöö/);
  assert.match(source, /\/api\/homework\/push/);
  assert.match(source, /assignmentId/);
  assert.match(source, /topic/);
  assert.match(source, /\/solve\/\$\{assignment\.shareToken\}/);
});


test('cluster detail source links to topic notebook', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('./cluster-client.tsx', import.meta.url), 'utf8');

  assert.match(source, /Õpetaja märkmik/);
  assert.match(source, /\/teacher\/topic\//);
});