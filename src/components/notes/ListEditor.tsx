"use client";

import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { mergeWithPrevious, setItem, splitItem } from "@/lib/notes/doc";
import { AutoTextarea } from "./AutoTextarea";

/**
 * A bullet or numbered list that behaves like a document: Enter starts the next item, Backspace at
 * the start of an item joins it to the one above, and arrow keys move between items. Long items
 * wrap with a hanging indent (the bullet or number stays to the left of the text).
 */
export function ListEditor({
  items,
  onChange,
  ordered = false,
  placeholder,
  labelId,
  itemLabel,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  ordered?: boolean;
  placeholder: string;
  /** id of the visible label for the whole list. */
  labelId: string;
  /** Used to name each item for screen readers, e.g. "Question" → "Question 2". */
  itemLabel: string;
}) {
  const shown = items.length > 0 ? items : [""];
  const refs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const pendingFocus = useRef<{ index: number; caret: number } | null>(null);

  useLayoutEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    const el = refs.current[target.index];
    el?.focus();
    el?.setSelectionRange(target.caret, target.caret);
  });

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) {
    if (e.nativeEvent.isComposing) return;
    const el = e.currentTarget;
    const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
    const atEnd = el.selectionStart === el.value.length;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      pendingFocus.current = { index: index + 1, caret: 0 };
      onChange(splitItem(shown, index, el.selectionStart));
    } else if (e.key === "Backspace" && atStart && index > 0) {
      e.preventDefault();
      pendingFocus.current = { index: index - 1, caret: shown[index - 1].length };
      onChange(mergeWithPrevious(shown, index));
    } else if (e.key === "ArrowUp" && atStart && index > 0) {
      e.preventDefault();
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowDown" && atEnd && index < shown.length - 1) {
      e.preventDefault();
      const next = refs.current[index + 1];
      next?.focus();
      next?.setSelectionRange(0, 0);
    }
  }

  const ListTag = ordered ? "ol" : "ul";
  return (
    <ListTag
      aria-labelledby={labelId}
      className={cn(
        "flex flex-col gap-0.5 pl-7 marker:text-sm marker:text-muted",
        ordered ? "list-decimal marker:font-mono" : "list-disc",
      )}
    >
      {shown.map((item, index) => (
        <li key={index} className="pl-1">
          <AutoTextarea
            ref={(el) => {
              refs.current[index] = el;
            }}
            value={item}
            onChange={(e) => onChange(setItem(shown, index, e.target.value))}
            onKeyDown={(e) => onKeyDown(e, index)}
            placeholder={placeholder}
            aria-label={`${itemLabel} ${index + 1}`}
            className="-ml-2"
          />
        </li>
      ))}
    </ListTag>
  );
}
