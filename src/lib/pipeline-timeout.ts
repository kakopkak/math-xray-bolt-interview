export const PIPELINE_TIMEOUT_REASON = 'pipeline_timeout';
export const PIPELINE_TIMEOUT_OBSERVE_MS = 60_000;
export const PIPELINE_TIMEOUT_STALE_MS = 90_000;
export const PIPELINE_TIMEOUT_MESSAGE_ET =
  'Automaatne analüüs jäi toppama. Palun vaata lahendus käsitsi üle.';

export function getManualReviewMessage(processingError: string, fallback: string): string {
  if (!processingError) {
    return fallback;
  }

  return processingError === PIPELINE_TIMEOUT_REASON
    ? PIPELINE_TIMEOUT_MESSAGE_ET
    : processingError;
}
