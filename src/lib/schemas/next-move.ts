import { z } from 'zod';

export const NextMoveRequestSchema = z
  .object({
    forceRefresh: z.boolean().optional().default(false),
  })
  .strict();

export type NextMoveRequest = z.infer<typeof NextMoveRequestSchema>;
