export const SUBMISSION_PROCESSING_STATUSES = [
  "pending",
  "extracting",
  "classifying",
  "needs_manual_review",
  "complete",
  "error",
] as const;

export type SubmissionProcessingStatus =
  (typeof SUBMISSION_PROCESSING_STATUSES)[number];

export const ACTIVE_SUBMISSION_PROCESSING_STATUSES = [
  "pending",
  "extracting",
  "classifying",
] as const satisfies readonly SubmissionProcessingStatus[];

export function isActiveSubmissionProcessingStatus(
  status: SubmissionProcessingStatus
): boolean {
  return ACTIVE_SUBMISSION_PROCESSING_STATUSES.includes(
    status as (typeof ACTIVE_SUBMISSION_PROCESSING_STATUSES)[number]
  );
}
