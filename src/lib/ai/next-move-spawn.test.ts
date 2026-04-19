import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import { buildSpawnPayload } from "./next-move-spawn";

function buildParent(overrides: Partial<Parameters<typeof buildSpawnPayload>[0]> = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    title: "Ruutvõrrandid — Kontrolltöö",
    topic: "quadratic_equations",
    gradeLevel: 9,
    description: "",
    answerKey: "",
    curriculumOutcomes: ["M9.2"],
    nextMove: {
      nextProblem: {
        prompt: "Solve x^2 + 5x + 6 = 0",
        promptEt: "Lahenda x^2 + 5x + 6 = 0",
        answer: "x = -2 või x = -3",
      },
      rationaleEt: "Harjutab levinud märgivea vältimist.",
      expectedErrorsByCluster: [],
      teacherMoveEt: "Lase õpilastel põhjendada iga sammu.",
      aiGenerated: true,
      aiError: "",
      generatedAt: new Date(),
      distributionHash: "abc123",
    },
    ...overrides,
  } as Parameters<typeof buildSpawnPayload>[0];
}

test("builds new assignment payload from cached next-move", () => {
  const parent = buildParent();
  const payload = buildSpawnPayload(parent);

  assert.equal(payload.topic, parent.topic);
  assert.equal(payload.gradeLevel, parent.gradeLevel);
  assert.equal(payload.description, parent.nextMove?.rationaleEt);
  assert.equal(payload.answerKey, parent.nextMove?.nextProblem.answer);
  assert.equal(payload.status, "draft");
  assert.equal(payload.generationSource, "next-move-spawn");
  assert.equal(String(payload.parentAssignmentId), String(parent._id));
});

test("throws when parent has no cached next-move", () => {
  const parent = buildParent({ nextMove: null });
  assert.throws(() => buildSpawnPayload(parent), /cached next-move/i);
});

test("truncates generated title to 80 characters", () => {
  const parent = buildParent({ title: "X".repeat(120) });
  const payload = buildSpawnPayload(parent);
  assert.ok(payload.title);
  assert.equal(payload.title?.length, 80);
});

test("copies curriculumOutcomes and answerKey verbatim from next-move", () => {
  const parent = buildParent({
    curriculumOutcomes: ["M9.2", "M9.3"],
    nextMove: {
      nextProblem: {
        prompt: "Solve",
        promptEt: "Lahenda",
        answer: "x = 2",
      },
      rationaleEt: "Fookus: aritmeetika täpsus.",
      expectedErrorsByCluster: [],
      teacherMoveEt: "Too näide tahvlile.",
      aiGenerated: false,
      aiError: "fallback",
      generatedAt: new Date(),
      distributionHash: "hash",
    },
  });

  const payload = buildSpawnPayload(parent);
  assert.deepEqual(payload.curriculumOutcomes, ["M9.2", "M9.3"]);
  assert.equal(payload.answerKey, "x = 2");
});
