import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const globalsPath = path.join(process.cwd(), "src/app/globals.css");
const layoutPath = path.join(process.cwd(), "src/app/layout.tsx");
const appShellPath = path.join(process.cwd(), "src/components/app-shell.tsx");

test("globals define semantic tokens for light and dark themes", async () => {
  const source = await readFile(globalsPath, "utf8");

  assert.match(source, /:root\s*\{/);
  assert.match(source, /:root\[data-theme="dark"\]\s*\{/);
  assert.match(source, /--color-bg:/);
  assert.match(source, /--color-surface:/);
  assert.match(source, /--color-brand:/);
});

test("layout includes theme provider and pre-hydration theme init script", async () => {
  const source = await readFile(layoutPath, "utf8");

  assert.match(source, /ThemeProvider/);
  assert.match(source, /id="theme-init"/);
  assert.match(source, /const STORAGE_KEY = ["']math-xray-theme["']/);
  assert.match(source, /localStorage\.getItem\(STORAGE_KEY\)/);
  assert.match(source, /document\.documentElement\.dataset\.theme/);
});

test("app shell uses semantic theme token classes", async () => {
  const source = await readFile(appShellPath, "utf8");

  assert.match(source, /bg-\[var\(--color-surface\)\]/);
  assert.match(source, /text-\[var\(--color-text\)\]/);
  assert.match(source, /text-\[var\(--color-text-muted\)\]/);
  assert.match(source, /border-\[var\(--color-border\)\]/);
  assert.doesNotMatch(source, /bg-white|text-zinc|border-zinc|indigo-\d{3}/);
});
