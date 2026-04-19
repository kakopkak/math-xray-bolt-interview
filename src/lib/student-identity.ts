import { StudentRosterEntry } from '@/lib/models/student-roster';
import { toStudentKey } from '@/lib/student-key';

type ResolveStudentIdentityInput = {
  teacherId: string;
  organizationKey: string;
  classKey: string;
  studentName: string;
};

type StudentIdentity = {
  studentKey: string;
  rosterStudentId: string | null;
  canonicalName: string;
  confidence: 'high' | 'medium' | 'low';
  matchedBy: 'roster' | 'name-heuristic';
};

function normalizeName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export async function resolveStudentIdentity(
  input: ResolveStudentIdentityInput
): Promise<StudentIdentity> {
  const name = input.studentName.trim();
  const normalizedName = normalizeName(name);

  const rosterEntries = await StudentRosterEntry.find({
    teacherId: input.teacherId,
    organizationKey: input.organizationKey,
    classKey: input.classKey,
    active: true,
  })
    .select('rosterStudentId canonicalName aliases')
    .lean();

  let bestMatch:
    | {
        rosterStudentId: string;
        canonicalName: string;
        confidence: 'high' | 'medium';
      }
    | null = null;

  for (const entry of rosterEntries) {
    const canonical = normalizeName(entry.canonicalName || '');
    if (canonical && canonical === normalizedName) {
      bestMatch = {
        rosterStudentId: entry.rosterStudentId,
        canonicalName: entry.canonicalName,
        confidence: 'high',
      };
      break;
    }

    if (!bestMatch) {
      const aliases = (entry.aliases || []).map((alias: string) => normalizeName(alias));
      if (aliases.includes(normalizedName)) {
        bestMatch = {
          rosterStudentId: entry.rosterStudentId,
          canonicalName: entry.canonicalName,
          confidence: 'medium',
        };
      }
    }
  }

  if (bestMatch) {
    return {
      studentKey: toStudentKey(bestMatch.canonicalName || name),
      rosterStudentId: bestMatch.rosterStudentId,
      canonicalName: bestMatch.canonicalName || name,
      confidence: bestMatch.confidence,
      matchedBy: 'roster',
    };
  }

  return {
    studentKey: toStudentKey(name),
    rosterStudentId: null,
    canonicalName: name,
    confidence: 'low',
    matchedBy: 'name-heuristic',
  };
}
