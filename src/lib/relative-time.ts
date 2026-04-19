export function formatRelativeTimeEt(value: string | Date | number, now = new Date()) {
  const target = new Date(value);
  const deltaMs = now.getTime() - target.getTime();

  if (!Number.isFinite(deltaMs)) {
    return "";
  }

  const deltaSeconds = Math.max(0, Math.round(deltaMs / 1000));
  if (deltaSeconds < 45) {
    return "äsja";
  }

  const deltaMinutes = Math.round(deltaSeconds / 60);
  if (deltaMinutes < 60) {
    return `${deltaMinutes} min tagasi`;
  }

  const deltaHours = Math.round(deltaMinutes / 60);
  if (deltaHours < 24) {
    return `${deltaHours} t tagasi`;
  }

  const deltaDays = Math.round(deltaHours / 24);
  if (deltaDays < 7) {
    return `${deltaDays} p tagasi`;
  }

  return target.toLocaleDateString("et-EE");
}
