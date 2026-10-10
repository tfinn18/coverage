import type { ContactStage } from "@/lib/database.types";

/** A person proposed for import, shown in the review step before anything is saved. */
export type ImportCandidate = {
  key: string;
  name: string;
  company: string;
  title: string;
  stage: ContactStage;
  follow_up_date: string | null;
  notes: string;
  linkedin_url: string | null;
  /** Where it came from, e.g. a PDF file name. Shown in the review table. */
  source?: string;
  /** A problem the user should look at (e.g. "Couldn't read this PDF"). */
  warning?: string;
};

let counter = 0;

export function candidate(fields: Partial<Omit<ImportCandidate, "key">>): ImportCandidate {
  counter += 1;
  return {
    key: `c${counter}`,
    name: "",
    company: "",
    title: "",
    stage: "contacted",
    follow_up_date: null,
    notes: "",
    linkedin_url: null,
    ...fields,
  };
}

/** Name + company, ignoring case, spacing and punctuation. Two contacts with the same key are duplicates. */
export function dedupeKey(person: { name: string; company: string }): string {
  const clean = (s: string) =>
    s
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  return `${clean(person.name)}|${clean(person.company)}`;
}

/**
 * Marks candidates that duplicate an existing contact or an earlier candidate in the same batch.
 * Returns a map from candidate key to the reason it's a duplicate.
 */
export function findDuplicates(
  candidates: { key: string; name: string; company: string }[],
  existing: { name: string; company: string }[],
): Map<string, "existing" | "batch"> {
  const known = new Set(existing.map(dedupeKey));
  const seen = new Set<string>();
  const result = new Map<string, "existing" | "batch">();
  for (const c of candidates) {
    if (!c.name.trim()) continue; // blank names are never considered duplicates
    const k = dedupeKey(c);
    if (known.has(k)) result.set(c.key, "existing");
    else if (seen.has(k)) result.set(c.key, "batch");
    else seen.add(k);
  }
  return result;
}
