import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const analyticsClientPath = new URL("./analytics-client.tsx", import.meta.url);

test("analytics view opens with hero, queue, and main-pattern CTAs in the new order", async () => {
  const source = await readFile(analyticsClientPath, "utf8");

  assert.match(source, /Klassi tulemus/);
  assert.match(source, /Ava järjekord/);
  assert.match(source, /Ava peamine muster/);
  assert.match(source, /Kontrolli järjekord/);
  assert.match(source, /Peamine muster/);
  assert.match(source, /formatMasteryFraction/);
  assert.ok(source.indexOf("Ava järjekord") < source.indexOf("Kontrolli järjekord"));
});

test("analytics view shows review queue and student rows with teacher-safe copy", async () => {
  const source = await readFile(analyticsClientPath, "utf8");

  assert.match(source, /Kontrolli järjekord/);
  assert.match(source, /Õpilased/);
  assert.match(source, /formatPriority/);
  assert.match(source, /formatReasonPhrase/);
  assert.match(source, /TrustTag/);
  assert.match(source, /ResponsiveTable/);
  assert.match(source, /Viimati vastas/);
  assert.doesNotMatch(source, /\{row\.reviewPriority\}\s*\{row\.reviewPriorityScore\}/);
  assert.doesNotMatch(source, /\{row\.uncertaintyLevel\}/);
});

test("analytics view uses a bar chart with relation bullets instead of a relations graph", async () => {
  const source = await readFile(analyticsClientPath, "utf8");

  assert.match(source, /Kõik väärarusaamad/);
  assert.match(source, /BarChart/);
  assert.match(source, /Cell/);
  assert.match(source, /Sageli ilmub koos mustriga/);
  assert.match(source, /Enne seda tasub kinnistada/);
  assert.doesNotMatch(source, /MisconceptionRelationsGraph/);
  assert.doesNotMatch(source, /LineChart/);
});

test("analytics view removes the next-move narrative and keeps the trust footer", async () => {
  const source = await readFile(analyticsClientPath, "utf8");

  assert.match(source, /Tänane andmestik:/);
  assert.doesNotMatch(source, /Järgmine samm klassi jaoks/);
  assert.doesNotMatch(source, /Homme hommikuks soovitan/);
  assert.doesNotMatch(source, /Soovitus koostatud automaatselt/);
  assert.doesNotMatch(source, /Loo see ülesanne/);
});

test("analytics view includes bulk review controls", async () => {
  const source = await readFile(analyticsClientPath, "utf8");

  assert.match(source, /bulk-review/);
  assert.match(source, /Vali kõik/);
  assert.match(source, /Rakenda valikule/);
});
