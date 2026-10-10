"use client";

import { useRef, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/cn";
import { insertContacts } from "@/lib/data/contacts";
import { insertNotesDocs } from "@/lib/data/notes";
import type { Contact } from "@/lib/database.types";
import type { ImportCandidate } from "@/lib/import/candidate";
import { notesDocFromText, notesToText } from "@/lib/notes/doc";
import { ReviewStep } from "./ReviewStep";
import { CsvSource, PdfSource, UrlSource, type SourceResult } from "./sources";

const TABS = [
  { id: "pdf", label: "Profile PDF" },
  { id: "csv", label: "CSV file" },
  { id: "url", label: "Profile URL" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const CHUNK = 500;

export function ImportDialog({
  existing,
  onClose,
  onImported,
}: {
  existing: { name: string; company: string }[];
  onClose: () => void;
  onImported: (contacts: Contact[], skippedDuplicates: number) => void;
}) {
  const [tab, setTab] = useState<TabId>("pdf");
  const [review, setReview] = useState<SourceResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({ pdf: null, csv: null, url: null });

  function onTabKeyDown(e: React.KeyboardEvent) {
    const focused = (e.target as HTMLElement).id.replace("import-tab-", "");
    const index = TABS.findIndex((t) => t.id === focused);
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = TABS[(index + delta + TABS.length) % TABS.length].id;
    setTab(next);
    tabRefs.current[next]?.focus();
  }

  async function runImport(selected: ImportCandidate[], skipped: number) {
    setImporting(true);
    setError(null);
    const saved: Contact[] = [];
    try {
      for (let i = 0; i < selected.length; i += CHUNK) {
        // Ids are assigned here so imported notes can be attached to the right contact.
        const batch = selected.slice(i, i + CHUNK).map((c) => {
          const doc = c.notes.trim() ? notesDocFromText(c.notes.slice(0, 5000)) : null;
          return { id: crypto.randomUUID(), c, doc };
        });
        saved.push(
          ...(await insertContacts(
            batch.map(({ id, c, doc }) => ({
              id,
              name: c.name,
              company: c.company,
              title: c.title,
              stage: c.stage,
              follow_up_date: c.follow_up_date,
              notes: doc ? notesToText(doc, c.company) : "",
              linkedin_url: c.linkedin_url,
              email: c.email,
            })),
          )),
        );
        await insertNotesDocs(batch.filter((b) => b.doc).map((b) => ({ contact_id: b.id, doc: b.doc! })));
      }
      onImported(saved, skipped);
    } catch {
      setImporting(false);
      if (saved.length > 0) {
        onImported(saved, skipped);
        return;
      }
      setError("We couldn't save these contacts. Check your connection and try again.");
    }
  }

  return (
    <Dialog
      open
      onClose={() => !importing && onClose()}
      title={review ? "Review before importing" : "Import contacts"}
      description={review ? undefined : "Bring people in from LinkedIn or your existing spreadsheet. You'll review everything before it's saved."}
      size="xl"
    >
      {review ? (
        <ReviewStep
          initial={review.candidates}
          kind={review.kind}
          note={review.note}
          existing={existing}
          importing={importing}
          error={error}
          onBack={() => {
            setReview(null);
            setError(null);
          }}
          onImport={runImport}
        />
      ) : (
        <div>
          <div role="tablist" aria-label="Import source" className="mb-5 flex gap-1 border-b border-rule" onKeyDown={onTabKeyDown}>
            {TABS.map((t) => (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[t.id] = el;
                }}
                id={`import-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                aria-controls={`import-panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => setTab(t.id)}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
                  tab === t.id ? "border-brass text-ink" : "border-transparent text-muted hover:text-ink",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div role="tabpanel" id={`import-panel-${tab}`} aria-labelledby={`import-tab-${tab}`}>
            {tab === "pdf" && <PdfSource onDone={setReview} />}
            {tab === "csv" && <CsvSource onDone={setReview} />}
            {tab === "url" && <UrlSource onDone={setReview} />}
          </div>
          <p className="mt-5 text-xs text-muted">
            Coverage never scrapes LinkedIn. It only reads files and links you choose to give it.
          </p>
        </div>
      )}
    </Dialog>
  );
}
