import assert from "node:assert/strict";
import test from "node:test";
import {
  getSubmitValidationMessage,
  hasSubmitValidationErrors,
  normalizeSubmitInput,
  toNormalizedSubmitPayload,
  validateSubmitInput,
} from "./submit-validation.ts";

test("validateSubmitInput requires a non-empty student name", () => {
  const errors = validateSubmitInput({
    studentName: "   ",
    inputType: "typed",
    typedSolution: "x^2 + 5x + 6 = 0",
    photoBase64: "",
    voiceAudioBase64: "",
    voiceMimeType: "",
  });

  assert.equal(errors.studentName, "Palun sisesta õpilase nimi.");
  assert.equal(hasSubmitValidationErrors(errors), true);
  assert.equal(getSubmitValidationMessage(errors), "Palun sisesta õpilase nimi.");
});

test("validateSubmitInput requires typed content for typed submissions", () => {
  const errors = validateSubmitInput({
    studentName: "Mari",
    inputType: "typed",
    typedSolution: "   ",
    photoBase64: "",
    voiceAudioBase64: "",
    voiceMimeType: "",
  });

  assert.equal(errors.typedSolution, "Palun sisesta lahenduskäik.");
});

test("validateSubmitInput requires photo content for photo submissions", () => {
  const errors = validateSubmitInput({
    studentName: "Mari",
    inputType: "photo",
    typedSolution: "",
    photoBase64: " ",
    voiceAudioBase64: "",
    voiceMimeType: "",
  });

  assert.equal(errors.photoBase64, "Palun lisa foto lahendusest.");
});

test("validateSubmitInput rejects invalid photo payloads", () => {
  const errors = validateSubmitInput({
    studentName: "Mari",
    inputType: "photo",
    typedSolution: "",
    photoBase64: "not-a-data-url",
    voiceAudioBase64: "",
    voiceMimeType: "",
  });

  assert.equal(errors.photoBase64, "Lisa kehtiv pildifail (JPG või PNG).");
});

test("validateSubmitInput accepts valid typed and photo submissions", () => {
  const typedErrors = validateSubmitInput({
    studentName: "Mari",
    inputType: "typed",
    typedSolution: "x^2 + 5x + 6 = 0",
    photoBase64: "",
    voiceAudioBase64: "",
    voiceMimeType: "",
  });
  const photoErrors = validateSubmitInput({
    studentName: "Mari",
    inputType: "photo",
    typedSolution: "",
    photoBase64: "data:image/png;base64,QUJD",
    voiceAudioBase64: "",
    voiceMimeType: "",
  });

  assert.equal(hasSubmitValidationErrors(typedErrors), false);
  assert.equal(hasSubmitValidationErrors(photoErrors), false);
  assert.deepEqual(typedErrors, {});
  assert.deepEqual(photoErrors, {});
});

test("normalizeSubmitInput reads rawContent fallback", () => {
  const normalized = normalizeSubmitInput({
    studentName: " Mari ",
    inputType: "typed",
    rawContent: "x^2 + 4x + 4 = 0",
  });

  assert.equal(normalized.studentName, "Mari");
  assert.equal(normalized.typedSolution, "x^2 + 4x + 4 = 0");
});

test("toNormalizedSubmitPayload composes final rawContent", () => {
  const payload = toNormalizedSubmitPayload({
    studentName: "Mari",
    inputType: "typed",
    typedSolution: " x = 2 ",
    photoBase64: "",
    voiceAudioBase64: "",
    voiceMimeType: "",
  });

  assert.equal(payload.studentName, "Mari");
  assert.equal(payload.inputType, "typed");
  assert.equal(payload.rawContent, "x = 2");
});
