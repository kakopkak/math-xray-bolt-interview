import type { ZodError } from 'zod';

export class InvalidJsonBodyError extends Error {
  constructor() {
    super('Invalid JSON body');
    this.name = 'InvalidJsonBodyError';
  }
}

export async function readJsonBody(request: Request): Promise<unknown> {
  const raw = await request.text();
  if (!raw.trim()) {
    throw new InvalidJsonBodyError();
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new InvalidJsonBodyError();
  }
}

export async function readOptionalJsonBody(request: Request): Promise<unknown> {
  const raw = await request.text();
  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new InvalidJsonBodyError();
  }
}

export function isInvalidJsonBodyError(error: unknown): error is InvalidJsonBodyError {
  return error instanceof InvalidJsonBodyError;
}

export function formatSchemaFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  return Object.fromEntries(
    Object.entries(fieldErrors).flatMap(([field, messages]) =>
      Array.isArray(messages) && messages.length > 0 ? [[field, messages[0]]] : []
    )
  );
}
