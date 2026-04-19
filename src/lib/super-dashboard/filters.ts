import type { AssignmentTopic } from '@/lib/taxonomy';
import { getMisconceptionByCode, getTaxonomyForTopic } from '@/lib/taxonomy';
import type {
  SuperDashboardFilters,
  SuperDashboardSeverityFilter,
} from '@/lib/super-dashboard/types';

const TOPIC_VALUES: AssignmentTopic[] = ['quadratic_equations', 'linear_equations', 'fractions'];
const SEVERITY_VALUES: SuperDashboardSeverityFilter[] = ['minor', 'major', 'fundamental'];

function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString();
}

function normalizeKey(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

export function parseSuperDashboardFilters(input: {
  teacherId: string;
  organizationKey: string;
  classKey?: string | null;
  assignmentId?: string | null;
  topic?: string | null;
  studentKey?: string | null;
  misconceptionCode?: string | null;
  severity?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}): SuperDashboardFilters {
  const normalizedTopic = TOPIC_VALUES.includes(input.topic as AssignmentTopic)
    ? (input.topic as AssignmentTopic)
    : null;

  const normalizedSeverity = SEVERITY_VALUES.includes(input.severity as SuperDashboardSeverityFilter)
    ? (input.severity as SuperDashboardSeverityFilter)
    : null;

  let misconceptionCode = normalizeKey(input.misconceptionCode || null);
  if (misconceptionCode) {
    if (normalizedTopic) {
      const topicTaxonomy = getTaxonomyForTopic(normalizedTopic);
      if (!topicTaxonomy.some((item) => item.code === misconceptionCode)) {
        misconceptionCode = null;
      }
    } else if (!getMisconceptionByCode(misconceptionCode)) {
      misconceptionCode = null;
    }
  }

  return {
    teacherId: input.teacherId,
    organizationKey: input.organizationKey,
    classKey: normalizeKey(input.classKey || null),
    assignmentId: normalizeKey(input.assignmentId || null),
    topic: normalizedTopic,
    studentKey: normalizeKey(input.studentKey || null),
    misconceptionCode,
    severity: normalizedSeverity,
    dateFrom: normalizeDate(input.dateFrom || null),
    dateTo: normalizeDate(input.dateTo || null),
  };
}

export function toSnapshotFilterHash(filters: SuperDashboardFilters): string {
  const stable = {
    teacherId: filters.teacherId,
    organizationKey: filters.organizationKey,
    classKey: filters.classKey || null,
    assignmentId: filters.assignmentId || null,
    topic: filters.topic || null,
    studentKey: filters.studentKey || null,
    misconceptionCode: filters.misconceptionCode || null,
    severity: filters.severity || null,
    dateFrom: filters.dateFrom || null,
    dateTo: filters.dateTo || null,
  };

  return JSON.stringify(stable);
}
