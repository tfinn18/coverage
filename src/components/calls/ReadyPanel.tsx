"use client";

import { forwardRef, useId, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { STAGE_CLASSES, STAGE_LABEL } from "@/lib/contacts/stages";
import { matchesSearch } from "@/lib/contacts/view";
import type { Contact } from "@/lib/database.types";

function PersonCard({
  contact,
  selected,
  onSelect,
  onBook,
  showStage = false,
}: {
  contact: Contact;
  selected: boolean;
  onSelect: () => void;
  onBook: () => void;
  showStage?: boolean;
}) {
  const name = contact.name.trim() || "Unnamed contact";
  return (
    <li
      data-drag-contact={contact.id}
      data-title={name}
      className={cn(
        "group flex items-center gap-2 rounded-md border bg-surface pl-2 pr-1 transition-colors",
        selected ? "border-brass ring-2 ring-brass/40" : "border-rule hover:border-rule-strong",
        "cursor-grab active:cursor-grabbing",
      )}
    >
      <span aria-hidden="true" className="select-none text-muted/70">
        ⋮⋮
      </span>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className="min-w-0 flex-1 py-2 text-left"
        title="Drag onto the calendar, or click and then click a time slot"
      >
        <span className="block truncate text-sm font-semibold">
          {name}
          {contact.is_example && <span className="ml-1.5 font-mono text-[9px] font-medium uppercase text-warning">Example</span>}
        </span>
        <span className="block truncate text-xs text-muted">
          {[contact.title, contact.company].filter((s) => s.trim()).join(" · ") || "No company yet"}
        </span>
        {showStage && (
          <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold", STAGE_CLASSES[contact.stage])}>
            {STAGE_LABEL[contact.stage]}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={onBook}
        aria-label={`Pick a time for ${name}`}
        className="shrink-0 rounded px-2 py-1 text-xs font-medium text-brass hover:bg-surface-2"
      >
        Book…
      </button>
    </li>
  );
}

/** "Ready to schedule": people at Call scheduled with no call yet. Items are drag sources for the calendar. */
export const ReadyPanel = forwardRef<
  HTMLDivElement,
  {
    ready: Contact[];
    others: Contact[];
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onBook: (id: string) => void;
  }
>(function ReadyPanel({ ready, others, selectedId, onSelect, onBook }, ref) {
  const [query, setQuery] = useState("");
  const searchId = useId();
  const matches = useMemo(
    () => (query.trim() ? others.filter((c) => matchesSearch(c, query)).slice(0, 8) : []),
    [others, query],
  );
  const toggle = (id: string) => onSelect(selectedId === id ? null : id);

  return (
    <section aria-labelledby="ready-heading" ref={ref}>
      <div className="flex items-baseline justify-between">
        <h2 id="ready-heading" className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink-2">
          Ready to schedule
        </h2>
        <span className="font-mono text-xs text-muted">{ready.length}</span>
      </div>
      <p className="mt-1 text-xs text-muted">Drag someone onto the calendar, or tap them and then tap a time.</p>

      {ready.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-rule-strong px-3 py-4 text-center text-xs text-muted">
          No one is waiting. Set a contact&apos;s Stage to <strong>Call scheduled</strong> and they&apos;ll appear here.
        </p>
      ) : (
        <ul className="mt-3 flex max-h-[40vh] flex-col gap-2 overflow-y-auto pr-1 lg:max-h-[45vh]">
          {ready.map((c) => (
            <PersonCard key={c.id} contact={c} selected={selectedId === c.id} onSelect={() => toggle(c.id)} onBook={() => onBook(c.id)} />
          ))}
        </ul>
      )}

      <div className="mt-4">
        <label htmlFor={searchId} className="text-xs font-medium text-ink-2">
          Book someone else
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your contacts"
          className="mt-1 h-9 w-full rounded-md border border-rule-strong bg-surface px-3 text-sm placeholder:text-muted focus:border-focus focus:outline-2 focus:outline-offset-0 focus:outline-focus"
        />
        {query.trim() && (
          <ul className="mt-2 flex flex-col gap-2" aria-label="Matching contacts">
            {matches.length === 0 && <li className="text-xs text-muted">No unbooked contacts match.</li>}
            {matches.map((c) => (
              <PersonCard
                key={c.id}
                contact={c}
                showStage
                selected={selectedId === c.id}
                onSelect={() => toggle(c.id)}
                onBook={() => onBook(c.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
});
