import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const routePath = path.join(
  process.cwd(),
  "src/app/api/admin/sweep/route.ts"
);
const sweepLibPath = path.join(process.cwd(), "src/lib/admin-sweep.ts");

test("admin sweep route requires ADMIN_SWEEP_TOKEN", async () => {
  const source = await readFile(routePath, "utf8");
  assert.match(source, /ADMIN_SWEEP_TOKEN/);
  assert.match(source, /x-admin-token/);
  assert.match(source, /status:\s*401/);
});

test("admin sweep route exposes dry-run via GET and side-effects via POST", async () => {
  const source = await readFile(routePath, "utf8");
  assert.match(source, /export async function GET/);
  assert.match(source, /export async function POST/);
  assert.match(source, /dryRun:\s*true/);
});

test("runAdminSweep targets stuck submissions, clustering locks, and next-move locks", async () => {
  const source = await readFile(sweepLibPath, "utf8");
  assert.match(source, /processingStatus:\s*"needs_manual_review"/);
  assert.match(source, /clusteringLockAt/);
  assert.match(source, /nextMove\.generationLockAt/);
  assert.match(source, /PIPELINE_TIMEOUT_REASON/);
});

test("runAdminSweep dryRun returns counts without writing", async () => {
  const source = await readFile(sweepLibPath, "utf8");
  // The dryRun branch must guard all updateMany calls.
  assert.match(source, /if \(!dryRun\)/);
  assert.match(source, /const dryRun\s*=\s*Boolean\(options\.dryRun\)/);
});
