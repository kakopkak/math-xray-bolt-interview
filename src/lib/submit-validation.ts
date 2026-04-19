import type { SubmissionInputType as SubmitInputType } from '@/lib/schemas';

export type SubmitValidationInput = {
  studentName: string;
  inputType: SubmitInputType;
  typedSolution: string;
  photoBase64: string;
  voiceAudioBase64: string;
  voiceMimeType: string;
};

export type SubmitValidationErrors = {
  studentName?: string;
  typedSolution?: string;
  photoBase64?: string;
};

export type NormalizedSubmitPayload = {
  studentName: string;
  inputType: SubmitInputType;
  rawContent: string;
};

const PHOTO_DATA_URL_PATTERN = /^data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=\s]+$/;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_TYPED_SOLUTION_CHARS = 16_000;
const MAX_STUDENT_NAME_CHARS = 80;

function estimateBase64Size(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex < 0) return 0;
  const base64 = dataUrl.slice(commaIndex + 1).replace(/\s+/g, "");
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

export function normalizeSubmitInput(input: {
  studentName?: unknown;
  inputType?: unknown;
  rawContent?: unknown;
  typedSolution?: unknown;
  photoBase64?: unknown;
  voiceAudioBase64?: unknown;
  voiceMimeType?: unknown;
}): SubmitValidationInput {
  const toTrimmedString = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const inputType: SubmitInputType = input.inputType === "photo" ? "photo" : "typed";
  const studentName = toTrimmedString(input.studentName);
  const typedSolution = toTrimmedString(input.typedSolution);
  const photoBase64 = toTrimmedString(input.photoBase64);
  const rawContent = toTrimmedString(input.rawContent);
  const voiceAudioBase64 = toTrimmedString(input.voiceAudioBase64);
  const voiceMimeType = toTrimmedString(input.voiceMimeType);

  return {
    studentName,
    inputType,
    typedSolution: inputType === "typed" ? typedSolution || rawContent : typedSolution,
    photoBase64: inputType === "photo" ? photoBase64 || rawContent : photoBase64,
    voiceAudioBase64,
    voiceMimeType,
  };

}
export function validateSubmitInput({
  studentName,
  inputType,
  typedSolution,
  photoBase64,
}: SubmitValidationInput): SubmitValidationErrors {
  const errors: SubmitValidationErrors = {};

  if (!studentName.trim()) {
    errors.studentName = "Palun sisesta õpilase nimi.";
  } else if (studentName.trim().length > MAX_STUDENT_NAME_CHARS) {
    errors.studentName = `Õpilase nimi on liiga pikk (max ${MAX_STUDENT_NAME_CHARS} märki).`;
  }

  if (inputType === "typed") {
    const normalizedTypedSolution = typedSolution.trim();
    if (!normalizedTypedSolution) {
      errors.typedSolution = "Palun sisesta lahenduskäik.";
      return errors;
    }

    if (normalizedTypedSolution.length > MAX_TYPED_SOLUTION_CHARS) {
      errors.typedSolution = `Lahenduskäik on liiga pikk (max ${MAX_TYPED_SOLUTION_CHARS} märki).`;
    }
    return errors;
  }

  const normalizedPhoto = photoBase64.trim();
  if (!normalizedPhoto) {
    errors.photoBase64 = "Palun lisa foto lahendusest.";
    return errors;
  }

  if (!PHOTO_DATA_URL_PATTERN.test(normalizedPhoto)) {
    errors.photoBase64 = "Lisa kehtiv pildifail (JPG või PNG).";
    return errors;
  }

  const estimatedBytes = estimateBase64Size(normalizedPhoto);
  if (estimatedBytes > MAX_PHOTO_BYTES) {
    errors.photoBase64 = "Pildifail on liiga suur. Maksimaalne lubatud suurus on 5 MB.";
  }

  return errors;
}

export function hasSubmitValidationErrors(errors: SubmitValidationErrors) {
  return Boolean(errors.studentName || errors.typedSolution || errors.photoBase64);
}

export function getSubmitValidationMessage(errors: SubmitValidationErrors) {
  return errors.studentName || errors.typedSolution || errors.photoBase64 || "";
}

export function toNormalizedSubmitPayload(input: SubmitValidationInput): NormalizedSubmitPayload {
  return {
    studentName: input.studentName.trim(),
    inputType: input.inputType,
    rawContent: input.inputType === "typed" ? input.typedSolution.trim() : input.photoBase64.trim(),
  };
}
