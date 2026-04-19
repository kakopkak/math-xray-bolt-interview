import { z } from 'zod';
import type { MisconceptionCode } from '@/lib/taxonomy';
import { ALL_MISCONCEPTIONS } from '@/lib/taxonomy';

const misconceptionCodeValues = ALL_MISCONCEPTIONS.map((item) => item.code) as [
  MisconceptionCode,
  ...MisconceptionCode[],
];

export const MisconceptionCodeSchema = z.enum(misconceptionCodeValues);

export const ReviewOverrideSchema = z
  .object({
    note: z
      .string()
      .optional()
      .transform((value) => value?.trim() ?? '')
      .refine((value) => value.length <= 600, {
        message: 'Märkus on liiga pikk (max 600 märki).',
      }),
    overrideMisconceptionCode: z
      .union([z.string(), z.null(), z.undefined()])
      .transform((value) => value?.trim() ?? '')
      .refine((value) => !value || MisconceptionCodeSchema.safeParse(value).success, {
        message: 'Vigane väärarusaama kood.',
      })
      .transform((value) => value || null),
  })
  .strict();

export type ReviewOverrideRequest = z.infer<typeof ReviewOverrideSchema>;
