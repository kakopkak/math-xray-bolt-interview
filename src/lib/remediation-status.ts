export type RemediationStatus = 'pending' | 'ready' | 'failed';

export type RemediationStateInput = {
  remediationStatus?: unknown;
  remediationExercises?: unknown;
  misconceptionCode?: unknown;
  remediationError?: unknown;
};

function isRemediationStatus(value: unknown): value is RemediationStatus {
  return value === 'pending' || value === 'ready' || value === 'failed';
}

export function resolveRemediationStatus(input: RemediationStateInput): RemediationStatus {
  if (isRemediationStatus(input.remediationStatus)) {
    return input.remediationStatus;
  }

  if (Array.isArray(input.remediationExercises) && input.remediationExercises.length > 0) {
    return 'ready';
  }

  if (input.misconceptionCode === 'QE_NO_ERROR') {
    return 'ready';
  }

  return 'pending';
}

export function resolveRemediationError(input: RemediationStateInput): string {
  return typeof input.remediationError === 'string' ? input.remediationError : '';
}
