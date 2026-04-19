import { Assignment } from '@/lib/models/assignment';
import { Cluster } from '@/lib/models/cluster';
import { Submission } from '@/lib/models/submission';
import type { TeacherRequestContext } from '@/lib/request-context';

export function teacherTenantFilter(context: TeacherRequestContext) {
  return {
    teacherId: context.teacherId,
    organizationKey: context.organizationKey,
  };
}

export async function findTeacherAssignmentById(
  id: string,
  context: TeacherRequestContext,
  select?: string
) {
  const query = Assignment.findOne({
    _id: id,
    ...teacherTenantFilter(context),
  });

  if (select) {
    query.select(select);
  }

  return query;
}

export async function findTeacherSubmissionById(
  id: string,
  context: TeacherRequestContext,
  select?: string
) {
  const query = Submission.findOne({
    _id: id,
    ...teacherTenantFilter(context),
  });

  if (select) {
    query.select(select);
  }

  return query;
}

export async function findTeacherClusterAccess(
  id: string,
  context: TeacherRequestContext,
  clusterSelect?: string,
  assignmentSelect = '_id teacherId organizationKey gradeLevel topic classKey classLabel title parentAssignmentId'
) {
  const clusterQuery = Cluster.findById(id);
  if (clusterSelect) {
    clusterQuery.select(clusterSelect);
  }

  const cluster = await clusterQuery;
  if (!cluster) {
    return null;
  }

  const assignmentQuery = Assignment.findOne({
    _id: cluster.assignmentId,
    ...teacherTenantFilter(context),
  });
  if (assignmentSelect) {
    assignmentQuery.select(assignmentSelect);
  }

  const assignment = await assignmentQuery;
  if (!assignment) {
    return null;
  }

  return {
    cluster,
    assignment,
  };
}
