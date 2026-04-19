import { formatParentBriefTitle } from '@/lib/teacher-copy';

type ParentBriefInput = {
  studentName: string;
  misconceptionCodes: string[];
};

export function buildParentBriefPrompt(input: ParentBriefInput) {
  const misconceptionText = input.misconceptionCodes.length
    ? input.misconceptionCodes.join(', ')
    : 'QE_NO_ERROR';

  return [
    formatParentBriefTitle(input.studentName),
    `Fookus väärarusaamad: ${misconceptionText}`,
]
    .join('\n')
    .trim();
}