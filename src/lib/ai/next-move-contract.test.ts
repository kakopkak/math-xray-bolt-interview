import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeDistributionHash, suggestNextMove } from "./next-move";
import { buildFallbackNextMove } from "./next-move-fallback";
import { QUADRATIC_TAXONOMY } from "../taxonomy";

test("next-move module exposes required public exports", () => {
  assert.equal(typeof suggestNextMove, "function");
  assert.equal(typeof computeDistributionHash, "function");

  const source = readFileSync(new URL("./next-move.ts", import.meta.url), "utf8");
  assert.match(source, /export type NextMoveInput\b/);
  assert.match(source, /export type NextMoveSuggestion\b/);
});

test("computeDistributionHash is deterministic for reordered clusters", () => {
  const first = computeDistributionHash([
    { misconceptionCode: "QE_SIGN_ERROR", label: "", labelEt: "", count: 4, severity: "major" },
    { misconceptionCode: "QE_ARITHMETIC", label: "", labelEt: "", count: 2, severity: "minor" },
  ]);
  const second = computeDistributionHash([
    { misconceptionCode: "QE_ARITHMETIC", label: "", labelEt: "", count: 2, severity: "minor" },
    { misconceptionCode: "QE_SIGN_ERROR", label: "", labelEt: "", count: 4, severity: "major" },
  ]);

  assert.equal(first, second);
});

test("computeDistributionHash changes when distribution counts change", () => {
  const base = computeDistributionHash([
    { misconceptionCode: "QE_SIGN_ERROR", label: "", labelEt: "", count: 4, severity: "major" },
  ]);
  const changed = computeDistributionHash([
    { misconceptionCode: "QE_SIGN_ERROR", label: "", labelEt: "", count: 5, severity: "major" },
  ]);

  assert.notEqual(base, changed);
});

test("computeDistributionHash is stable for empty cluster arrays", () => {
  const first = computeDistributionHash([]);
  const second = computeDistributionHash([]);

  assert.equal(first, second);
  assert.equal(typeof first, "string");
  assert.equal(first.length, 16);
});

test("next-move prompt contract uses topic taxonomy and validation rule", () => {
  const source = readFileSync(new URL("./next-move.ts", import.meta.url), "utf8");

  assert.match(source, /getTaxonomyForTopic\(input\.topic\)/);
  assert.match(source, /misconceptionCode must be one of:/);
  assert.match(source, /\*\_NO_ERROR codes/);
  assert.match(source, /vasta eesti keeles/i);
});

test("fallback next-move output stays schema-valid across all taxonomy codes", () => {
  for (const taxonomy of QUADRATIC_TAXONOMY) {
    const suggestion = buildFallbackNextMove({
      gradeLevel: 9,
      topic: "quadratic_equations",
      totalStudents: 12,
      clusters: [
        {
          misconceptionCode: taxonomy.code,
          label: taxonomy.label,
          labelEt: taxonomy.labelEt,
          count: 12,
          severity: "major",
        },
      ],
    });

    assert.equal(typeof suggestion.nextProblem.promptEt, "string");
    assert.equal(typeof suggestion.nextProblem.answer, "string");
    assert.equal(typeof suggestion.rationaleEt, "string");
    assert.equal(typeof suggestion.teacherMoveEt, "string");
    assert.ok(Array.isArray(suggestion.expectedErrorsByCluster));
  }
});
