"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { STAGE_CLASSES, STAGE_LABEL } from "@/lib/contacts/stages";
import { findDuplicates, type ImportCandidate } from "@/lib/import/candidate";

const ROW_HEIGHT = 44;
const VIEWPORT_ROWS = 9;
const OVERSCAN = 6;

const CELL_INPUT =
  "h-8 w-full min-w-0 rounded border border-transparent bg-transparent px-2 text-sm hover:border-rule-strong " +
  "focus:border-focus focus:bg-surface focus:outline-2 focus:outline-offset-0 focus:outline-focus";

type EditableKey = "name" | "company" | "title";

/**
 * Editable review table for an import. Duplicates (same name + company as an existing contact,
 * or repeated in the file) can't be selected. Long lists are windowed so 1,000+ rows stay fast.
 */
export function ReviewStep({
  initial,
  kind,
  note,
  existing,
  importing,
  error,
  onBack,
  onImport,
}: {
  initial: ImportCandidate[];
  kind: "linkedin" | "tracker";
  note?: string;
  existing: { name: string; company: string }[];
  importing: boolean;
  error: string | null;
  onBack: () => void;
  onImport: (selected: ImportCandidate[], skippedDuplicates: number) => void;
}) {
  const [rows, setRows] = useState(initial);
  const [deselected, setDeselected] = useState<Set<string>>(() => new Set());
  const [scrollTop, setScrollTop] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const duplicates = useMemo(() => findDuplicates(rows, existing), [rows, existing]);
  const selectable = (c: ImportCandidate) => !duplicates.has(c.key) && Boolean(c.name.trim() || c.company.trim());
  const selectableRows = rows.filter(selectable);
  const selected = selectableRows.filter((c) => !deselected.has(c.key));
  const allSelected = selectableRows.length > 0 && selected.length === selectableRows.length;

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = selected.length > 0 && !allSelected;
  }, [selected.length, allSelected]);

  const edit = (key: string, field: EditableKey, value: string) =>
    setRows((prev) => prev.map((c) => (c.key === key ? { ...c, [field]: value } : c)));

  const toggle = (key: string, on: boolean) =>
    setDeselected((prev) => {
      const next = new Set(prev);
      if (on) next.delete(key);
      else next.add(key);
      return next;
    });

  // Windowing: only render the rows near the visible area.
  const windowed = rows.length > 60;
  const start = windowed ? Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN) : 0;
  const end = windowed ? Math.min(rows.length, start + VIEWPORT_ROWS + OVERSCAN * 2) : rows.length;
  const visible = rows.slice(start, end);
  const showTrackerColumns = kind === "tracker";
  const columnCount = showTrackerColumns ? 7 : 5;

  return (
    <div className="flex flex-col gap-4">
      {note && <Alert tone="info">{note}</Alert>}

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p>
          <strong className="font-semibold">{selected.length.toLocaleString()}</strong> of{" "}
          {rows.length.toLocaleString()} selected
          {duplicates.size > 0 && (
            <span className="text-muted">
              {" "}
              · {duplicates.size.toLocaleString()} duplicate{duplicates.size === 1 ? "" : "s"} will be skipped
            </span>
          )}
        </p>
        <p className="text-xs text-muted">
          {kind === "linkedin"
            ? "Everyone starts at Contacted with no follow-up date or notes. Edit names, companies and titles below."
            : "Stages, follow-up dates and notes come from your file. Edit names, companies and titles below."}
        </p>
      </div>

      <div
        ref={scroller}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        className="relative max-h-[min(440px,55vh)] overflow-auto rounded-lg border border-rule"
      >
        <table className="w-full min-w-[640px] table-fixed border-collapse text-left text-sm">
          <caption className="sr-only">People to import. Uncheck anyone you don&apos;t want to add.</caption>
          <thead className="sticky top-0 z-10 bg-surface-2">
            <tr className="border-b border-rule-strong font-mono text-[11px] uppercase tracking-[0.1em] text-ink-2">
              <th scope="col" className="w-10 px-3 py-2">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  aria-label="Select all"
                  checked={allSelected}
                  onChange={(e) => setDeselected(e.target.checked ? new Set() : new Set(selectableRows.map((c) => c.key)))}
                  className="h-4 w-4 accent-[var(--navy)]"
                />
              </th>
              <th scope="col" className="px-2 py-2 font-medium">Name</th>
              <th scope="col" className="px-2 py-2 font-medium">Company</th>
              <th scope="col" className="px-2 py-2 font-medium">Title</th>
              {showTrackerColumns && (
                <>
                  <th scope="col" className="w-32 px-2 py-2 font-medium">Stage</th>
                  <th scope="col" className="w-28 px-2 py-2 font-medium">Follow-up</th>
                </>
              )}
              <th scope="col" className="w-40 px-2 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {start > 0 && (
              <tr aria-hidden="true" style={{ height: start * ROW_HEIGHT }}>
                <td colSpan={columnCount} />
              </tr>
            )}
            {visible.map((c) => {
              const dupe = duplicates.get(c.key);
              const canSelect = selectable(c);
              const who = c.name.trim() || c.source || "this person";
              return (
                <tr
                  key={c.key}
                  style={{ height: ROW_HEIGHT }}
                  className={cn("border-b border-rule", dupe && "bg-surface-2/60 text-muted")}
                >
                  <td className="px-3">
                    <input
                      type="checkbox"
                      aria-label={`Import ${who}`}
                      checked={canSelect && !deselected.has(c.key)}
                      disabled={!canSelect}
                      onChange={(e) => toggle(c.key, e.target.checked)}
                      className="h-4 w-4 accent-[var(--navy)]"
                    />
                  </td>
                  {(["name", "company", "title"] as const).map((field) => (
                    <td key={field} className="px-1">
                      <input
                        value={c[field]}
                        onChange={(e) => edit(c.key, field, e.target.value)}
                        aria-label={`${field[0].toUpperCase()}${field.slice(1)} for ${who}`}
                        placeholder={field === "name" ? "Name" : field === "company" ? "Company" : "Title"}
                        maxLength={300}
                        className={CELL_INPUT}
                      />
                    </td>
                  ))}
                  {showTrackerColumns && (
                    <>
                      <td className="px-2">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STAGE_CLASSES[c.stage])}>
                          {STAGE_LABEL[c.stage]}
                        </span>
                      </td>
                      <td className="px-2 font-mono text-xs">{c.follow_up_date ?? "—"}</td>
                    </>
                  )}
                  <td className="truncate px-2 text-xs" title={c.warning ?? c.source}>
                    {dupe === "existing" ? (
                      <span className="font-medium">Already in contacts</span>
                    ) : dupe === "batch" ? (
                      <span className="font-medium">Repeated in this import</span>
                    ) : c.warning ? (
                      <span className="font-medium text-warning">{c.warning}</span>
                    ) : !canSelect ? (
                      <span>Needs a name</span>
                    ) : (
                      <span className="text-muted">{c.source ?? "Ready"}</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {end < rows.length && (
              <tr aria-hidden="true" style={{ height: (rows.length - end) * ROW_HEIGHT }}>
                <td colSpan={columnCount} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" onClick={onBack} disabled={importing}>
          ← Back
        </Button>
        <Button
          onClick={() =>
            onImport(
              selected.map((c) => ({ ...c, name: c.name.trim(), company: c.company.trim(), title: c.title.trim() })),
              duplicates.size,
            )
          }
          disabled={selected.length === 0}
          loading={importing}
        >
          Import {selected.length.toLocaleString()} contact{selected.length === 1 ? "" : "s"}
        </Button>
      </div>
    </div>
  );
}
