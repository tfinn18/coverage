import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { buttonClasses } from "@/components/ui/Button";
import { Wordmark } from "@/components/Wordmark";
import { cn } from "@/lib/cn";
import { STAGE_CLASSES, STAGES } from "@/lib/contacts/stages";

const FEATURES = [
  {
    n: "01",
    title: "A spreadsheet that keeps itself organized",
    body: "Company, name, title, stage, follow-up, notes. Edit any cell like Excel; it saves as you type. Sort, search, and filter to the follow-ups that are due today.",
  },
  {
    n: "02",
    title: "Bring your network in from LinkedIn",
    body: "Drop in profiles saved with LinkedIn's Save to PDF, upload your Connections.csv, or paste a profile link. Review everything first; duplicates are skipped.",
  },
  {
    n: "03",
    title: "Book calls on a weekly calendar",
    body: "Drag anyone marked Call scheduled onto a time slot. Move calls by dragging, mark them as called, and add them to Google Calendar in one click.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-5 sm:px-6">
        <Wordmark />
        <nav aria-label="Account" className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Link href="/login" className={buttonClasses("ghost")}>
            Log in
          </Link>
          <Link href="/signup" className={buttonClasses("primary")}>
            Sign up
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-4 pb-12 pt-10 sm:px-6 sm:pt-16">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-brass">For students recruiting for internships</p>
          <h1 className="mt-4 max-w-3xl font-serif text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl">
            Cover your network.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-2">
            In banking, your <em>coverage</em> is the people and companies you&apos;re responsible for staying close
            to. Coverage is that list for your recruiting season: every banker, alum, and recruiter you&apos;re talking
            to, where each conversation stands, and the calls on your calendar.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/signup" className={buttonClasses("primary", "lg")}>
              Create a free account
            </Link>
            <Link href="/login" className={buttonClasses("secondary", "lg")}>
              Log in
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted">Free · Only you can see your list · We never scrape LinkedIn</p>

          <div className="mt-10 flex flex-wrap items-center gap-2 text-sm" aria-label="Every contact moves through three stages">
            {STAGES.map((s, i) => (
              <span key={s.value} className="flex items-center gap-2">
                <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", STAGE_CLASSES[s.value])}>{s.label}</span>
                {i < STAGES.length - 1 && (
                  <span aria-hidden="true" className="text-muted">
                    →
                  </span>
                )}
              </span>
            ))}
          </div>
        </section>

        <section aria-label="Product screenshot" className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <figure className="overflow-hidden rounded-xl border border-rule-strong bg-surface shadow-[0_24px_60px_-30px_rgba(13,27,42,0.45)]">
            <div className="flex items-center gap-1.5 border-b border-rule bg-surface-2 px-4 py-2.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-rule-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-rule-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-rule-strong" />
            </div>
            <Image
              src="/screenshots/contacts-light.png"
              alt="The Coverage contacts grid with example contacts, stage chips, and flagged follow-ups"
              width={2400}
              height={1350}
              priority
              className="h-auto w-full dark:hidden"
            />
            <Image
              src="/screenshots/contacts-dark.png"
              alt="The Coverage contacts grid in dark mode"
              width={2400}
              height={1350}
              className="hidden h-auto w-full dark:block"
            />
            <figcaption className="sr-only">Screenshot of the Contacts page with example data.</figcaption>
          </figure>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="how-heading">
          <h2 id="how-heading" className="font-serif text-3xl font-semibold tracking-tight">
            How it works
          </h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.n} className="border-t-2 border-ink pt-4">
                <span className="font-mono text-xs text-brass">{f.n}</span>
                <h3 className="mt-2 text-lg font-semibold leading-snug">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{f.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 sm:px-6" aria-label="Call schedule screenshot">
          <div className="grid items-center gap-10 rounded-xl border border-rule bg-surface p-6 sm:p-10 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="font-serif text-3xl font-semibold tracking-tight">Your week of calls, at a glance.</h2>
              <p className="mt-4 leading-relaxed text-ink-2">
                Everyone you&apos;ve agreed to talk to waits in &ldquo;Ready to schedule&rdquo;. Drag them onto the
                calendar, or on your phone, tap them and then tap a time. After the call, mark it done and set your
                next follow-up.
              </p>
              <Link href="/signup" className={buttonClasses("primary", "md", "mt-6")}>
                Start your list
              </Link>
            </div>
            <div className="overflow-hidden rounded-lg border border-rule-strong">
              <Image
                src="/screenshots/calls-light.png"
                alt="The weekly call calendar with booked calls and a Ready to schedule panel"
                width={2400}
                height={1500}
                className="h-auto w-full dark:hidden"
              />
              <Image
                src="/screenshots/calls-dark.png"
                alt="The weekly call calendar in dark mode"
                width={2400}
                height={1500}
                className="hidden h-auto w-full dark:block"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6" aria-labelledby="privacy-heading">
          <div className="max-w-2xl">
            <h2 id="privacy-heading" className="font-serif text-3xl font-semibold tracking-tight">
              Your list is yours.
            </h2>
            <p className="mt-4 leading-relaxed text-ink-2">
              Every row is locked to your account by the database itself, so no other user can read or change it. LinkedIn
              PDFs are read inside your browser and never uploaded, and Coverage never scrapes LinkedIn. Export to CSV or
              delete your account any time.{" "}
              <Link href="/privacy" className="font-medium text-ink underline underline-offset-2">
                Read the privacy page
              </Link>
              .
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
