import type { IAssignment } from "../models/assignment";

const MAX_TITLE_LENGTH = 80;

function normalizeTitle(parentTitle: string) {
  const nextTitle = `Kordamine: ${parentTitle}`.trim();
  return nextTitle.slice(0, MAX_TITLE_LENGTH);
}

export function buildSpawnPayload(parent: IAssignment): Partial<IAssignment> {
  const nextMove = parent.nextMove;
  const promptEt = nextMove?.nextProblem?.promptEt?.trim();
  const generatedAt = nextMove?.generatedAt;

  if (!nextMove || !promptEt || !generatedAt) {
    throw new Error("Missing cached next-move suggestion");
  }

  return {
    title: normalizeTitle(parent.title),
    topic: parent.topic,
    gradeLevel: parent.gradeLevel,
    classLabel: parent.classLabel,
    classKey: parent.classKey,
    organizationKey: parent.organizationKey,
    teacherId: parent.teacherId,
    description: nextMove.rationaleEt,
    answerKey: nextMove.nextProblem.answer,
    curriculumOutcomes: [...(parent.curriculumOutcomes || [])],
    status: "draft",
    submissionCount: 0,
    parentAssignmentId: parent._id,
    generationSource: "next-move-spawn",
    taxonomyVersion: parent.taxonomyVersion || '2026-04-topic-v1',
  };
}
