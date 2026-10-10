"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";

export type ToastData = {
  id: number;
  message: string;
  tone?: "default" | "error";
  action?: { label: string; onClick: () => void };
};

/** A single toast at the bottom of the screen. Announced to screen readers; auto-dismisses. */
export function Toast({ toast, onDismiss, duration = 8000 }: {
  toast: ToastData | null;
  onDismiss: () => void;
  duration?: number;
}) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [toast, onDismiss, duration]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4"
    >
      {toast && (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto flex max-w-md items-center gap-4 rounded-lg border px-4 py-3 text-sm shadow-lg",
            toast.tone === "error"
              ? "border-danger/40 bg-danger-soft text-danger"
              : "border-transparent bg-ink text-paper",
          )}
        >
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                onDismiss();
              }}
              className="shrink-0 rounded font-semibold uppercase tracking-wide underline underline-offset-2 hover:no-underline"
            >
              {toast.action.label}
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="-mr-1 shrink-0 rounded px-1 opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
