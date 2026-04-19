export type TeacherTone = 'critical' | 'warn' | 'ok' | 'muted';

export type TeacherCopyBadge = {
  label: string;
  tone: TeacherTone;
  tooltip?: string;
};

type ReviewPriority = 'low' | 'medium' | 'high' | null | undefined;
type TrustLevel = 'high' | 'medium' | 'low' | null | undefined;
type ExtractionSource = 'ai' | 'heuristic' | null | undefined;

export function formatPriority(
  score: number | null | undefined,
  reviewPriority: ReviewPriority
): TeacherCopyBadge {
  if (reviewPriority === 'high') {
    return {
      label: 'Kõrge prioriteet',
      tone: 'critical',
      tooltip: `Prioriteediskoor: ${Math.round(Number(score ?? 0))}`,
    };
  }

  if (reviewPriority === 'medium') {
    return {
      label: 'Keskmine prioriteet',
      tone: 'warn',
      tooltip: `Prioriteediskoor: ${Math.round(Number(score ?? 0))}`,
    };
  }

  return {
    label: 'Madal prioriteet',
    tone: 'ok',
    tooltip: `Prioriteediskoor: ${Math.round(Number(score ?? 0))}`,
  };
}

export function formatPressure(score: number | null | undefined): TeacherCopyBadge {
  const numeric = Number(score ?? 0);

  if (numeric >= 60) {
    return { label: 'Kõrge takistus', tone: 'critical' };
  }

  if (numeric >= 30) {
    return { label: 'Keskmine takistus', tone: 'warn' };
  }

  return { label: 'Madal takistus', tone: 'ok' };
}

export function formatTrust(level: TrustLevel, extractionSource: ExtractionSource): TeacherCopyBadge {
  if (level === 'low') {
    return { label: 'Kontrolli üle', tone: 'critical' };
  }

  if (extractionSource === 'heuristic') {
    return { label: 'Automaatne lugemine', tone: 'warn' };
  }

  if (level === 'medium' && extractionSource === 'ai') {
    return { label: 'AI tuvastas (kontrolli)', tone: 'warn' };
  }

  return { label: 'AI tuvastas', tone: 'ok' };
}

export function formatTrend(delta: number | null | undefined, higherIsWorse: boolean) {
  const numeric = Number(delta ?? 0);

  if (Math.abs(numeric) < 0.5) {
    return {
      glyph: '→',
      label: 'Sama',
      tone: 'muted' as TeacherTone,
      description: 'Sama kui eelmisel nädalal',
    };
  }

  if (numeric >= 0.5) {
    return {
      glyph: '↑',
      label: higherIsWorse ? 'Rohkem' : 'Parem',
      tone: higherIsWorse ? ('critical' as TeacherTone) : ('ok' as TeacherTone),
      description: higherIsWorse ? 'Rohkem kui eelmisel nädalal' : 'Parem kui eelmisel nädalal',
    };
  }

  return {
    glyph: '↓',
    label: higherIsWorse ? 'Vähem' : 'Nõrgem',
    tone: higherIsWorse ? ('ok' as TeacherTone) : ('warn' as TeacherTone),
    description: higherIsWorse ? 'Vähem kui eelmisel nädalal' : 'Nõrgem kui eelmisel nädalal',
  };
}

export function formatMasteryFraction(mastered: number, total: number) {
  if (total === 0) {
    return {
      label: 'Andmeid pole',
      tone: 'muted' as TeacherTone,
    };
  }

  return {
    label: `${mastered}/${total} sai hakkama`,
    tone: mastered === total ? ('ok' as TeacherTone) : mastered > 0 ? ('warn' as TeacherTone) : ('critical' as TeacherTone),
  };
}

export function formatRecurrence(
  recurring: number | null | undefined,
  early: number | null | undefined,
  divergence: number | null | undefined
) {
  const chips: string[] = [];

  if (Number(recurring ?? 0) >= 2) {
    chips.push(`${Math.round(Number(recurring ?? 0))} kordust`);
  }
  if (Number(early ?? 0) >= 1) {
    chips.push('Varajane eksimus');
  }
  if (Number(divergence ?? 0) >= 1) {
    chips.push('Vastus ei klapi seletusega');
  }

  return chips;
}

export function formatReasonPhrase(studentRow: {
  divergenceCount?: number | null;
  recurringMisconceptionCount?: number | null;
  earlyBreakdownCount?: number | null;
  topMisconceptionLabelEt?: string | null;
}) {
  if (Number(studentRow.divergenceCount ?? 0) >= 1) {
    return 'Vastus ei klapi seletusega';
  }

  if (Number(studentRow.recurringMisconceptionCount ?? 0) >= 2 && studentRow.topMisconceptionLabelEt) {
    return `Korduv väärarusaam: ${studentRow.topMisconceptionLabelEt}`;
  }

  if (Number(studentRow.earlyBreakdownCount ?? 0) >= 1) {
    return 'Eksib juba alguses';
  }

  if (studentRow.topMisconceptionLabelEt) {
    return studentRow.topMisconceptionLabelEt;
  }

  return 'Vajab silmi';
}

export function formatParentBriefTitle(studentName: string) {
  return `${studentName} lapsevanema kokkuvõte`;
}
