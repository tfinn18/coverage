"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { CurrentUser } from "@/lib/auth/user";
import { cn } from "@/lib/cn";

function initials(user: CurrentUser) {
  const source = user.name?.trim() || user.email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function Avatar({ user, className }: { user: CurrentUser; className?: string }) {
  if (user.avatarUrl) {
    return (
      // Google avatars are on an external host; a plain img avoids extra image config.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        className={cn("h-8 w-8 rounded-full border border-rule object-cover", className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full bg-navy font-mono text-xs font-medium text-on-navy",
        className,
      )}
    >
      {initials(user)}
    </span>
  );
}

export function UserMenu({ user }: { user: CurrentUser }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
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
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 text-sm text-ink-2 hover:bg-surface-2 sm:pr-3"
      >
        <Avatar user={user} />
        <span className="hidden max-w-[220px] truncate md:inline">{user.email}</span>
        <span className="sr-only">Open account menu</span>
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-lg border border-rule bg-surface shadow-lg"
        >
          <div className="border-b border-rule px-4 py-3">
            {user.name && <p className="truncate text-sm font-semibold text-ink">{user.name}</p>}
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="py-1">
            <Link
              href="/account"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-ink hover:bg-surface-2 focus:bg-surface-2"
            >
              Account settings
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                role="menuitem"
                className="block w-full px-4 py-2 text-left text-sm text-ink hover:bg-surface-2 focus:bg-surface-2"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
