import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const landingDir = path.join(process.cwd(), "src/components/landing");

const landingPagePath = path.join(landingDir, "landing-page.tsx");
const landingMenuPath = path.join(landingDir, "landing-menu.tsx");
const progressRailPath = path.join(landingDir, "progress-rail.tsx");

test("landing copy and CTA labels are canonical Estonian", async () => {
  const source = await readFile(landingPagePath, "utf8");

  assert.match(source, /Proovi demot/);
  assert.match(source, /Ava õpetaja töölaud/);
  assert.match(source, /Loo uus ülesanne/);
  assert.match(source, /Maandumislehe kiirlingid/);

  assert.doesNotMatch(source, /Try the demo/);
  assert.doesNotMatch(source, /Teacher dashboard/);
  assert.doesNotMatch(source, /Contact/);
});

test("landing menu and progress rail labels are localized", async () => {
  const menuSource = await readFile(landingMenuPath, "utf8");
  const progressSource = await readFile(progressRailPath, "utf8");

  assert.match(menuSource, /Ava navigeerimismenüü/);
  assert.match(menuSource, /Lehe navigeerimine/);
  assert.match(menuSource, /Liigu/);
  assert.match(menuSource, /Ava/);
  assert.doesNotMatch(menuSource, /role="dialog"/);
  assert.doesNotMatch(menuSource, /aria-modal/);

  assert.match(progressSource, /Koosraja edenemine/);
  assert.match(progressSource, /Koosraja sammude navigeerimine/);
  assert.match(progressSource, /Liigu sammude vahel/);

  assert.doesNotMatch(menuSource, /Open navigation menu/);
  assert.doesNotMatch(menuSource, /Site navigation/);
  assert.doesNotMatch(progressSource, /journey progress/);
});
