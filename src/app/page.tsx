import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { Wordmark } from "@/components/Wordmark";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Wordmark />
        <nav aria-label="Account" className="flex items-center gap-2">
          <Link href="/login" className={buttonClasses("ghost")}>
            Log in
          </Link>
          <Link href="/signup" className={buttonClasses("primary")}>
            Sign up
          </Link>
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-brass">For students recruiting for internships</p>
        <h1 className="mt-4 max-w-3xl font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          Cover your network.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-ink-2">
          In banking, your coverage is the people you&apos;re responsible for staying close to. Coverage is your private
          list of contacts and calls, in a spreadsheet that keeps itself organized.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className={buttonClasses("primary", "lg")}>
            Create a free account
          </Link>
          <Link href="/login" className={buttonClasses("secondary", "lg")}>
            Log in
          </Link>
        </div>
      </main>
    </div>
  );
}
