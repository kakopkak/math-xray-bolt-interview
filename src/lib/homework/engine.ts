import type { IPersonalizedAssignment } from '@/lib/models/personalized-assignment';

export type HomeworkSeverity = 'minor' | 'major' | 'fundamental';

type HomeworkTopic = 'quadratic_equations' | 'linear_equations' | 'fractions';
export type HomeworkTemplate = {
  severity: HomeworkSeverity;
  title: string;
  promptEt: string;
  answerKey: string;
};

type BuildHomeworkAssignmentsForClusterInput = {
  teacherId: string;
  organizationKey: string;
  classKey: string;
  assignmentId: string;
  clusterId: string;
  studentKeys: string[];
  template: HomeworkTemplate;
  dueAt: Date | null;
  topic: HomeworkTopic;
};

type HomeworkAssignmentDraft = Pick<
  IPersonalizedAssignment,
  | 'teacherId'
  | 'organizationKey'
  | 'classKey'
  | 'clusterId'
  | 'assignmentId'
  | 'studentKey'
  | 'title'
  | 'promptEt'
  | 'answerKey'
  | 'shareToken'
  | 'status'
  | 'dueAt'
  | 'topic'
>;

export function selectTemplateForSeverity(
  templates: HomeworkTemplate[],
  severity: HomeworkSeverity
): HomeworkTemplate | null {
  if (templates.length === 0) return null;

  const exactTemplate = templates.find((template) => template.severity === severity);
  if (exactTemplate) return exactTemplate;

  const majorTemplate = templates.find((template) => template.severity === 'major');
  if (majorTemplate) return majorTemplate;

  return templates[0];
}

export function buildHomeworkAssignmentsForCluster(
  input: BuildHomeworkAssignmentsForClusterInput,
  createShareToken: () => string
): HomeworkAssignmentDraft[] {
  const studentKeys = [...new Set(input.studentKeys.map((key) => key.trim()).filter(Boolean))];
  return studentKeys.map((studentKey) => ({
    teacherId: input.teacherId,
    organizationKey: input.organizationKey,
    classKey: input.classKey,
    clusterId: input.clusterId,
    assignmentId: input.assignmentId,
    studentKey,
    title: input.template.title,
    promptEt: input.template.promptEt,
    answerKey: input.template.answerKey,
    shareToken: createShareToken(),
    status: 'active',
    dueAt: input.dueAt,
    topic: input.topic,
  }));
}