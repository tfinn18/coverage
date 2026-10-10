"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const ITEM_CLASSES =
  "block w-full px-4 py-2 text-left text-sm text-ink hover:bg-surface-2 focus:bg-surface-2 focus:outline-none";

/**
 * Accessible dropdown menu: opens on click or ArrowDown, arrow keys move between items,
 * Escape closes and returns focus to the button, clicking outside closes.
 */
export function Menu({
  buttonLabel,
  buttonContent,
  buttonClassName,
  menuLabel,
  header,
  align = "right",
  children,
}: {
  buttonLabel: string;
  buttonContent: React.ReactNode;
  buttonClassName?: string;
  menuLabel: string;
  header?: React.ReactNode;
  align?: "left" | "right";
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<React.CSSProperties>({});
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);

  // Fixed positioning keeps the menu visible inside scrolling containers (like the contacts table).
  // It opens upward when there isn't room below.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current || !menuRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current.offsetHeight;
    const below = window.innerHeight - rect.bottom;
    const top = below < menuHeight + 12 && rect.top > menuHeight + 12 ? rect.top - menuHeight - 6 : rect.bottom + 6;
    setPosition(
      align === "right"
        ? { position: "fixed", top, right: Math.max(8, window.innerWidth - rect.right) }
        : { position: "fixed", top, left: Math.max(8, rect.left) },
    );
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const closeOnScroll = (e: Event) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const closeOnResize = () => setOpen(false);
    window.addEventListener("scroll", closeOnScroll, true);
    window.addEventListener("resize", closeOnResize);
    return () => {
      window.removeEventListener("scroll", closeOnScroll, true);
      window.removeEventListener("resize", closeOnResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function onMenuKeyDown(e: React.KeyboardEvent) {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(index + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div>
      <button
        ref={buttonRef}
        type="button"
        aria-label={buttonLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={buttonClassName}
      >
        {buttonContent}
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={menuLabel}
          onKeyDown={onMenuKeyDown}
          style={position}
          className={cn(
            "z-40 min-w-48 overflow-hidden rounded-lg border border-rule bg-surface py-1 text-left shadow-lg",
            !position.position && "invisible fixed",
          )}
        >
          {header}
          {children(close)}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  onSelect,
  danger = false,
  children,
}: {
  onSelect: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button type="button" role="menuitem" onClick={onSelect} className={cn(ITEM_CLASSES, danger && "text-danger")}>
      {children}
    </button>
  );
}

export function MenuLink({ href, onSelect, children }: { href: string; onSelect: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} role="menuitem" onClick={onSelect} className={ITEM_CLASSES}>
      {children}
    </Link>
  );
}

/** A menu item that submits a POST form (e.g. log out). */
export function MenuFormItem({ action, children }: { action: string; children: React.ReactNode }) {
  return (
    <form action={action} method="post">
      <button type="submit" role="menuitem" className={ITEM_CLASSES}>
        {children}
      </button>
    </form>
  );
}
