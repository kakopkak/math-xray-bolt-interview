import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeClassLabel,
  normalizeOrganizationKey,
  resolveClassContext,
  toClassKey,
} from "./class-key";

test("toClassKey normalizes class labels", () => {
  assert.equal(toClassKey("  9B  "), "9b");
  assert.equal(toClassKey("10 Õ"), "10-o");
  assert.equal(toClassKey("11-Advanced Group"), "11-advanced-group");
});

test("resolveClassContext produces deterministic fallback", () => {
  const resolved = resolveClassContext({ gradeLevel: 8, classLabel: "" });

  assert.equal(resolved.classLabel, "8A");
  assert.equal(resolved.classKey, "8a");
});

test("normalizeOrganizationKey uses safe fallback", () => {
  assert.equal(normalizeOrganizationKey(undefined), "default-school");
  assert.equal(normalizeOrganizationKey(" Tartu Kool #1 "), "tartu-kool-1");
});

test("normalizeClassLabel keeps uppercase estonian output", () => {
  assert.equal(normalizeClassLabel(" 9b "), "9B");
  assert.equal(normalizeClassLabel(""), "");
});
