import assert from "node:assert/strict";
import test from "node:test";
import { getMisconceptionDisplay, getMisconceptionLabel } from "./misconception-labels.ts";
import { QUADRATIC_TAXONOMY } from "./taxonomy.ts";

const expectedLabels = [
  ["QE_SIGN_ERROR", "Sign error when solving", "Märgiviga lahendamisel"],
  ["QE_INCOMPLETE_FACTOR", "Incomplete or incorrect factoring", "Puudulik või vale tegurdamine"],
  ["QE_FORMULA_MISREMEMBER", "Quadratic formula recalled incorrectly", "Ruutvalem meenub valesti"],
  ["QE_SQRT_BOTH_SIDES", "Loses root when taking square root", "Kaotab juure ruutjuure võtmisel"],
  ["QE_DIVISION_BY_X", "Divides by variable (loses solution)", "Jagamine muutujaga (kaotab lahendi)"],
  ["QE_ARITHMETIC", "Basic arithmetic error", "Arvutusviga"],
  ["QE_WRONG_METHOD", "Applies inappropriate solution method", "Kasutab vale lahendusmeetodit"],
  ["QE_NO_ERROR", "Correct solution", "Korrektne lahendus"],
] as const;

test("getMisconceptionLabel returns Estonian labels by default", () => {
  for (const [code, , labelEt] of expectedLabels) {
    assert.equal(getMisconceptionLabel(code), labelEt);
  }
});

test("getMisconceptionLabel returns English labels when lang is en", () => {
  for (const [code, label] of expectedLabels) {
    assert.equal(getMisconceptionLabel(code, "en"), label);
  }
});

test("getMisconceptionLabel falls back to raw code for unknown values", () => {
  assert.equal(getMisconceptionLabel("UNKNOWN_CODE"), "UNKNOWN_CODE");
  assert.equal(getMisconceptionLabel("UNKNOWN_CODE", "en"), "UNKNOWN_CODE");
});

test("getMisconceptionLabel stays in sync with taxonomy labels", () => {
  for (const misconception of QUADRATIC_TAXONOMY) {
    assert.equal(getMisconceptionLabel(misconception.code), misconception.labelEt);
    assert.equal(getMisconceptionLabel(misconception.code, "en"), misconception.label);
  }
});

test("getMisconceptionDisplay hides secondary code for unknown values", () => {
  assert.deepEqual(getMisconceptionDisplay("UNKNOWN"), {
    label: "UNKNOWN",
    secondaryCode: null,
  });
});

test("getMisconceptionDisplay keeps secondary code for known values", () => {
  assert.deepEqual(getMisconceptionDisplay("QE_SIGN_ERROR"), {
    label: "Märgiviga lahendamisel",
    secondaryCode: "QE_SIGN_ERROR",
  });
});
