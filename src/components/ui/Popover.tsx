"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * A small floating panel anchored to an element (e.g. a calendar event). Focus moves into it on open
 * and back to the anchor on close; Escape or clicking outside closes it.
 */
export function Popover({
  anchor,
  onClose,
  labelledBy,
  children,
}: {
  anchor: HTMLElement;
  onClose: () => void;
  labelledBy: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ position: "fixed", visibility: "hidden" });

  useLayoutEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    const a = anchor.getBoundingClientRect();
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    const gap = 8;
    // Prefer the right side of the anchor, then the left, then below.
    let left = a.right + gap;
    let top = a.top;
    if (left + w > window.innerWidth - gap) left = a.left - w - gap;
    if (left < gap) {
      left = Math.min(Math.max(gap, a.left), window.innerWidth - w - gap);
      top = a.bottom + gap;
    }
    top = Math.min(Math.max(gap, top), window.innerHeight - h - gap);
    setStyle({ position: "fixed", top, left });
  }, [anchor]);

  useEffect(() => {
    const panel = ref.current;
    panel?.querySelector<HTMLElement>("button, a[href], input, select")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!panel?.contains(e.target as Node) && !anchor.contains(e.target as Node)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      if (anchor.isConnected) anchor.focus({ preventScroll: true });
    };
  }, [anchor, onClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-labelledby={labelledBy}
      style={style}
      className="z-50 w-[min(320px,calc(100vw-16px))] rounded-lg border border-rule bg-surface p-4 text-ink shadow-xl"
    >
      {children}
    </div>
  );
}
