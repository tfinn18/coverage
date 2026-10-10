"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { candidate, type ImportCandidate } from "@/lib/import/candidate";
import { MAX_CSV_BYTES, MAX_IMPORT_ROWS, parseImportCsv } from "@/lib/import/csv-import";
import { parseLinkedInProfile } from "@/lib/linkedin/profile-pdf";
import { nameFromLinkedInUrl, normalizeLinkedInUrl } from "@/lib/linkedin/url";
import { loadPdfJs } from "@/lib/pdf/browser";
import { MAX_PDF_BYTES, extractPdfLines } from "@/lib/pdf/extract";
import { DropZone } from "./DropZone";

export type SourceResult = { candidates: ImportCandidate[]; kind: "linkedin" | "tracker"; note?: string };

export function PdfSource({ onDone }: { onDone: (result: SourceResult) => void }) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: File[]) {
    setError(null);
    const pdfs = files.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (pdfs.length === 0) {
      setError("Those files aren't PDFs. Save a profile with LinkedIn's More → Save to PDF, then drop it here.");
      return;
    }
    setProgress({ done: 0, total: pdfs.length });
    const results: ImportCandidate[] = [];
    let pdfjs;
    try {
      pdfjs = await loadPdfJs();
    } catch {
      setProgress(null);
      setError("We couldn't load the PDF reader. Check your connection and try again.");
      return;
    }
    for (const file of pdfs) {
      try {
        if (file.size > MAX_PDF_BYTES) throw new Error("too big");
        const { lines, pageWidth } = await extractPdfLines(pdfjs, await file.arrayBuffer());
        const profile = parseLinkedInProfile(lines, pageWidth);
        const missing = !profile.name || !profile.company || !profile.title;
        results.push(
          candidate({
            ...profile,
            source: file.name,
            warning: missing ? "Some fields couldn't be read. Please fill them in." : undefined,
          }),
        );
      } catch {
        results.push(
          candidate({
            source: file.name,
            warning: file.size > MAX_PDF_BYTES ? "This file is over 8 MB." : "Couldn't read this PDF. Type the details in.",
          }),
        );
      }
      setProgress((p) => p && { ...p, done: p.done + 1 });
    }
    setProgress(null);
    onDone({
      candidates: results,
      kind: "linkedin",
      note: pdfs.length < files.length ? `Skipped ${files.length - pdfs.length} file(s) that weren't PDFs.` : undefined,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <DropZone
        accept="application/pdf,.pdf"
        multiple
        onFiles={handleFiles}
        disabled={progress !== null}
        title="Choose LinkedIn profile PDFs"
        hint={
          <>
            On someone&apos;s LinkedIn profile, click <strong>More → Save to PDF</strong>. You can drop several at once.
            PDFs are read in your browser and never uploaded.
          </>
        }
      />
      {progress && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted">
          <Spinner className="h-4 w-4" /> Reading {Math.min(progress.done + 1, progress.total)} of {progress.total}…
        </p>
      )}
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}

export function CsvSource({ onDone }: { onDone: (result: SourceResult) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  async function handleFiles([file]: File[]) {
    setError(null);
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      setError("Please choose a .csv file. In Excel or Google Sheets, use File → Download / Save As → CSV.");
      return;
    }
    if (file.size > MAX_CSV_BYTES) {
      setError("That file is over 10 MB. Try splitting it into smaller files.");
      return;
    }
    setReading(true);
    const result = parseImportCsv(await file.text());
    setReading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone({
      candidates: result.candidates,
      kind: result.kind,
      note: result.truncated ? `Only the first ${MAX_IMPORT_ROWS.toLocaleString()} rows were loaded.` : undefined,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <DropZone
        accept=".csv,text/csv"
        onFiles={handleFiles}
        disabled={reading}
        title="Choose a CSV file"
        hint={
          <>
            <strong>LinkedIn connections:</strong> Settings → Data privacy → Get a copy of your data → Connections, then
            upload <code className="font-mono">Connections.csv</code>.<br />
            <strong>Your own tracker:</strong> a CSV with columns like Company, Name, Title, Stage, Follow-up, Notes.
          </>
        }
      />
      {error && <Alert tone="error">{error}</Alert>}
    </div>
  );
}

export function UrlSource({ onDone }: { onDone: (result: SourceResult) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const entries = text
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (entries.length === 0) {
      setError("Paste at least one LinkedIn profile URL.");
      return;
    }
    const bad = entries.filter((u) => !normalizeLinkedInUrl(u));
    if (bad.length > 0) {
      setError(`These aren't LinkedIn profile links: ${bad.slice(0, 3).join(", ")}${bad.length > 3 ? "…" : ""}`);
      return;
    }
    onDone({
      kind: "linkedin",
      candidates: entries.map((u) => candidate({ name: nameFromLinkedInUrl(u), linkedin_url: normalizeLinkedInUrl(u) })),
      note: "We filled in names from the URLs. Check them and add the company and title.",
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label htmlFor="import-urls" className="text-sm font-medium">
        LinkedIn profile URLs <span className="font-normal text-muted">(one per line)</span>
      </label>
      <textarea
        id="import-urls"
        rows={5}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setError(null);
        }}
        placeholder={"https://www.linkedin.com/in/jane-doe\nlinkedin.com/in/john-smith-1a2b3c"}
        className="w-full rounded-md border border-rule-strong bg-surface px-3 py-2 font-mono text-sm placeholder:text-muted focus:border-focus focus:outline-2 focus:outline-offset-0 focus:outline-focus"
        aria-describedby={error ? "import-urls-error" : "import-urls-hint"}
        aria-invalid={error ? true : undefined}
      />
      <p id="import-urls-hint" className="text-xs text-muted">
        We only read the name from the link itself; we never visit LinkedIn. You&apos;ll type the rest next.
      </p>
      {error && (
        <p id="import-urls-error" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <Button type="submit" className="self-start">
        Continue
      </Button>
    </form>
  );
}
