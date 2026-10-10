/**
 * The notes document for one contact, stored as JSON in contact_notes.doc.
 * Lists are arrays of strings (one per bullet / numbered item); empty items are kept while
 * editing so the cursor has somewhere to go, and dropped when computing the plain-text copy.
 */
export type NotesDoc = {
  v: 1;
  prep: { background: string[]; whyCompany: string; questions: string[] };
  call: { date: string | null; keyAdvice: string[]; firm: string[]; people: string[]; askedFor: string };
  followUp: { subject: string; body: string; sentOn: string | null; nextSteps: string[] };
};

export function emptyNotesDoc(): NotesDoc {
  return {
    v: 1,
    prep: { background: [], whyCompany: "", questions: [] },
    call: { date: null, keyAdvice: [], firm: [], people: [], askedFor: "" },
    followUp: { subject: "", body: "", sentOn: null, nextSteps: [] },
  };
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/** Reads a stored document, filling in anything missing or malformed with empty values. */
export function parseNotesDoc(raw: unknown): NotesDoc {
  const d = obj(raw);
  const prep = obj(d.prep);
  const call = obj(d.call);
  const follow = obj(d.followUp);
  return {
    v: 1,
    prep: { background: list(prep.background), whyCompany: str(prep.whyCompany), questions: list(prep.questions) },
    call: {
      date: date(call.date),
      keyAdvice: list(call.keyAdvice),
      firm: list(call.firm),
      people: list(call.people),
      askedFor: str(call.askedFor),
    },
    followUp: {
      subject: str(follow.subject),
      body: str(follow.body),
      sentOn: date(follow.sentOn),
      nextSteps: list(follow.nextSteps),
    },
  };
}

/** Turns free-text notes (e.g. an imported "Notes" column) into Key advice bullets, one per line. */
export function notesDocFromText(text: string): NotesDoc {
  const doc = emptyNotesDoc();
  doc.call.keyAdvice = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return doc;
}

const clean = (items: string[]) => items.map((s) => s.trim()).filter(Boolean);

/**
 * A plain-text copy of the document, saved to contacts.notes so the grid preview, search and
 * CSV export work without loading every document. Most useful content comes first.
 */
export function notesToText(doc: NotesDoc, company: string): string {
  const lines: string[] = [];
  const add = (label: string, value: string) => value.trim() && lines.push(`${label}: ${value.trim()}`);
  const addList = (label: string, items: string[]) => add(label, clean(items).join("; "));

  addList("Key advice", doc.call.keyAdvice);
  addList("Next steps", doc.followUp.nextSteps);
  addList("About the firm", doc.call.firm);
  addList("People to contact", doc.call.people);
  add("Asked for", doc.call.askedFor);
  add("Call date", doc.call.date ?? "");
  addList("Background", doc.prep.background);
  add(`Why ${company.trim() || "this firm"}?`, doc.prep.whyCompany);
  add(
    "My questions",
    clean(doc.prep.questions)
      .map((q, i) => `${i + 1}. ${q}`)
      .join(" "),
  );
  if (doc.followUp.sentOn) lines.push(`Thank-you sent: ${doc.followUp.sentOn}`);
  return lines.join("\n");
}

/** Text for the "Copy" button: subject line, blank line, body. */
export function thankYouText(subject: string, body: string): string {
  return [subject.trim() ? `Subject: ${subject.trim()}` : "", body.trim()].filter(Boolean).join("\n\n");
}

/** mailto: link that opens the user's email app with the address, subject and body filled in. */
export function mailtoUrl(to: string | null, subject: string, body: string): string {
  const params = [
    subject ? `subject=${encodeURIComponent(subject)}` : "",
    body ? `body=${encodeURIComponent(body.replace(/\r?\n/g, "\r\n"))}` : "",
  ].filter(Boolean);
  const address = (to ?? "").trim();
  return `mailto:${address ? encodeURIComponent(address).replace(/%40/g, "@") : ""}${params.length ? `?${params.join("&")}` : ""}`;
}

/** Loose check for the optional email field: something@something.something, no spaces. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ---- List editing (used by the bullet and numbered list editors) ----

/** Splits item `index` at the cursor: text before stays, text after becomes a new item below. */
export function splitItem(items: string[], index: number, cursor: number): string[] {
  const current = items[index] ?? "";
  return [...items.slice(0, index), current.slice(0, cursor), current.slice(cursor), ...items.slice(index + 1)];
}

/** Removes item `index`, appending any text in it to the item above (like Backspace at line start). */
export function mergeWithPrevious(items: string[], index: number): string[] {
  if (index <= 0) return items;
  const merged = (items[index - 1] ?? "") + (items[index] ?? "");
  return [...items.slice(0, index - 1), merged, ...items.slice(index + 1)];
}

export function setItem(items: string[], index: number, value: string): string[] {
  const next = items.length === 0 ? [""] : [...items];
  next[index] = value;
  return next;
}
