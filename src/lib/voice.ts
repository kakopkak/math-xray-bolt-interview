export function extractVoiceFinalAnswer(transcript: string): string {
  const normalized = transcript.trim();
  if (!normalized) {
    return '';
  }

  const sentences = normalized
    .split(/[\n.!?]+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  return sentences[sentences.length - 1] || normalized;
}