import { ParentBrief } from '@/lib/models/parent-brief';
import { PersonalizedAssignment } from '@/lib/models/personalized-assignment';
import { Submission } from '@/lib/models/submission';

type BuildStudentProfileInput = {
  teacherId: string;
  organizationKey: string;
  studentKey: string;
};

type StudentProfileMisconception = {
  code: string;
  count: number;
};

export async function buildStudentProfile(input: BuildStudentProfileInput) {
  const [submissionRows, parentBriefRows, homeworkRows] = await Promise.all([
    Submission.find({
      teacherId: input.teacherId,
      organizationKey: input.organizationKey,
      studentKey: input.studentKey,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    ParentBrief.find({
      teacherId: input.teacherId,
      organizationKey: input.organizationKey,
      studentKey: input.studentKey,
    })
      .sort({ generatedAt: -1 })
      .limit(20)
      .lean(),
    PersonalizedAssignment.find({
      teacherId: input.teacherId,
      organizationKey: input.organizationKey,
      studentKey: input.studentKey,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
  ]);

  const misconceptionCounter = new Map<string, number>();
  for (const row of submissionRows) {
    const code = row.analysis?.primaryMisconception || 'QE_NO_ERROR';
    misconceptionCounter.set(code, (misconceptionCounter.get(code) || 0) + 1);
  }

  const misconceptions: StudentProfileMisconception[] = [...misconceptionCounter.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((left, right) => right.count - left.count || left.code.localeCompare(right.code));

  const latestSubmission = submissionRows[0] || null;
  const completeSubmissions = submissionRows.filter(
    (row) => row.processingStatus === 'complete'
  ).length;

  return {
    studentKey: input.studentKey,
    studentName: latestSubmission?.studentName || '',
    summary: {
      totalSubmissions: submissionRows.length,
      completeSubmissions,
      latestPrimaryMisconception: latestSubmission?.analysis?.primaryMisconception || null,
    },
    submissions: submissionRows.map((row) => ({
      id: String(row._id),
      createdAt: row.createdAt,
      processingStatus: row.processingStatus,
      primaryMisconception: row.analysis?.primaryMisconception || null,
      severityScore: row.analysis?.severityScore || 0,
    })),
    misconceptions,
    homework: homeworkRows.map((row) => ({
      id: String(row._id),
      title: row.title,
      clusterId: row.clusterId,
      status: row.status,
      shareToken: row.shareToken,
      dueAt: row.dueAt,
      createdAt: row.createdAt,
    })),
    parentBriefs: parentBriefRows.map((row) => ({
      id: String(row._id),
      bodyEt: row.bodyEt,
      generatedAt: row.generatedAt,
      sentAt: row.sentAt,
    })),
  };
}