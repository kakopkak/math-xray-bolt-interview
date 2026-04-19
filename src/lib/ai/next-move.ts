import { createHash } from "node:crypto";
import {
  ALL_MISCONCEPTION_CODES,
  getMisconceptionByCode,
  getTaxonomyForTopic,
} from "../taxonomy";
import { getErrorMessage } from "./error-utils";
import { getOpenAIClient } from "./openai-client";
import { isRetryableAIError, withRetry } from "./retry";
import {
  buildFallbackNextMove,
  type NextMoveClusterDistributionEntry,
  type NextMoveFallbackInput,
} from "./next-move-fallback";

const OPENAI_TIMEOUT_MS = 30_000;

const TAXONOMY_CODES = ALL_MISCONCEPTION_CODES;
const TAXONOMY_CODE_SET = new Set<string>(TAXONOMY_CODES);

function isNoErrorCode(code: string): boolean {
  return code.endsWith('_NO_ERROR');
}

export type ClusterDistributionEntry = NextMoveClusterDistributionEntry;

export type NextMoveInput = NextMoveFallbackInput;

export type NextMoveSuggestion = {
  nextProblem: {
    prompt: string;
    promptEt: string;
    answer: string;
  };
  rationaleEt: string;
  expectedErrorsByCluster: Array<{
    misconceptionCode: string;
    expectedAnswer: string;
    whyTheyWillMissItEt: string;
  }>;
  teacherMoveEt: string;
  aiGenerated: boolean;
  aiError?: string;
  generatedAt: string;
  distributionHash: string;
};

type ParsedNextMoveSuggestion = {
  nextProblem?: {
    prompt?: unknown;
    promptEt?: unknown;
    answer?: unknown;
  };
  rationaleEt?: unknown;
  expectedErrorsByCluster?: Array<{
    misconceptionCode?: unknown;
    expectedAnswer?: unknown;
    whyTheyWillMissItEt?: unknown;
  }>;
  teacherMoveEt?: unknown;
};

export function computeDistributionHash(clusters: ClusterDistributionEntry[]): string {
  const canonical = clusters
    .map((cluster) => ({
      code: cluster.misconceptionCode,
      count: cluster.count,
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex").slice(0, 16);
}

function buildNextMovePrompt(input: NextMoveInput): string {
  const validCodes = getTaxonomyForTopic(input.topic).map((item) => item.code).join(", ");
  const distribution = input.clusters
    .map(
      (cluster) =>
        `- ${cluster.misconceptionCode} (${cluster.labelEt}): ${cluster.count} students, severity ${cluster.severity}`
    )
    .join("\n");

  return `You are an expert Estonian mathematics teacher designing the next whole-class problem.

Grade: ${input.gradeLevel}. Topic: ${input.topic}. Class size: ${input.totalStudents}.

Current misconception distribution across clusters:
${distribution || "- no clusters yet"}

Your task:
1. Propose ONE single next quadratic-equation problem that discriminates between the most prevalent misconceptions in this class.
2. Explain in 2-3 Estonian sentences why this problem is the right next move.
3. For EACH non-trivial cluster (ignore QE_NO_ERROR), predict the specific incorrect answer students in that cluster will likely produce, and one Estonian sentence explaining the error mechanism.
4. Provide ONE concrete Estonian teacher move ("Soovita…", "Lase õpilastel…", "Näita ette…").

Return exactly one JSON object, no markdown fences, no prose:
{
  "nextProblem": { "prompt": "English text", "promptEt": "Estonian text", "answer": "plain text" },
  "rationaleEt": "…",
  "expectedErrorsByCluster": [
    { "misconceptionCode": "QE_SIGN_ERROR", "expectedAnswer": "…", "whyTheyWillMissItEt": "…" }
  ],
  "teacherMoveEt": "…"
}

Rules:
1. misconceptionCode must be one of: ${validCodes}.
2. Do not include *_NO_ERROR codes in expectedErrorsByCluster.
3. Estonian fields must be natural Estonian, not machine-translated.
4. Keep problem simple enough to fit on one classroom slide.
5. Return one JSON object only, no markdown fences.
6. Escape all backslashes inside JSON strings.
7. Vasta eesti keeles.`;
}

function normalizeExpectedErrors(
  errors: ParsedNextMoveSuggestion["expectedErrorsByCluster"]
): NextMoveSuggestion["expectedErrorsByCluster"] {
  if (!Array.isArray(errors)) return [];

  return errors
    .map((entry) => {
      const misconceptionCode =
        typeof entry.misconceptionCode === "string" ? entry.misconceptionCode : "";
      const expectedAnswer = typeof entry.expectedAnswer === "string" ? entry.expectedAnswer : "";
      const whyTheyWillMissItEt =
        typeof entry.whyTheyWillMissItEt === "string" ? entry.whyTheyWillMissItEt : "";
      return { misconceptionCode, expectedAnswer, whyTheyWillMissItEt };
    })
    .filter((entry) => {
      if (!entry.misconceptionCode || isNoErrorCode(entry.misconceptionCode)) return false;
      if (!TAXONOMY_CODE_SET.has(entry.misconceptionCode)) {
        console.warn("[next-move] hallucinated misconception code", {
          code: entry.misconceptionCode,
        });
        return false;
      }
      return !!getMisconceptionByCode(entry.misconceptionCode);
    });
}

export async function suggestNextMove(input: NextMoveInput): Promise<NextMoveSuggestion> {
  const distributionHash = computeDistributionHash(input.clusters);
  const generatedAt = new Date().toISOString();

  try {
    const openai = getOpenAIClient(OPENAI_TIMEOUT_MS);
    const response = await withRetry(
      () =>
        openai.chat.completions.create(
          {
            model: process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini",
            messages: [{ role: "user", content: buildNextMovePrompt(input) }],
            response_format: { type: "json_object" },
            temperature: 0.2,
            max_tokens: 1200,
          },
          { timeout: OPENAI_TIMEOUT_MS }
        ),
      {
        shouldRetry: isRetryableAIError,
        onRetry: (error, nextAttempt, delayMs) => {
          console.warn("Next-move generation retrying.", {
            errorMessage: getErrorMessage(error),
            nextAttempt,
            delayMs,
          });
        },
      }
    );

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content) as ParsedNextMoveSuggestion;

    const prompt = typeof parsed.nextProblem?.prompt === "string" ? parsed.nextProblem.prompt : "";
    const promptEt =
      typeof parsed.nextProblem?.promptEt === "string" ? parsed.nextProblem.promptEt : "";
    const answer = typeof parsed.nextProblem?.answer === "string" ? parsed.nextProblem.answer : "";
    const rationaleEt = typeof parsed.rationaleEt === "string" ? parsed.rationaleEt : "";
    const teacherMoveEt = typeof parsed.teacherMoveEt === "string" ? parsed.teacherMoveEt : "";

    if (!promptEt || !rationaleEt || !teacherMoveEt) {
      throw new Error("missing required fields");
    }

    return {
      nextProblem: {
        prompt,
        promptEt,
        answer,
      },
      rationaleEt,
      expectedErrorsByCluster: normalizeExpectedErrors(parsed.expectedErrorsByCluster),
      teacherMoveEt,
      aiGenerated: true,
      generatedAt,
      distributionHash,
    };
  } catch (error) {
    console.warn("Next-move generation fallback triggered.", {
      errorMessage: getErrorMessage(error),
    });

    return {
      ...buildFallbackNextMove(input),
      aiGenerated: false,
      aiError: getErrorMessage(error).slice(0, 300),
      generatedAt,
      distributionHash,
    };
  }
}
