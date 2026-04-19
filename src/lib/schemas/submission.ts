import { z } from 'zod';

const OptionalTrimmedStringSchema = z
  .string()
  .optional()
  .transform((value) => value?.trim() ?? '');

export const SubmissionInputTypeSchema = z.enum(['typed', 'photo']);

export const SubmissionInputSchema = z
  .object({
    studentName: z.string().transform((value) => value.trim()),
    inputType: SubmissionInputTypeSchema,
    rawContent: OptionalTrimmedStringSchema,
    typedSolution: OptionalTrimmedStringSchema,
    photoBase64: OptionalTrimmedStringSchema,
    voiceAudioBase64: OptionalTrimmedStringSchema,
    voiceMimeType: OptionalTrimmedStringSchema,
  })
  .strict();

export type SubmissionInputType = z.infer<typeof SubmissionInputTypeSchema>;
export type SubmissionInputRequest = z.infer<typeof SubmissionInputSchema>;
