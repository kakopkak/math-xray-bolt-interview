import assert from "node:assert/strict";
import test from "node:test";
import { resolveStudentKey, toStudentKey } from "./student-key";

test("toStudentKey normalizes accents and spaces", () => {
  assert.equal(toStudentKey("  Märi   Maasikas  "), "mari-maasikas");
  assert.equal(toStudentKey("ÕUNAPUU 123"), "ounapuu-123");
  assert.equal(toStudentKey("Mari M."), "mari-m");
});

test("resolveStudentKey normalizes existing key before using fallback", () => {
  assert.equal(resolveStudentKey("Mari Maasikas", "  Märi.. Maasikas "), "mari-maasikas");
  assert.equal(resolveStudentKey("Mari Maasikas", ""), "mari-maasikas");
});
