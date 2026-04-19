import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const routePath = path.join(
  process.cwd(),
  "src/app/api/teacher/super-dashboard/export/route.ts"
);

test("super dashboard export route sanitizes CSV values for quotes and newlines", async () => {
  const source = await readFile(routePath, "utf8");

  assert.match(source, /Content-Type': 'text\/csv; charset=utf-8'|\"Content-Type\": \"text\/csv; charset=utf-8\"/);
  assert.match(source, /replace\(\/\[\\r\\n\]\/g, ' '\)/);
  assert.match(source, /replace\(\/\"\/g, '\"\"'\)/);
});
