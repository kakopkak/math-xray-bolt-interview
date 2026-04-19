const MAX_CLASS_KEY_LENGTH = 40;
const MAX_ORGANIZATION_KEY_LENGTH = 64;

function normalizeChunk(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function normalizeClassLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.toUpperCase();
}

export function toClassKey(classLabel: string): string {
  const normalized = normalizeChunk(classLabel)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

  return normalized.slice(0, MAX_CLASS_KEY_LENGTH);
}

export function resolveClassContext(input: {
  gradeLevel: number;
  classLabel?: string | null;
}) {
  const fallbackLabel = `${Math.max(1, Math.min(12, Math.trunc(input.gradeLevel || 9)))}A`;
  const classLabel = normalizeClassLabel(input.classLabel || "") || fallbackLabel;
  const classKey = toClassKey(classLabel) || toClassKey(fallbackLabel) || "default-class";

  return {
    classLabel,
    classKey,
  };
}

export function normalizeOrganizationKey(value: string | null | undefined): string {
  const normalized = normalizeChunk(value || "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

  return normalized.slice(0, MAX_ORGANIZATION_KEY_LENGTH) || "default-school";
}
