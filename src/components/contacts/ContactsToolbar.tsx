"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { STAGE_CLASSES, STAGES } from "@/lib/contacts/stages";
import type { countByStage } from "@/lib/contacts/view";
import type { ContactStage } from "@/lib/database.types";
import type { SaveStatus } from "./useAutosave";

type Counts = ReturnType<typeof countByStage>;

function Chip({
  pressed,
  onClick,
  children,
  dotClass,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
  dotClass?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
        pressed ? "border-ink bg-ink text-paper" : "border-rule-strong bg-surface text-ink-2 hover:border-ink hover:text-ink",
      )}
    >
      {dotClass && <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", dotClass)} />}
      {children}
    </button>
  );
}

export function SaveIndicator({ status }: { status: SaveStatus }) {
  const text = {
    idle: "",
    saving: "Saving…",
    saved: "All changes saved",
    error: "Couldn't save. Retrying…",
  }[status];
  return (
    <p
      role="status"
      aria-live="polite"
      className={cn("min-w-32 text-xs", status === "error" ? "font-medium text-danger" : "text-muted")}
    >
      {text}
    </p>
  );
}

export function ContactsToolbar({
  search,
  onSearch,
  stage,
  onStage,
  followUpsDue,
  onFollowUpsDue,
  counts,
  onAdd,
  onImport,
  onExport,
  canExport,
  saveStatus,
}: {
  search: string;
  onSearch: (value: string) => void;
  stage: ContactStage | "all";
  onStage: (value: ContactStage | "all") => void;
  followUpsDue: boolean;
  onFollowUpsDue: (value: boolean) => void;
  counts: Counts;
  onAdd: () => void;
  onImport: () => void;
  onExport: () => void;
  canExport: boolean;
  saveStatus: SaveStatus;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <label htmlFor="contact-search" className="sr-only">
            Search contacts
          </label>
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          >
            <path
              fill="currentColor"
              d="M8.5 3a5.5 5.5 0 0 1 4.38 8.82l3.65 3.65a.75.75 0 1 1-1.06 1.06l-3.65-3.65A5.5 5.5 0 1 1 8.5 3Zm0 1.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
            />
          </svg>
          <input
            id="contact-search"
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search name, company, title, notes"
            className="h-9 w-full rounded-md border border-rule-strong bg-surface pl-9 pr-3 text-sm placeholder:text-muted focus:border-focus focus:outline-2 focus:outline-offset-0 focus:outline-focus"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <SaveIndicator status={saveStatus} />
          <Button variant="secondary" size="sm" onClick={onImport}>
            Import
          </Button>
          <Button variant="secondary" size="sm" onClick={onExport} disabled={!canExport}>
            Export CSV
          </Button>
          <Button size="sm" onClick={onAdd}>
            + Add contact
          </Button>
        </div>
      </div>

      <div role="group" aria-label="Filter contacts" className="flex flex-wrap items-center gap-2">
        <Chip pressed={stage === "all"} onClick={() => onStage("all")}>
          All <span className="font-mono opacity-70">{counts.all}</span>
        </Chip>
        {STAGES.map((s) => (
          <Chip
            key={s.value}
            pressed={stage === s.value}
            onClick={() => onStage(stage === s.value ? "all" : s.value)}
            dotClass={cn(STAGE_CLASSES[s.value], "border border-current")}
          >
            {s.label} <span className="font-mono opacity-70">{counts[s.value]}</span>
          </Chip>
        ))}
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-rule-strong" />
        <Chip pressed={followUpsDue} onClick={() => onFollowUpsDue(!followUpsDue)} dotClass="bg-danger">
          Follow-ups due <span className="font-mono opacity-70">{counts.due}</span>
        </Chip>
      </div>
    </div>
  );
}
