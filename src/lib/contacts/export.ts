import type { Contact } from "@/lib/database.types";
import { toCsv } from "@/lib/csv/write";
import { localDateString } from "./followup";
import { STAGE_LABEL } from "./stages";

export const EXPORT_HEADERS = ["Company", "Name", "Title", "Stage", "Follow-up date", "Notes", "LinkedIn URL"];

/** Builds a CSV in the same column layout the generic CSV import accepts, so exports round-trip. */
export function contactsToCsv(contacts: Contact[]): string {
  return toCsv([
    EXPORT_HEADERS,
    ...contacts.map((c) => [
      c.company,
      c.name,
      c.title,
      STAGE_LABEL[c.stage],
      c.follow_up_date ?? "",
      c.notes,
      c.linkedin_url ?? "",
    ]),
  ]);
}

export function exportFileName(date: Date = new Date()) {
  return `coverage-contacts-${localDateString(date)}.csv`;
}
