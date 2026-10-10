import Link from "next/link";
import { LogoMark } from "@/components/Wordmark";

export function SiteFooter() {
  return (
    <footer className="border-t border-rule">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-center gap-2">
          <LogoMark className="h-5 w-5" />
          <span>Coverage · a student portfolio project</span>
        </p>
        <nav aria-label="Footer" className="flex gap-5">
          <Link href="/privacy" className="hover:text-ink hover:underline">
            Privacy
          </Link>
          <a href="https://github.com/tfinn18/coverage" className="hover:text-ink hover:underline">
            Source on GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
