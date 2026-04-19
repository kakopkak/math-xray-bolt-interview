import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const clientPath = new URL("./student-client.tsx", import.meta.url);

test("student profile client exposes the required trajectory tabs", async () => {
  const source = await readFile(clientPath, "utf8");

  assert.match(source, /Kokkuvõte/);
  assert.match(source, /Esitused/);
  assert.match(source, /Väärarusaamad/);
  assert.match(source, /Kodutööd/);
  assert.match(source, /Lapsevanema kirjad/);
});

test("student profile homework tab renders status history with solve links", async () => {
  const source = await readFile(clientPath, "utf8");

  assert.match(source, /Saadetud/);
  assert.match(source, /Vastatud/);
  assert.match(source, /\/solve\/\$\{row\.shareToken\}/);
});
