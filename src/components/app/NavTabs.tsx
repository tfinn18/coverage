"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/contacts", label: "Contacts" },
  { href: "/calls", label: "Call Schedule" },
] as const;

export function NavTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex h-full items-stretch">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center whitespace-nowrap px-2.5 text-sm font-medium transition-colors sm:px-3",
              active ? "text-ink" : "text-muted hover:text-ink",
            )}
          >
            {tab.label}
            <span
              aria-hidden="true"
              className={cn("absolute inset-x-2 bottom-0 h-0.5 rounded-full", active ? "bg-brass" : "bg-transparent")}
            />
          </Link>
        );
      })}
    </nav>
  );
}
