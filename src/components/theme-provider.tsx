"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  SYSTEM_THEME_QUERY,
  THEME_EVENT,
  THEME_STORAGE_KEY,
  resolveEffectiveTheme,
  sanitizeThemePreference,
  shouldHandleThemeStorageKey,
  type ResolvedTheme,
  type ThemePreference,
} from "./theme-shared";

export type { ResolvedTheme, ThemePreference } from "./theme-shared";

type ThemeContextValue = {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeRoot = {
  dataset: {
    theme?: string;
  };
};

export type ThemeRuntimeDependencies = {
  getThemePreference: () => ThemePreference;
  getPrefersDark: () => boolean;
  applyResolvedTheme: (theme: ResolvedTheme) => void;
};

export function applyResolvedThemeToDocument(root: ThemeRoot, resolvedTheme: ResolvedTheme) {
  root.dataset.theme = resolvedTheme;
}

export function recomputeAndApplyTheme({ getThemePreference, getPrefersDark, applyResolvedTheme }: ThemeRuntimeDependencies) {
  const resolvedTheme = resolveEffectiveTheme(getThemePreference(), getPrefersDark());
  applyResolvedTheme(resolvedTheme);
}

export function writeThemePreferenceSafely(
  nextTheme: ThemePreference,
  writeItem: (storageKey: string, value: ThemePreference) => void,
  storageKey: string = THEME_STORAGE_KEY,
) {
  try {
    writeItem(storageKey, nextTheme);
  } catch {
    // No-op fallback (private mode / storage denied).
  }
}

export function createStorageThemeHandler(
  deps: ThemeRuntimeDependencies,
  storageKey: string = THEME_STORAGE_KEY,
) {
  return (event: Pick<StorageEvent, "key">) => {
    if (!shouldHandleThemeStorageKey(event.key, storageKey)) {
      return;
    }

    recomputeAndApplyTheme(deps);
  };
}

export function createSystemThemeHandler(deps: ThemeRuntimeDependencies) {
  return () => {
    if (deps.getThemePreference() !== "system") {
      return;
    }

    recomputeAndApplyTheme(deps);
  };
}

type ThemePreferenceState = {
  get: (readItem: (storageKey: string) => string | null, storageKey?: string) => ThemePreference;
  set: (nextTheme: ThemePreference) => void;
};

export function createThemePreferenceState(initialTheme: ThemePreference = "system"): ThemePreferenceState {
  let currentThemePreference = initialTheme;

  return {
    get(readItem, storageKey = THEME_STORAGE_KEY) {
      try {
        currentThemePreference = sanitizeThemePreference(readItem(storageKey));
      } catch {
        // Keep the latest in-memory preference when storage is unavailable.
      }

      return currentThemePreference;
    },
    set(nextTheme) {
      currentThemePreference = nextTheme;
    },
  };
}

const themePreferenceState = createThemePreferenceState();

function getStoredTheme(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  return themePreferenceState.get((storageKey) => window.localStorage.getItem(storageKey));
}

function subscribeToThemePreference(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorageChange = createStorageThemeHandler({
    getThemePreference: getStoredTheme,
    getPrefersDark: () => getSystemTheme() === "dark",
    applyResolvedTheme: () => callback(),
  });
  const handleThemeEvent = () => callback();
  window.addEventListener("storage", handleStorageChange);
  window.addEventListener(THEME_EVENT, handleThemeEvent);

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(THEME_EVENT, handleThemeEvent);
  };
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia(SYSTEM_THEME_QUERY).matches ? "dark" : "light";
}

function subscribeToSystemTheme(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY);
  const handleChange = createSystemThemeHandler({
    getThemePreference: getStoredTheme,
    getPrefersDark: () => mediaQuery.matches,
    applyResolvedTheme: () => callback(),
  });
  mediaQuery.addEventListener("change", handleChange);

  return () => {
    mediaQuery.removeEventListener("change", handleChange);
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore<ThemePreference>(
    subscribeToThemePreference,
    getStoredTheme,
    () => "system",
  );
  const systemTheme = useSyncExternalStore<ResolvedTheme>(
    subscribeToSystemTheme,
    getSystemTheme,
    () => "light",
  );
  const resolvedTheme = resolveEffectiveTheme(theme, systemTheme === "dark");

  useEffect(() => {
    applyResolvedThemeToDocument(document.documentElement, resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((nextTheme: ThemePreference) => {
    themePreferenceState.set(nextTheme);
    writeThemePreferenceSafely(nextTheme, (storageKey, value) => {
      window.localStorage.setItem(storageKey, value);
    });
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
