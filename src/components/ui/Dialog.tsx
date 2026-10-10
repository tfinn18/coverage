"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Modal dialog built on the native <dialog> element, which handles focus trapping,
 * Escape to close, and hiding the rest of the page from screen readers.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  size?: "md" | "xl";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        // Escape asks the owner to close, so it can refuse (e.g. while saving).
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Clicking the backdrop (the dialog element itself, outside its content) closes it.
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby={titleId}
      className={cn(
        "m-auto w-[calc(100%-2rem)] rounded-lg border border-rule bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/40",
        size === "md" ? "max-w-md" : "max-w-5xl",
      )}
    >
      {open && (
        <div className="p-5 sm:p-6">
          <h2 id={titleId} className="font-serif text-xl font-semibold">
            {title}
          </h2>
          {description && <div className="mt-1 text-sm text-muted">{description}</div>}
          <div className="mt-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}
