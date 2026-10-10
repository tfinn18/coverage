import type { Contact, ContactStage } from "@/lib/database.types";
import { isFollowUpDue } from "./followup";
import { STAGE_ORDER } from "./stages";

export type SortKey = "company" | "name" | "title" | "stage" | "follow_up_date" | "notes" | "created_at";
export type SortDir = "asc" | "desc";

export type ViewOptions = {
  search: string;
  stage: ContactStage | "all";
  followUpsDue: boolean;
  sort: { key: SortKey; dir: SortDir };
  today?: string;
};

export type ContactLike = Pick<
  Contact,
  "id" | "company" | "name" | "title" | "stage" | "follow_up_date" | "notes" | "created_at"
>;

const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

export function matchesSearch(contact: ContactLike, search: string): boolean {
  const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = [contact.company, contact.name, contact.title, contact.notes].join(" ").toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

function compare(a: ContactLike, b: ContactLike, key: SortKey): number {
  switch (key) {
    case "stage":
      return STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage];
    case "follow_up_date":
    case "created_at": {
      const av = a[key] ?? "";
      const bv = b[key] ?? "";
      return av === bv ? 0 : av < bv ? -1 : 1;
    }
    default:
      return collator.compare(a[key].trim(), b[key].trim());
  }
}

/** Returns the ids of the contacts to show, filtered and sorted. */
export function visibleContactIds(contacts: ContactLike[], options: ViewOptions): string[] {
  const { key, dir } = options.sort;
  // Blank cells always sink to the bottom, whichever direction you sort.
  const isBlank = (c: ContactLike) => (key === "stage" ? false : !(c[key] ?? "").trim());

  return contacts
    .filter((c) => options.stage === "all" || c.stage === options.stage)
    .filter((c) => !options.followUpsDue || isFollowUpDue(c.follow_up_date, options.today))
    .filter((c) => matchesSearch(c, options.search))
    .map((c, index) => ({ c, index }))
    .sort((x, y) => {
      const xBlank = isBlank(x.c);
      const yBlank = isBlank(y.c);
      if (xBlank !== yBlank) return xBlank ? 1 : -1;
      const result = compare(x.c, y.c, key);
      if (result !== 0) return dir === "asc" ? result : -result;
      return x.index - y.index; // stable
    })
    .map(({ c }) => c.id);
}

export function countByStage(contacts: Pick<Contact, "stage" | "follow_up_date">[], today?: string) {
  const counts = { all: contacts.length, contacted: 0, call_scheduled: 0, called: 0, due: 0 };
  for (const c of contacts) {
    counts[c.stage] += 1;
    if (isFollowUpDue(c.follow_up_date, today)) counts.due += 1;
  }
  return counts;
}
