import { APIRequestContext, expect } from "@playwright/test";

const DEMO_SEED_TOKEN = process.env.DEMO_SEED_TOKEN ?? "playwright-demo-token";

type AssignmentSeedPayload = {
  assignmentId: string;
  error?: string;
};

type AssignmentPayload = {
  _id: string;
};

type SubmissionPayload = {
  _id: string;
  processingStatus:
    | "pending"
    | "extracting"
    | "classifying"
    | "needs_manual_review"
    | "complete"
    | "error";
  processingError?: string;
};

type ClusterPayload = {
  _id: string;
};

export function uniqueName(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function requireMongoUri() {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is required for DB-backed e2e tests. Set it in .env.local (cp .env.example .env.local) or export MONGODB_URI before running npm run test:e2e."
    );
  }
}

export async function seedDemoAssignment(request: APIRequestContext) {
  const response = await request.post("/api/assignments/seed", {
    headers: {
      "x-demo-token": DEMO_SEED_TOKEN,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as AssignmentSeedPayload;
  if (!response.ok()) {
    throw new Error(payload.error || `Demo seed request failed with status ${response.status()}.`);
  }

  expect(payload.assignmentId).toBeTruthy();
  return payload.assignmentId;
}

export async function createAssignment(
  request: APIRequestContext,
  overrides: Partial<{ title: string; gradeLevel: number; description: string; answerKey: string }> = {}
) {
  const response = await request.post("/api/assignments", {
    data: {
      title: overrides.title ?? uniqueName("E2E ülesanne"),
      gradeLevel: overrides.gradeLevel ?? 9,
      description: overrides.description ?? "Deterministlik e2e testülesanne.",
      answerKey: overrides.answerKey ?? "x² + 5x + 6 = 0 -> (x+2)(x+3)=0 -> x=-2, x=-3",
      topic: "quadratic_equations",
    },
  });

  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as AssignmentPayload;
  expect(payload._id).toBeTruthy();
  return payload._id;
}

export async function createTypedSubmission(
  request: APIRequestContext,
  assignmentId: string,
  studentName = uniqueName("Õpilane")
) {
  const response = await request.post(`/api/assignments/${assignmentId}/submit`, {
    data: {
      studentName,
      inputType: "typed",
      rawContent: "x² + 5x + 6 = 0\n(x+2)(x+3)=0\nx=-2 või x=-3",
    },
  });

  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as SubmissionPayload;
  expect(payload._id).toBeTruthy();
  return payload._id;
}

export async function waitForSubmissionSettled(
  request: APIRequestContext,
  submissionId: string,
  timeoutMs = 45_000
) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await request.get(`/api/submissions/${submissionId}`);
    expect(response.ok()).toBeTruthy();

    const payload = (await response.json()) as SubmissionPayload;
    if (
      payload.processingStatus === "complete" ||
      payload.processingStatus === "needs_manual_review" ||
      payload.processingStatus === "error"
    ) {
      return payload;
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`Submission ${submissionId} did not settle within ${timeoutMs}ms`);
}

export async function waitForSubmissionComplete(
  request: APIRequestContext,
  submissionId: string,
  timeoutMs = 45_000
) {
  const payload = await waitForSubmissionSettled(request, submissionId, timeoutMs);

  if (payload.processingStatus !== "complete") {
    throw new Error(
      `Submission ${submissionId} finished with status ${payload.processingStatus}${
        payload.processingError ? `: ${payload.processingError}` : ""
      }`
    );
  }

  return payload;
}

export async function getFirstClusterId(request: APIRequestContext, assignmentId: string) {
  const response = await request.get(`/api/assignments/${assignmentId}/clusters`);
  expect(response.ok()).toBeTruthy();

  const payload = (await response.json()) as ClusterPayload[];
  expect(payload.length).toBeGreaterThan(0);
  return payload[0]._id;
}

export async function getFirstSubmissionId(request: APIRequestContext, assignmentId: string) {
  const response = await request.get(`/api/assignments/${assignmentId}/submissions`);
  expect(response.ok()).toBeTruthy();

  const payload = (await response.json()) as SubmissionPayload[];
  expect(payload.length).toBeGreaterThan(0);
  return payload[0]._id;
}
