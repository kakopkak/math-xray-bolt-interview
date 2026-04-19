import assert from "node:assert/strict";
import test from "node:test";

import {
  THEME_STORAGE_KEY,
  getStoredThemePreference,
  resolveEffectiveTheme,
  sanitizeThemePreference,
  shouldHandleThemeStorageKey,
} from "./theme-shared";
import {
  applyResolvedThemeToDocument,
  createThemePreferenceState,
  createStorageThemeHandler,
  createSystemThemeHandler,
  type ThemeRuntimeDependencies,
  writeThemePreferenceSafely,
} from "./theme-provider";

test("resolveEffectiveTheme resolves system preference from prefersDark", () => {
  assert.equal(resolveEffectiveTheme("system", true), "dark");
  assert.equal(resolveEffectiveTheme("system", false), "light");
  assert.equal(resolveEffectiveTheme("dark", false), "dark");
  assert.equal(resolveEffectiveTheme("light", true), "light");
});

test("sanitizeThemePreference falls back to system for invalid values", () => {
  assert.equal(sanitizeThemePreference(null), "system");
  assert.equal(sanitizeThemePreference(""), "system");
  assert.equal(sanitizeThemePreference("unknown"), "system");
  assert.equal(sanitizeThemePreference("dark"), "dark");
});

test("shouldHandleThemeStorageKey ignores unrelated storage keys", () => {
  assert.equal(shouldHandleThemeStorageKey(THEME_STORAGE_KEY), true);
  assert.equal(shouldHandleThemeStorageKey("other-key"), false);
  assert.equal(shouldHandleThemeStorageKey(null), false);
});

test("getStoredThemePreference swallows storage failures", () => {
  assert.doesNotThrow(() => {
    getStoredThemePreference(() => {
      throw new Error("storage blocked");
    });
  });
  assert.equal(
    getStoredThemePreference(() => {
      throw new Error("storage blocked");
    }),
    "system",
  );
});

test("applyResolvedThemeToDocument updates root dataset theme", () => {
  const root = { dataset: {} as { theme?: string } };

  applyResolvedThemeToDocument(root, "dark");

  assert.equal(root.dataset.theme, "dark");
});

test("writeThemePreferenceSafely swallows storage throws", () => {
  let called = 0;

  assert.doesNotThrow(() => {
    writeThemePreferenceSafely("dark", (storageKey, value) => {
      called += 1;
      assert.equal(storageKey, THEME_STORAGE_KEY);
      assert.equal(value, "dark");
      throw new Error("blocked");
    });
  });

  assert.equal(called, 1);
});

test("storage handler ignores unrelated keys and applies theme for storage key", () => {
  const applied: string[] = [];
  const deps: ThemeRuntimeDependencies = {
    getThemePreference: () => "system",
    getPrefersDark: () => true,
    applyResolvedTheme: (theme) => applied.push(theme),
  };
  const handleStorage = createStorageThemeHandler(deps);

  handleStorage({ key: "other-key" });
  assert.deepEqual(applied, []);

  handleStorage({ key: THEME_STORAGE_KEY });
  assert.deepEqual(applied, ["dark"]);
});

test("system theme handler recomputes when preference is system", () => {
  const applied: string[] = [];
  let prefersDark = true;
  const systemDeps: ThemeRuntimeDependencies = {
    getThemePreference: () => "system",
    getPrefersDark: () => prefersDark,
    applyResolvedTheme: (theme) => applied.push(theme),
  };
  const handleSystem = createSystemThemeHandler(systemDeps);

  handleSystem();
  prefersDark = false;
  handleSystem();

  assert.deepEqual(applied, ["dark", "light"]);

  const fixedDeps: ThemeRuntimeDependencies = {
    getThemePreference: () => "dark",
    getPrefersDark: () => false,
    applyResolvedTheme: (theme) => applied.push(theme),
  };

  createSystemThemeHandler(fixedDeps)();
  assert.deepEqual(applied, ["dark", "light"]);
});

test("theme preference state preserves explicit selection when storage access fails", () => {
  const state = createThemePreferenceState();

  state.set("dark");
  const current = state.get(() => {
    throw new Error("storage blocked");
  });

  assert.equal(current, "dark");
});
