import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const demoPagePath = new URL("./page.tsx", import.meta.url);
const demoClientPath = new URL("./demo-client.tsx", import.meta.url);

test("demo page is hidden behind the demo token query param", async () => {
  const source = await readFile(demoPagePath, "utf8");

  assert.match(source, /searchParams: Promise/);
  assert.match(source, /process\.env\.DEMO_SEED_TOKEN/);
  assert.match(source, /providedToken !== expectedToken/);
  assert.match(source, /notFound\(\)/);
});

test("demo control room exposes reset walkthrough refresh and cluster jumps", async () => {
  const source = await readFile(demoClientPath, "utf8");

  assert.match(source, /Demo juhtpult/);
  assert.match(source, /Lähtesta demoandmed/);
  assert.match(source, /Käivita 4-sammuline demo/);
  assert.match(source, /Ava supertöölaud/);
  assert.match(source, /Ava kiire õpilase töö/);
  assert.match(source, /Vaata kontrolli järjekorda/);
  assert.match(source, /Ava peamine klaster/);
  assert.match(source, /Kustutame ja laeme uuesti 18 demo-õpilast\. Jätka\?/);
  assert.match(source, /Sunni uus järgmine samm/);
  assert.match(source, /Ava klaster:/);
  assert.match(source, /setTimeout/);
  assert.match(source, /\/api\/assignments\/seed/);
  assert.match(source, /\/api\/assignments\/\$\{assignment\._id\}\/next-move/);
  assert.doesNotMatch(source, /Näidisvoor käivitati\. Kolm esitust jõuavad süsteemi 30 sekundi jooksul\./);
});
