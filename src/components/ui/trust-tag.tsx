import { Badge } from "@/components/ui/badge";
import { formatTrust, type TeacherTone } from "@/lib/teacher-copy";

export type TrustTagLevel = "high" | "medium" | "low" | null | undefined;
export type TrustTagExtractionSource = "ai" | "heuristic" | null | undefined;

type Props = {
  level: TrustTagLevel;
  extractionSource: TrustTagExtractionSource;
  showHighAi?: boolean;
  className?: string;
  hasVoiceReasoning?: boolean;
};

const toneBadgeVariant: Record<TeacherTone, "error" | "major" | "success" | "neutral"> = {
  critical: "error",
  warn: "major",
  ok: "success",
  muted: "neutral",
};

export function getTrustExplanation(level: TrustTagLevel, extractionSource: TrustTagExtractionSource) {
  if (level === "low") {
    return "Selles lahenduses jäi automaatne tuvastus ebakindlaks. Kontrolli üle.";
  }

  if (extractionSource === "heuristic") {
    return "Lahendus loeti automaatse lugemisega. Vajadusel kontrolli pildi või teksti järgi üle.";
  }

  if (level === "medium") {
    return "AI luges lahenduse, kuid mõni samm vajab õpetaja pilku.";
  }

  return "AI luges lahenduse usaldusväärselt.";
}

export function TrustTag({
  level,
  extractionSource,
  showHighAi = false,
  className = "",
  hasVoiceReasoning = false,
}: Props) {
  const normalizedLevel = level ?? "high";
  const normalizedExtractionSource = extractionSource ?? "ai";

  if (!showHighAi && normalizedLevel === "high" && normalizedExtractionSource === "ai") {
    return null;
  }

  const badge = formatTrust(normalizedLevel, normalizedExtractionSource);
  const explanation = getTrustExplanation(normalizedLevel, normalizedExtractionSource);

  return (
    <Badge
      variant={toneBadgeVariant[badge.tone]}
      title={explanation}
      aria-label={explanation}
      className={className}
    >
      {badge.label}{hasVoiceReasoning ? ' · Hääl olemas' : ''}
    </Badge>
  );
}
