import Link from "next/link";
import { cn } from "@/lib/cn";

/** The Coverage mark: an open bracket "C" around a single point — the person you cover. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("h-7 w-7 shrink-0", className)}>
      <rect width="32" height="32" rx="6" className="fill-[#11294a] dark:fill-[#d9b45a]" />
      <path
        d="M22.5 9.6A9 9 0 1 0 22.5 22.4"
        fill="none"
        strokeWidth="3.2"
        strokeLinecap="square"
        className="stroke-[#f6f4ee] dark:stroke-[#0a121c]"
      />
      <circle cx="16" cy="16" r="2.6" className="fill-[#d9b45a] dark:fill-[#11294a]" />
    </svg>
  );
}

export function Wordmark({
  href = "/",
  className,
  compact = false,
}: {
  href?: string;
  className?: string;
  /** Hide the word on very narrow screens, keeping just the mark. */
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 rounded-sm text-ink", className)}
      aria-label="Coverage home"
    >
      <LogoMark />
      <span className={cn("font-serif text-[1.35rem] font-semibold tracking-tight", compact && "hidden min-[440px]:inline")}>
        Coverage
      </span>
    </Link>
  );
}
