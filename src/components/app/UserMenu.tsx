"use client";

import { toggleTheme } from "@/components/ThemeToggle";
import { Menu, MenuFormItem, MenuItem, MenuLink } from "@/components/ui/Menu";
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
  return (
    <Menu
      buttonLabel="Open account menu"
      menuLabel="Account"
      buttonClassName="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 text-sm text-ink-2 hover:bg-surface-2 sm:pr-3"
      buttonContent={
        <>
          <Avatar user={user} />
          <span className="hidden max-w-[220px] truncate md:inline">{user.email}</span>
        </>
      }
      header={
        <div className="-mt-1 mb-1 w-64 border-b border-rule px-4 py-3">
          {user.name && <p className="truncate text-sm font-semibold text-ink">{user.name}</p>}
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
      }
    >
      {(close) => (
        <>
          <MenuLink href="/account" onSelect={close}>
            Account settings
          </MenuLink>
          <MenuItem
            onSelect={() => {
              toggleTheme();
              close();
            }}
          >
            Toggle dark mode
          </MenuItem>
          <MenuFormItem action="/auth/signout">Log out</MenuFormItem>
        </>
      )}
    </Menu>
  );
}
