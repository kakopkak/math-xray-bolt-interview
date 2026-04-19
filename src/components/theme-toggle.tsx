"use client";

import { type ChangeEvent } from "react";

import { type ThemePreference, useTheme } from "@/components/theme-provider";

const themeOptions: Array<{ label: string; value: ThemePreference }> = [
  { label: "Süsteem", value: "system" },
  { label: "Hele", value: "light" },
  { label: "Tume", value: "dark" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setTheme(event.target.value as ThemePreference);
  };

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="sr-only">Värviteema</span>
      <select
        aria-label="Värviteema"
        className="rounded-lg border px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
          color: "var(--color-text)",
          outlineColor: "var(--color-brand)",
        }}
        onChange={handleChange}
        value={theme}
      >
        {themeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
