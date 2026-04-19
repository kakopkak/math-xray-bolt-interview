import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const clientPath = path.join(process.cwd(), "src/app/teacher/super-dashboard-client.tsx");

test("super dashboard follows the morning-scan order", async () => {
  const source = await readFile(clientPath, "utf8");

  assert.match(source, /Hommikune skänn/);
  assert.match(source, /Mida täna teha/);
  assert.match(source, /Õpilased/);
  assert.match(source, /Teemad/);
  assert.match(source, /Väärarusaamad/);
  assert.match(source, /Ülesanded/);
  assert.match(source, /Süvaanalüüs/);
  assert.doesNotMatch(source, /Peamised riskid/);
});

test("super dashboard keeps only top filters above the fold and moves deep filters into details", async () => {
  const source = await readFile(clientPath, "utf8");

  assert.match(source, /label="Klass"/);
  assert.match(source, /label="Ülesanne"/);
  assert.match(source, /label="Alates"/);
  assert.match(source, /label="Kuni"/);
  assert.match(source, /Kõik filtrid/);
  assert.match(source, /label="Teema"/);
  assert.match(source, /label="Õpilane"/);
  assert.match(source, /label="Väärarusaam"/);
  assert.match(source, /label="Tõsidus"/);
});

test("super dashboard routes teacher-facing trend and trust copy through shared helpers", async () => {
  const source = await readFile(clientPath, "utf8");

  assert.match(source, /formatMasteryFraction/);
  assert.match(source, /formatTrend/);
  assert.match(source, /formatReasonPhrase/);
  assert.match(source, /TrustTag/);
  assert.match(source, /Tänane andmestik:/);
  assert.doesNotMatch(source, /pressure /);
  assert.doesNotMatch(source, /High trust/);
  assert.doesNotMatch(source, /Medium trust/);
  assert.doesNotMatch(source, /Ava assignment-analüütika/);
});

test("super dashboard keeps deep-dive heatmap as color intensity only", async () => {
  const source = await readFile(clientPath, "utf8");

  assert.match(source, /Lõhe kuumkaart/);
  assert.match(source, /title=\{/);
  assert.match(source, /backgroundColor:/);
  assert.doesNotMatch(source, /r\$\{/);
  assert.doesNotMatch(source, /Risk 3/);
});

test("super dashboard exposes intervention impact and curriculum sections", async () => {
  const source = await readFile(clientPath, "utf8");

  assert.match(source, /Sekkumise mõju/);
  assert.match(source, /Jälgitud/);
  assert.match(source, /Paranenud/);
  assert.match(source, /Ekspordi CSV/);
});

test("super dashboard exposes curriculum coverage section", async () => {
  const source = await readFile(clientPath, "utf8");

  assert.match(source, /Õppekava kaetus/);
  assert.match(source, /\/api\/teacher\/curriculum-report/);
  assert.match(source, /Katvus:/);
});
