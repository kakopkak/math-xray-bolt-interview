import { getMisconceptionByCode } from '../taxonomy';
import type { RemediationExercise } from '../models/cluster';
import { v4 as uuidv4 } from 'uuid';
import { getErrorMessage } from './error-utils';
import { getOpenAIClient } from './openai-client';
import { isRetryableAIError, withRetry } from './retry';

const OPENAI_TIMEOUT_MS = 30_000;

type HeuristicRemediationInput = {
  misconceptionCode: string;
  misconceptionLabel: string;
  misconceptionLabelEt: string;
  exampleError: string;
  correctApproach: string;
  prerequisiteConcept: string;
  gradeLevel: number;
};

export function buildHeuristicRemediationExercises(
  input: HeuristicRemediationInput
): RemediationExercise[] {
  const {
    misconceptionCode,
    misconceptionLabel,
    misconceptionLabelEt,
    exampleError,
    correctApproach,
    prerequisiteConcept,
    gradeLevel,
  } = input;

  const sharedHint = `Keskendu eeldusele "${prerequisiteConcept || 'täpne sümbolite käsitlemine'}" ja kontrolli enne järgmist sammu kõiki märke.`;

  return [
    {
      id: uuidv4(),
      difficulty: 'scaffolded',
      targetMisconception: misconceptionCode,
      prompt: `Grade ${gradeLevel}: Rewrite this incorrect step and fix it: ${exampleError}`,
      promptEt: `${gradeLevel}. klass: Kirjuta see vigane samm ümber ja paranda see: ${exampleError}`,
      hint: sharedHint,
      solutionSteps: [
        `Tuvasta täpne väärarusaam: ${misconceptionLabelEt}.`,
        `Võrdle seda õige lähenemisega: ${correctApproach}.`,
        'Kirjuta kogu lahenduskäik uuesti õigete märkide ja tehetega.',
      ],
    },
    {
      id: uuidv4(),
      difficulty: 'standard',
      targetMisconception: misconceptionCode,
      prompt: `Solve and justify each step without repeating "${misconceptionLabel}": x² + 7x + 12 = 0`,
      promptEt: `Lahenda ja põhjenda iga sammu ilma veata "${misconceptionLabelEt}": x² + 7x + 12 = 0`,
      hint: 'Kirjuta iga sammu juurde, millist reeglit kasutad, enne kui arvutad.',
      solutionSteps: [
        'Vali sobiv meetod (tegurdamine või ruutvalem) ja põhjenda valikut.',
        'Lahenda võrrand hoolikalt, säilitades märgid ja tehete järjekorra.',
        'Asenda saadud juured algsesse võrrandisse ja kontrolli tulemust.',
      ],
    },
    {
      id: uuidv4(),
      difficulty: 'transfer',
      targetMisconception: misconceptionCode,
      prompt:
        'A rectangle has area 48 m² and side lengths (x + 2) and (x + 6). Build and solve the quadratic equation for x.',
      promptEt:
        'Ristküliku pindala on 48 m² ja küljed on (x + 2) ning (x + 6). Koosta ja lahenda x-i ruutvõrrand.',
      hint: 'Tõlgi tekstülesanne esmalt üheks võrrandiks ja lahenda seejärel samm-sammult.',
      solutionSteps: [
        'Moodusta võrrand (x + 2)(x + 6) = 48 ja vii kõik liikmed ühele poole.',
        'Lahenda saadud ruutvõrrand, jättes kontrollsammud vahele jätmata.',
        'Tõlgenda, milline juur on geomeetrilises kontekstis sobiv.',
      ],
    },
  ];
}

export async function generateRemediation(
  misconceptionCode: string,
  gradeLevel: number
): Promise<RemediationExercise[]> {
  const taxonomy = getMisconceptionByCode(misconceptionCode);
  if (!taxonomy || misconceptionCode.endsWith('_NO_ERROR')) return [];

  const prompt = `You are an Estonian math teacher creating targeted practice exercises for grade ${gradeLevel} students.

A group of students shares this misconception:
- Code: ${taxonomy.code}
- Description: ${taxonomy.description}
- Example of their error: ${taxonomy.exampleError}
- The correct approach: ${taxonomy.correctApproach}
- Prerequisite concept they're missing: ${taxonomy.prerequisiteConcept}

Generate exactly 3 exercises:
1. SCAFFOLDED: Breaks down the specific skill with guided steps. Include hints.
2. STANDARD: A practice problem that forces them to confront this specific error.
3. TRANSFER: The same concept applied in a different context (word problem or different equation form).

All learner-facing fields must be in Estonian:
- promptEt
- hint
- solutionSteps

You may keep "prompt" in English for debugging, but "promptEt", "hint", and "solutionSteps" must be Estonian.

Return ONLY valid JSON (no markdown):
{
  "exercises": [
    {
      "difficulty": "scaffolded",
      "prompt": "Problem text in English",
      "promptEt": "Problem text in Estonian",
      "hint": "A helpful hint",
      "solutionSteps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."]
    },
    {
      "difficulty": "standard",
      "prompt": "...",
      "promptEt": "...",
      "hint": "...",
      "solutionSteps": ["..."]
    },
    {
      "difficulty": "transfer",
      "prompt": "...",
      "promptEt": "...",
      "hint": "...",
      "solutionSteps": ["..."]
    }
  ]
  }`;

  try {
    const openai = getOpenAIClient(OPENAI_TIMEOUT_MS);
    const response = await withRetry(
      () =>
        openai.chat.completions.create(
          {
            model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 2000,
          },
          { timeout: OPENAI_TIMEOUT_MS }
        ),
      {
        shouldRetry: isRetryableAIError,
        onRetry: (error, nextAttempt, delayMs) => {
          console.warn('Remediation generation retrying.', {
            errorMessage: getErrorMessage(error),
            nextAttempt,
            delayMs,
          });
        },
      }
    );

    const text = response.choices[0]?.message?.content || '{}';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const exercises = (parsed.exercises || []).map((e: Record<string, unknown>) => ({
      id: uuidv4(),
      prompt: e.prompt as string || '',
      promptEt: e.promptEt as string || '',
      targetMisconception: misconceptionCode,
      difficulty: e.difficulty as 'scaffolded' | 'standard' | 'transfer',
      hint: e.hint as string || '',
      solutionSteps: (e.solutionSteps as string[]) || [],
    }));

    if (exercises.length === 3) {
      return exercises;
    }
  } catch (error) {
    console.warn('Remediation generation fallback triggered.', {
      errorMessage: getErrorMessage(error),
    });
    // Fall through to deterministic fallback.
  }

  return buildHeuristicRemediationExercises({
    misconceptionCode: taxonomy.code,
    misconceptionLabel: taxonomy.label,
    misconceptionLabelEt: taxonomy.labelEt,
    exampleError: taxonomy.exampleError,
    correctApproach: taxonomy.correctApproach,
    prerequisiteConcept: taxonomy.prerequisiteConcept,
    gradeLevel,
  });
}
