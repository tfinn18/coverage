import type { Call, Contact } from "@/lib/database.types";

export const SLOT_MINUTES = 30;

/**
 * People waiting for a call: Stage is "Call scheduled" but nothing is on the calendar yet.
 * Sorted by most recently updated first, so whoever you just moved to Call scheduled is on top.
 */
export function readyToSchedule(contacts: Contact[], calls: Pick<Call, "contact_id">[]): Contact[] {
  const booked = new Set(calls.map((c) => c.contact_id));
  return contacts
    .filter((c) => c.stage === "call_scheduled" && !booked.has(c.id))
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : 0));
}

/** Contacts not on the calendar yet, of any stage except Called. Used by "Book someone else". */
export function bookableContacts(contacts: Contact[], calls: Pick<Call, "contact_id">[]): Contact[] {
  const booked = new Set(calls.map((c) => c.contact_id));
  return contacts.filter((c) => c.stage !== "called" && !booked.has(c.id));
}

export function callEnd(call: Pick<Call, "starts_at" | "duration_minutes">): Date {
  return new Date(new Date(call.starts_at).getTime() + call.duration_minutes * 60_000);
}

/** The next `limit` calls that haven't finished yet, soonest first. */
export function upcomingCalls<T extends Pick<Call, "starts_at" | "duration_minutes">>(calls: T[], now: Date, limit = 5): T[] {
  return calls
    .filter((c) => callEnd(c) > now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, limit);
}

/** Rounds a time down to the start of its 30-minute slot. */
export function snapToSlot(date: Date): Date {
  const d = new Date(date);
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() - (d.getMinutes() % SLOT_MINUTES));
  return d;
}

/** Builds a Date from local date (YYYY-MM-DD) and time (HH:MM) inputs. */
export function fromLocalInputs(date: string, time: string): Date | null {
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const t = time.match(/^(\d{2}):(\d{2})$/);
  if (!m || !t) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(t[1]), Number(t[2]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Local HH:MM for a time input. */
export function localTimeString(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function formatCallTime(start: Date, durationMinutes: number, now: Date = new Date()): string {
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const sameYear = start.getFullYear() === now.getFullYear();
  const day = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  });
  const time = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day}, ${time(start)} – ${time(end)}`;
}
