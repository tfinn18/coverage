import { parseStage } from "@/lib/contacts/stages";
import { parseCsv } from "@/lib/csv/parse";
import { normalizeLinkedInUrl } from "@/lib/linkedin/url";
import { isValidEmail } from "@/lib/notes/doc";
import { candidate, type ImportCandidate } from "./candidate";

export const MAX_CSV_BYTES = 10 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 5000;

export type CsvImportResult =
  | { ok: true; kind: "linkedin" | "tracker"; candidates: ImportCandidate[]; truncated: boolean }
  | { ok: false; error: string };

const norm = (h: string) => h.toLowerCase().replace(/[^a-z]/g, "");

/** Header aliases for a generic tracker spreadsheet. Keys are normalized header text. */
const TRACKER_HEADERS: Record<string, keyof Omit<ImportCandidate, "key" | "source" | "warning"> | "first" | "last"> = {
  company: "company",
  firm: "company",
  bank: "company",
  organization: "company",
  employer: "company",
  name: "name",
  fullname: "name",
  contact: "name",
  contactname: "name",
  firstname: "first",
  lastname: "last",
  title: "title",
  position: "title",
  role: "title",
  jobtitle: "title",
  stage: "stage",
  status: "stage",
  followup: "follow_up_date",
  followupdate: "follow_up_date",
  nextfollowup: "follow_up_date",
  followupon: "follow_up_date",
  notes: "notes",
  note: "notes",
  comments: "notes",
  linkedin: "linkedin_url",
  linkedinurl: "linkedin_url",
  linkedinprofile: "linkedin_url",
  url: "linkedin_url",
  profileurl: "linkedin_url",
  email: "email",
  emailaddress: "email",
};

const emailOrNull = (value: string) => (isValidEmail(value) ? value.trim() : null);

/** Accepts 2026-10-09, 10/9/2026, 10/9/26 (US order) and returns YYYY-MM-DD, or null. */
export function parseDate(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  let y: number, m: number, d: number;
  const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const us = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (us) [m, d, y] = [Number(us[1]), Number(us[2]), Number(us[3].length === 2 ? `20${us[3]}` : us[3])];
  else return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * LinkedIn's Connections.csv starts with a few "Notes:" lines before the real header
 * (First Name, Last Name, URL, Email Address, Company, Position, Connected On).
 */
function findLinkedInHeader(rows: string[][]): number {
  return rows.slice(0, 20).findIndex((r) => {
    const cells = r.map(norm);
    return cells.includes("firstname") && cells.includes("lastname") && (cells.includes("company") || cells.includes("position"));
  });
}

function fromLinkedIn(rows: string[][], headerIndex: number): ImportCandidate[] {
  const header = rows[headerIndex].map(norm);
  const col = (name: string) => header.indexOf(name);
  const [first, last, url, company, position, email] = [
    "firstname",
    "lastname",
    "url",
    "company",
    "position",
    "emailaddress",
  ].map(col);
  const get = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");

  return rows.slice(headerIndex + 1).map((r) =>
    // LinkedIn imports always start at Contacted with no follow-up date or notes.
    candidate({
      name: [get(r, first), get(r, last)].filter(Boolean).join(" "),
      company: get(r, company),
      title: get(r, position),
      linkedin_url: normalizeLinkedInUrl(get(r, url)),
      email: emailOrNull(get(r, email)),
    }),
  );
}

function fromTracker(rows: string[][]): ImportCandidate[] | null {
  const header = rows[0].map((h) => TRACKER_HEADERS[norm(h)]);
  if (!header.includes("name") && !(header.includes("first") || header.includes("last"))) return null;

  return rows.slice(1).map((r) => {
    const fields: Partial<ImportCandidate> = {};
    let first = "";
    let last = "";
    header.forEach((target, i) => {
      const value = (r[i] ?? "").trim();
      if (!target || !value) return;
      if (target === "first") first = value;
      else if (target === "last") last = value;
      else if (target === "stage") fields.stage = parseStage(value) ?? "contacted";
      else if (target === "follow_up_date") fields.follow_up_date = parseDate(value);
      else if (target === "linkedin_url") fields.linkedin_url = normalizeLinkedInUrl(value);
      else if (target === "email") fields.email = emailOrNull(value);
      else fields[target] = value;
    });
    if (!fields.name && (first || last)) fields.name = [first, last].filter(Boolean).join(" ");
    return candidate(fields);
  });
}

/** Reads either a LinkedIn Connections.csv or a tracker spreadsheet exported as CSV. */
export function parseImportCsv(text: string): CsvImportResult {
  const rows = parseCsv(text);
  if (rows.length === 0) return { ok: false, error: "That file is empty." };

  const linkedInHeader = findLinkedInHeader(rows);
  let kind: "linkedin" | "tracker";
  let candidates: ImportCandidate[] | null;
  if (linkedInHeader !== -1) {
    kind = "linkedin";
    candidates = fromLinkedIn(rows, linkedInHeader);
  } else {
    kind = "tracker";
    candidates = fromTracker(rows);
  }
  if (!candidates) {
    return {
      ok: false,
      error:
        "We couldn't find a Name column. Use LinkedIn's Connections.csv, or a CSV with columns like Company, Name, Title, Stage, Follow-up, Notes.",
    };
  }

  const nonEmpty = candidates.filter((c) => c.name || c.company || c.title);
  if (nonEmpty.length === 0) return { ok: false, error: "We didn't find any people in that file." };
  return {
    ok: true,
    kind,
    candidates: nonEmpty.slice(0, MAX_IMPORT_ROWS),
    truncated: nonEmpty.length > MAX_IMPORT_ROWS,
  };
}
