import { z } from 'zod';
import type { AssignmentTopic as TaxonomyAssignmentTopic } from '@/lib/taxonomy';

const TrimmedStringSchema = z.string().transform((value) => value.trim());
const OptionalTrimmedStringSchema = z
  .string()
  .optional()
  .transform((value) => value?.trim() ?? '');
const TrimmedStringArraySchema = z
  .array(z.string())
  .optional()
  .transform((value) => value?.map((item) => item.trim()).filter(Boolean) ?? []);

const assignmentTopicValues: [TaxonomyAssignmentTopic, ...TaxonomyAssignmentTopic[]] = [
  'quadratic_equations',
  'linear_equations',
  'fractions',
];

export const AssignmentTopicSchema = z.enum(assignmentTopicValues);

export const CreateAssignmentRequestSchema = z
  .object({
    title: TrimmedStringSchema.refine((value) => value.length > 0, {
      message: 'Pealkiri on kohustuslik.',
    }),
    topic: AssignmentTopicSchema.optional().default('quadratic_equations'),
    gradeLevel: z.coerce.number().int().min(1).max(12).optional().default(9),
    classLabel: OptionalTrimmedStringSchema,
    organizationKey: OptionalTrimmedStringSchema,
    teacherId: OptionalTrimmedStringSchema,
    description: OptionalTrimmedStringSchema,
    answerKey: OptionalTrimmedStringSchema,
    curriculumOutcomes: TrimmedStringArraySchema,
  })
  .strict();

export type AssignmentTopic = z.infer<typeof AssignmentTopicSchema>;
export type CreateAssignmentRequest = z.infer<typeof CreateAssignmentRequestSchema>;
