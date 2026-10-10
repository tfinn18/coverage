import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Wordmark } from "@/components/Wordmark";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <Wordmark />
        <ThemeToggle />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-6 sm:px-6">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">Privacy</h1>
        <div className="mt-6 flex flex-col gap-4 leading-relaxed text-ink-2">
          <p>
            <strong className="text-ink">Only you can see your data.</strong> Your contacts and calls are stored in a
            database that enforces row-level security: every request is checked against your account, so no other user
            can read or change your rows.
          </p>
          <p>
            <strong className="text-ink">We never scrape LinkedIn.</strong> Coverage only imports what you choose to give
            it: a profile PDF you saved yourself, the Connections.csv from LinkedIn&apos;s own data export, or a URL you
            paste. PDFs are read inside your browser and are never uploaded.
          </p>
          <p>
            <strong className="text-ink">You&apos;re in control.</strong> You can export your contacts to CSV at any time,
            and deleting your account permanently removes your account, contacts, and calls.
          </p>
          <p className="text-sm text-muted">
            Coverage is a student portfolio project. We don&apos;t sell data, run ads, or use third-party trackers.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
