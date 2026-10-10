import type { ContactStage } from "@/lib/database.types";

export const STAGES: { value: ContactStage; label: string }[] = [
  { value: "contacted", label: "Contacted" },
  { value: "call_scheduled", label: "Call scheduled" },
  { value: "called", label: "Called" },
];

export const STAGE_LABEL: Record<ContactStage, string> = {
  contacted: "Contacted",
  call_scheduled: "Call scheduled",
  called: "Called",
};

/** Tailwind classes for each stage: grey, yellow, green. Colors come from tokens in globals.css. */
export const STAGE_CLASSES: Record<ContactStage, string> = {
  contacted: "bg-[var(--stage-contacted-bg)] text-[var(--stage-contacted-fg)]",
  call_scheduled: "bg-[var(--stage-scheduled-bg)] text-[var(--stage-scheduled-fg)]",
  called: "bg-[var(--stage-called-bg)] text-[var(--stage-called-fg)]",
};

/** Sort order follows the pipeline, not the alphabet. */
export const STAGE_ORDER: Record<ContactStage, number> = { contacted: 0, call_scheduled: 1, called: 2 };

const STAGE_ALIASES: Record<string, ContactStage> = {
  contacted: "contacted",
  "call scheduled": "call_scheduled",
  scheduled: "call_scheduled",
  called: "called",
};

/** Parses a stage from user text like "Call scheduled", "call_scheduled" or "called". Unknown values become null. */
export function parseStage(text: string | null | undefined): ContactStage | null {
  if (!text) return null;
  const normalized = text.trim().toLowerCase().replace(/[-_\s]+/g, " ");
  return STAGE_ALIASES[normalized] ?? null;
}
