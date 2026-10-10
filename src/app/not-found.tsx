import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { Wordmark } from "@/components/Wordmark";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 px-4 py-20 text-center">
      <Wordmark />
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-brass">404</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold">This page isn&apos;t on your coverage list.</h1>
        <p className="mt-2 text-muted">The link may be old or mistyped.</p>
      </div>
      <Link href="/" className={buttonClasses("primary")}>
        Go home
      </Link>
    </div>
  );
}
