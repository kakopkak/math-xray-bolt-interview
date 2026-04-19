import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const uiDir = path.join(process.cwd(), "src/components/ui");

const buttonPath = path.join(uiDir, "button.tsx");
const cardPath = path.join(uiDir, "card.tsx");
const inputPath = path.join(uiDir, "input.tsx");
const breadcrumbsPath = path.join(uiDir, "breadcrumbs.tsx");
const responsiveTablePath = path.join(uiDir, "responsive-table.tsx");
const badgePath = path.join(uiDir, "badge.tsx");
const feedbackBannerPath = path.join(uiDir, "feedback-banner.tsx");
const segmentedControlPath = path.join(uiDir, "segmented-control.tsx");

const sharedPrimitiveFiles = [
  {
    fileName: "section-header.tsx",
    exportPattern: /export function SectionHeader/,
  },
  {
    fileName: "stat-card.tsx",
    exportPattern: /export function StatCard/,
  },
  {
    fileName: "empty-state.tsx",
    exportPattern: /export function EmptyState/,
  },
  {
    fileName: "feedback-banner.tsx",
    exportPattern: /export function FeedbackBanner/,
  },
  {
    fileName: "responsive-table.tsx",
    exportPattern: /export function ResponsiveTable/,
  },
  {
    fileName: "segmented-control.tsx",
    exportPattern: /export function SegmentedControl/,
  },
];

test("button supports focus, disabled, and standardized variants", async () => {
  const source = await readFile(buttonPath, "utf8");

  assert.match(source, /focus-visible:ring-2/);
  assert.match(source, /disabled:opacity-/);
  assert.match(source, /disabled:cursor-not-allowed/);
  assert.match(source, /primary/);
  assert.match(source, /secondary/);
  assert.match(source, /ghost/);
  assert.match(source, /destructive/);
});

test("card and input use semantic token-backed classes", async () => {
  const cardSource = await readFile(cardPath, "utf8");
  const inputSource = await readFile(inputPath, "utf8");

  assert.match(cardSource, /bg-\[var\(--color-surface\)\]/);
  assert.match(cardSource, /border-\[var\(--color-border\)\]/);
  assert.match(cardSource, /text-\[var\(--color-text\)\]/);

  assert.match(inputSource, /border-\[var\(--color-border\)\]/);
  assert.match(inputSource, /bg-\[var\(--color-surface\)\]/);
  assert.match(inputSource, /text-\[var\(--color-text\)\]/);
  assert.match(inputSource, /placeholder:text-\[var\(--color-text-muted\)\]/);
});

test("shared composition primitives exist and export components", async () => {
  for (const { fileName, exportPattern } of sharedPrimitiveFiles) {
    const source = await readFile(path.join(uiDir, fileName), "utf8");
    assert.match(source, exportPattern);
  }
});

test("breadcrumbs only marks the final item as aria-current page", async () => {
  const source = await readFile(breadcrumbsPath, "utf8");

  assert.match(source, /const isCurrent = index === items\.length - 1;/);
  assert.match(source, /aria-current=\{isCurrent \? "page" : undefined\}/);
});

test("responsive table exposes localizable empty-state copy defaults", async () => {
  const source = await readFile(responsiveTablePath, "utf8");

  assert.match(source, /emptyStateTitle\?: ReactNode;/);
  assert.match(source, /emptyStateDescription\?: ReactNode;/);
  assert.match(source, /emptyStateTitle = "Andmed puuduvad"/);
  assert.match(source, /emptyStateDescription = "Selles vaates pole veel ridu\."/);
});

test("badge and feedback banner tones are token-based without hardcoded palettes", async () => {
  const badgeSource = await readFile(badgePath, "utf8");
  const feedbackBannerSource = await readFile(feedbackBannerPath, "utf8");

  assert.match(badgeSource, /var\(--color-(success|warning|error|brand|surface|text|border)\)/);
  assert.match(feedbackBannerSource, /var\(--color-(success|warning|error|brand|surface|text|border)\)/);
  assert.doesNotMatch(badgeSource, /(emerald|amber|orange|rose|teal)-\d{2,3}/);
  assert.doesNotMatch(feedbackBannerSource, /(emerald|amber|orange|rose|teal)-\d{2,3}/);
});

test("segmented control uses semantic tokens without legacy palette classes", async () => {
  const source = await readFile(segmentedControlPath, "utf8");

  assert.match(source, /var\(--color-(brand|surface|text|border)\)/);
  assert.doesNotMatch(source, /(zinc|rose|indigo)-\d{2,3}/);
});
