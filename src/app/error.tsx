"use client";

import Link from "next/link";
import { Button, buttonClasses } from "@/components/ui/Button";

/** Shown if something unexpected breaks while rendering a page. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 px-4 py-20 text-center">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-danger">Something went wrong</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold">We hit an unexpected error.</h1>
        <p className="mt-2 text-muted">Your data is safe. Try again, or head back home.</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Link href="/" className={buttonClasses("secondary")}>
          Go home
        </Link>
      </div>
    </div>
  );
}
