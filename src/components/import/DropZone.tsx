"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

/** A file picker that also accepts drag-and-drop. The whole area is a labelled, keyboard-focusable button. */
export function DropZone({
  accept,
  multiple = false,
  onFiles,
  title,
  hint,
  disabled = false,
}: {
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  title: string;
  hint: React.ReactNode;
  disabled?: boolean;
}) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (disabled) return;
        const files = Array.from(e.dataTransfer.files);
        if (files.length) onFiles(multiple ? files : files.slice(0, 1));
      }}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
        dragging ? "border-brass bg-brass-soft" : "border-rule-strong bg-surface-2/50",
        disabled && "opacity-60",
      )}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="mb-3 h-8 w-8 text-muted">
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
        />
      </svg>
      <label
        htmlFor={inputId}
        className="cursor-pointer rounded font-semibold text-ink underline underline-offset-2 focus-within:outline-2 focus-within:outline-focus"
      >
        {title}
        <input
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length) onFiles(files);
          }}
        />
      </label>
      <p className="mt-1 text-sm text-muted">or drag {multiple ? "files" : "a file"} here</p>
      <div className="mt-3 max-w-md text-xs text-muted">{hint}</div>
    </div>
  );
}
