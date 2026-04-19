import assert from "node:assert/strict";
import test from "node:test";
import {
  getSubmitValidationMessage,
  hasSubmitValidationErrors,
  normalizeSubmitInput,
  toNormalizedSubmitPayload,
  validateSubmitInput,
} from "./submit-validation";

test("normalizeSubmitInput resolves typed rawContent fallback", () => {
  const normalized = normalizeSubmitInput({
    studentName: " Mari ",
    inputType: "typed",
    rawContent: "x^2+5x+6=0",
  });

  assert.equal(normalized.studentName, "Mari");
  assert.equal(normalized.inputType, "typed");
  assert.equal(normalized.typedSolution, "x^2+5x+6=0");
  assert.equal(normalized.voiceAudioBase64, "");
  assert.equal(normalized.voiceMimeType, "");
});

test("validateSubmitInput rejects too long names and solutions", () => {
  const errors = validateSubmitInput({
    studentName: "A".repeat(81),
    inputType: "typed",
    typedSolution: "B".repeat(16_001),
    photoBase64: "",
    voiceAudioBase64: "",
    voiceMimeType: "",
  });

  assert.ok(errors.studentName);
  assert.ok(errors.typedSolution);
  assert.equal(hasSubmitValidationErrors(errors), true);
});

test("validateSubmitInput rejects oversized photo payload", () => {
  const base64 = "A".repeat(7_000_000);
  const errors = validateSubmitInput({
    studentName: "Mari",
    inputType: "photo",
    typedSolution: "",
    photoBase64: `data:image/png;base64,${base64}`,
    voiceAudioBase64: "",
    voiceMimeType: "",
  });

  assert.equal(errors.photoBase64, "Pildifail on liiga suur. Maksimaalne lubatud suurus on 5 MB.");
});

test("normalizeSubmitInput keeps voice payload when provided", () => {
  const normalized = normalizeSubmitInput({
    studentName: " Mari ",
    inputType: "typed",
    typedSolution: "x = 2",
    photoBase64: "",
    voiceAudioBase64: " data:audio/webm;base64,QUJD ",
    voiceMimeType: " audio/webm ",
  });

  assert.equal(normalized.voiceAudioBase64, "data:audio/webm;base64,QUJD");
  assert.equal(normalized.voiceMimeType, "audio/webm");
});

test("toNormalizedSubmitPayload chooses content by input type", () => {
  const typedPayload = toNormalizedSubmitPayload({
    studentName: "Mari",
    inputType: "typed",
    typedSolution: "  x = 2  ",
    photoBase64: "",
    voiceAudioBase64: "",
    voiceMimeType: "",
  });
  const photoPayload = toNormalizedSubmitPayload({
    studentName: "Mari",
    inputType: "photo",
    typedSolution: "",
    photoBase64: " data:image/png;base64,QUJD ",
    voiceAudioBase64: "",
    voiceMimeType: "",
  });

  assert.deepEqual(typedPayload, {
    studentName: "Mari",
    inputType: "typed",
    rawContent: "x = 2",
  });
  assert.deepEqual(photoPayload, {
    studentName: "Mari",
    inputType: "photo",
    rawContent: "data:image/png;base64,QUJD",
  });
});

test("getSubmitValidationMessage prioritizes first field error", () => {
  const message = getSubmitValidationMessage({
    studentName: "Palun sisesta õpilase nimi.",
    typedSolution: "Palun sisesta lahenduskäik.",
  });
  assert.equal(message, "Palun sisesta õpilase nimi.");
});