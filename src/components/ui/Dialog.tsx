"use client";

import { useEffect, useRef } from "react";
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
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Clicking the backdrop (the dialog element itself, outside its content) closes it.
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="dialog-title"
      className={cn(
        "m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-rule bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/40",
        className,
      )}
    >
      {open && (
        <div className="p-5 sm:p-6">
          <h2 id="dialog-title" className="font-serif text-xl font-semibold">
            {title}
          </h2>
          {description && <div className="mt-1 text-sm text-muted">{description}</div>}
          <div className="mt-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}
