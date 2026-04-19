import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const resultClientPath = new URL("./result-client.tsx", import.meta.url);

test("result page keeps copy-link action and retry", async () => {
  const source = await readFile(resultClientPath, "utf8");

  assert.match(source, /Kopeeri link/);
  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /Proovi uuesti/);
});

test("result page uses compact summary and optional step disclosure", async () => {
  const source = await readFile(resultClientPath, "utf8");

  assert.match(source, /Kokkuvõte/);
  assert.match(source, /MiniStat/);
  assert.match(source, /setShowSteps/);
  assert.match(source, /Ava sammud ainult siis, kui vajad detaili\./);
  assert.doesNotMatch(source, /MiniStat label="Kindlus"/);
});

test("result page hides uncertainty details behind teacher review", async () => {
  const source = await readFile(resultClientPath, "utf8");

  assert.match(source, /requiresTeacherReview/);
  assert.match(source, /Su õpetaja vaatab selle ülesande üle/);
  assert.match(source, /Detailne sammupõhine tagasiside avaneb pärast õpetaja ülevaatust\./);
});

test("result page consumes streaming extraction updates and animates wrong steps", async () => {
  const source = await readFile(resultClientPath, "utf8");

  assert.match(source, /new EventSource\(`\/api\/submissions\/\$\{submissionId\}\/stream`\)/);
  assert.match(source, /isPartial/);
  assert.match(source, /setAnimatedErrorSteps/);
  assert.match(source, /index \* 200/);
  assert.match(source, /AI loeb su lahendust/);
});

test("result page still renders remediation with collapsible solution steps", async () => {
  const source = await readFile(resultClientPath, "utf8");

  assert.match(source, /Harjutused/);
  assert.match(source, /<details className="mt-3/);
  assert.match(source, /exercise\.solutionSteps\.map/);
});

test("result page composes section header and feedback banners", async () => {
  const source = await readFile(resultClientPath, "utf8");

  assert.match(source, /import \{ FeedbackBanner \} from "@\/components\/ui\/feedback-banner"/);
  assert.match(source, /import \{ SectionHeader \} from "@\/components\/ui\/section-header"/);
  assert.match(source, /title="Analüüsi tulemus"/);
});
