import { getMisconceptionByCode } from "./taxonomy.ts";

export function getMisconceptionLabel(code: string, lang: "en" | "et" = "et"): string {
  const misconception = getMisconceptionByCode(code);
  if (!misconception) {
    return code;
  }
  return lang === "en" ? misconception.label : misconception.labelEt;
}

export function getMisconceptionDisplay(code: string, lang: "en" | "et" = "et"): {
  label: string;
  secondaryCode: string | null;
} {
  const label = getMisconceptionLabel(code, lang);

  return {
    label,
    secondaryCode: label === code ? null : code,
  };
}
