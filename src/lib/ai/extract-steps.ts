import { getErrorMessage } from './error-utils';
import { getOpenAIClient } from './openai-client';
import { isRetryableAIError, withRetry } from './retry';

const OPENAI_TIMEOUT_MS = 30_000;

export interface RawExtractedStep {
  stepNumber: number;
  content: string;
  latex?: string;
}

export interface ExtractionResult {
  steps: RawExtractedStep[];
  finalAnswer: string;
  isComplete: boolean;
}

type ExtractionStreamOptions = {
  onPartialUpdate?: (result: ExtractionResult) => Promise<void> | void;
};

const EXTRACTION_SYSTEM_PROMPT = `You are a math solution analyzer. Extract each step of the student's math solution.

Return ONLY newline-delimited records in this exact format, with no markdown and no extra commentary:
STEP|1|the exact first step the student wrote
STEP|2|the exact second step the student wrote
FINAL|the student's final answer
COMPLETE|true

Rules:
- Emit each STEP line as soon as you identify it
- Include EXACTLY what the student wrote, including errors
- Do NOT correct the work
- Number steps sequentially
- Put only one step on each STEP line
- If you are unsure whether the extraction is complete, use COMPLETE|false`;

export function parseExtractionResponse(text: string): ExtractionResult {
  const stepsByNumber = new Map<number, RawExtractedStep>();
  let finalAnswer = '';
  let isComplete = false;

  for (const rawLine of text.replace(/\r/g, '').split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    const parts = line.split('|');
    const tag = parts[0]?.trim().toUpperCase();
    if (tag === 'STEP') {
      const stepNumber = Number(parts[1]);
      const content = parts.slice(2).join('|').trim();
      if (!Number.isFinite(stepNumber) || stepNumber <= 0 || !content) {
        continue;
      }

      stepsByNumber.set(stepNumber, {
        stepNumber,
        content,
        latex: content,
      });
      continue;
    }

    if (tag === 'FINAL') {
      finalAnswer = parts.slice(1).join('|').trim();
      continue;
    }

    if (tag === 'COMPLETE') {
      isComplete = parts[1]?.trim().toLowerCase() === 'true';
    }
  }

  return {
    steps: [...stepsByNumber.values()].sort((left, right) => left.stepNumber - right.stepNumber),
    finalAnswer,
    isComplete,
  };
}

async function consumeExtractionStream(
  stream: AsyncIterable<{
    choices?: Array<{
      delta?: {
        content?: string | null;
      };
    }>;
  }>,
  options: ExtractionStreamOptions = {}
): Promise<ExtractionResult> {
  let transcript = '';
  let buffer = '';
  let lastPublishedKey = '';

  const publishPartialUpdate = async (snapshot: ExtractionResult) => {
    const publishKey = JSON.stringify(snapshot);
    if (!options.onPartialUpdate || publishKey === lastPublishedKey) {
      return;
    }
    lastPublishedKey = publishKey;
    await options.onPartialUpdate(snapshot);
  };

  const flushBuffer = async (flushRemainder = false) => {
    let newlineIndex = buffer.indexOf('\n');
    while (newlineIndex !== -1) {
      transcript += `${buffer.slice(0, newlineIndex).trim()}\n`;
      buffer = buffer.slice(newlineIndex + 1);
      await publishPartialUpdate(parseExtractionResponse(transcript));
      newlineIndex = buffer.indexOf('\n');
    }

    if (flushRemainder && buffer.trim()) {
      transcript += `${buffer.trim()}\n`;
      buffer = '';
      await publishPartialUpdate(parseExtractionResponse(transcript));
    }
  };

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (!delta) {
      continue;
    }

    buffer += delta;
    await flushBuffer(false);
  }

  await flushBuffer(true);
  return parseExtractionResponse(transcript);
}

export async function extractStepsFromPhoto(
  imageUrl: string,
  options: ExtractionStreamOptions = {}
): Promise<ExtractionResult> {
  const openai = getOpenAIClient(OPENAI_TIMEOUT_MS);
  const stream = await withRetry(
    () =>
      openai.chat.completions.create(
        {
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: imageUrl, detail: 'high' },
                },
                {
                  type: 'text',
                  text: 'Analyze this student\'s math work. Extract every step of their solution as JSON.',
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 2000,
          stream: true,
        },
        { timeout: OPENAI_TIMEOUT_MS }
      ),
    {
      shouldRetry: isRetryableAIError,
      onRetry: (error, nextAttempt, delayMs) => {
        console.warn('Extraction request retrying.', {
          errorMessage: getErrorMessage(error),
          nextAttempt,
          delayMs,
        });
      },
    }
  );

  return consumeExtractionStream(stream, options);
}

export async function extractStepsFromText(
  typedSolution: string,
  options: ExtractionStreamOptions = {}
): Promise<ExtractionResult> {
  const openai = getOpenAIClient(OPENAI_TIMEOUT_MS);
  const stream = await withRetry(
    () =>
      openai.chat.completions.create(
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
            {
              role: 'user',
              content: `Extract the steps from this student's typed math solution:\n\n${typedSolution}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 2000,
          stream: true,
        },
        { timeout: OPENAI_TIMEOUT_MS }
      ),
    {
      shouldRetry: isRetryableAIError,
      onRetry: (error, nextAttempt, delayMs) => {
        console.warn('Extraction request retrying.', {
          errorMessage: getErrorMessage(error),
          nextAttempt,
          delayMs,
        });
      },
    }
  );

  return consumeExtractionStream(stream, options);
}
