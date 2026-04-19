import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const demoWalkthroughPath = new URL("./demo-walkthrough.tsx", import.meta.url);

test("demo walkthrough defines three guided steps with Estonian controls", async () => {
  const source = await readFile(demoWalkthroughPath, "utf8");

  assert.match(source, /const \[stepIndex, setStepIndex\] = useState\(0\)/);
  assert.match(source, /stepIndex \+ 1\}\/\{steps\.length\}/);
  assert.match(source, /Klasterdiagramm/);
  assert.match(source, /Klastrikaardid/);
  assert.match(source, /Ava analüütika/);
  assert.match(source, />Järgmine</);
  assert.match(source, /Sulge/);
});

test("demo walkthrough supports keyboard close and focus management", async () => {
  const source = await readFile(demoWalkthroughPath, "utf8");

  assert.match(source, /const dialogRef = useRef<HTMLDivElement \| null>\(null\)/);
  assert.match(source, /dialogRef\.current\?\.querySelector<HTMLElement>\("button"\)\?\.focus\(\)/);
  assert.match(source, /if \(event\.key === "Escape"\) \{\s*onClose\(\);\s*\}/);
  assert.match(source, /if \(event\.key !== "Tab"\) return;/);
  assert.match(source, /event\.shiftKey/);
  assert.match(source, /onKeyDown=\{handleDialogKeyDown\}/);
  assert.match(source, /autoFocus/);
});
