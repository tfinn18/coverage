"use client";

import { forwardRef, useCallback, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/cn";

const BASE =
  "block w-full resize-none rounded-md border text-sm leading-6 text-ink placeholder:text-muted/60 " +
  "focus:border-focus focus:bg-surface focus:outline-2 focus:outline-offset-0 focus:outline-focus";
/** Reads like document text until you hover or focus it. */
const PLAIN = "border-transparent bg-transparent px-2 py-1 hover:border-rule";
/** A visible box, for longer writing like an email body. */
const BOXED = "border-rule-strong bg-surface px-3 py-2";

/** A textarea that grows with its content, so notes read like a document instead of a scrolling box. */
export const AutoTextarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number; boxed?: boolean }
>(function AutoTextarea({ className, minRows = 1, boxed = false, value, ...props }, forwarded) {
  const inner = useRef<HTMLTextAreaElement | null>(null);

  const setRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      inner.current = el;
      if (typeof forwarded === "function") forwarded(el);
      else if (forwarded) forwarded.current = el;
    },
    [forwarded],
  );

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);

  return <textarea ref={setRef} rows={minRows} value={value} className={cn(BASE, boxed ? BOXED : PLAIN, className)} {...props} />;
});
