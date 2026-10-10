"use client";

import { cn } from "@/lib/cn";

/**
 * Switches between light and dark mode and remembers the choice. Until the user picks, the inline
 * script in the root layout follows the system setting. The icon is chosen by CSS (dark: variant),
 * so the server-rendered HTML is correct before hydration.
 */
export function toggleTheme() {
  const root = document.documentElement;
  const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
  root.setAttribute("data-theme", next);
  try {
    localStorage.setItem("theme", next);
  } catch {
    // Private mode or blocked storage: the choice just won't persist.
  }
}

export function ThemeToggle({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className={cn("flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink", className)}
    >
      {/* Moon in light mode, sun in dark mode */}
      <svg viewBox="0 0 20 20" aria-hidden="true" className="h-[18px] w-[18px] dark:hidden">
        <path fill="currentColor" d="M17.3 12.9A7.5 7.5 0 0 1 7.1 2.7a.75.75 0 0 0-1-.9 9 9 0 1 0 12.1 12.1.75.75 0 0 0-.9-1Z" />
      </svg>
      <svg viewBox="0 0 20 20" aria-hidden="true" className="hidden h-[18px] w-[18px] dark:block">
        <circle cx="10" cy="10" r="3.6" fill="currentColor" />
        <path
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          d="M10 1.8v1.6M10 16.6v1.6M1.8 10h1.6M16.6 10h1.6M4.2 4.2l1.1 1.1M14.7 14.7l1.1 1.1M4.2 15.8l1.1-1.1M14.7 5.3l1.1-1.1"
        />
      </svg>
    </button>
  );
}
