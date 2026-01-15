"use client";

import * as React from "react";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ThemeMode = "system" | "light" | "dark";

const STORAGE_KEY = "theme";
const MEDIA_QUERY = "(prefers-color-scheme: dark)";

function normalizeTheme(value: string | null): ThemeMode {
  if (value === "light" || value === "dark" || value === "system") return value;
  return "system";
}

function resolveSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia(MEDIA_QUERY).matches ? "dark" : "light";
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === "undefined") return;
  const resolved = mode === "system" ? resolveSystemTheme() : mode;
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export function ThemeToggle({ className }: { className?: string }) {
  const [mode, setMode] = React.useState<ThemeMode>("system");

  React.useEffect(() => {
    const stored = normalizeTheme(window.localStorage.getItem(STORAGE_KEY));
    setMode(stored);
    applyTheme(stored);
  }, []);

  React.useEffect(() => {
    const media = window.matchMedia(MEDIA_QUERY);
    const handleChange = () => {
      if (mode === "system") applyTheme("system");
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [mode]);

  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, mode);
    applyTheme(mode);
    window.dispatchEvent(new CustomEvent("theme-change", { detail: mode }));
  }, [mode]);

  React.useEffect(() => {
    const handleCustom = (event: Event) => {
      const next = normalizeTheme((event as CustomEvent<string>).detail ?? null);
      if (next !== mode) setMode(next);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next = normalizeTheme(event.newValue);
      if (next !== mode) setMode(next);
    };

    window.addEventListener("theme-change", handleCustom);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("theme-change", handleCustom);
      window.removeEventListener("storage", handleStorage);
    };
  }, [mode]);

  return (
    <Select
      aria-label="Тема интерфейса"
      className={cn("h-9 w-[150px] text-xs", className)}
      value={mode}
      onChange={(event) => setMode(normalizeTheme(event.target.value))}
    >
      <option value="system">Системная</option>
      <option value="light">Светлая</option>
      <option value="dark">Темная</option>
    </Select>
  );
}
