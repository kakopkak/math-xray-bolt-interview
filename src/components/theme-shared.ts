export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "math-xray-theme";
export const THEME_EVENT = "math-xray-theme-change";
export const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

export function sanitizeThemePreference(value: string | null): ThemePreference {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

export function resolveEffectiveTheme(
  preference: ThemePreference,
  prefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") {
    return prefersDark ? "dark" : "light";
  }

  return preference;
}

export function shouldHandleThemeStorageKey(
  eventKey: string | null,
  storageKey: string = THEME_STORAGE_KEY,
) {
  return eventKey === storageKey;
}

export function getStoredThemePreference(
  getItem: (storageKey: string) => string | null,
  storageKey: string = THEME_STORAGE_KEY,
): ThemePreference {
  try {
    return sanitizeThemePreference(getItem(storageKey));
  } catch {
    return "system";
  }
}
