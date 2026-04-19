const MAX_STUDENT_KEY_LENGTH = 64;

function normalizeStudentKeyValue(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const collapsed = normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

  return collapsed.slice(0, MAX_STUDENT_KEY_LENGTH);
}

export function toStudentKey(name: string): string {
  return normalizeStudentKeyValue(name);
}

export function resolveStudentKey(studentName: string, existingStudentKey?: string | null): string {
  const existing = normalizeStudentKeyValue(existingStudentKey || "");
  if (existing.length > 0) {
    return existing;
  }
  return toStudentKey(studentName);
}
