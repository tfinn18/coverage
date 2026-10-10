export type FollowUpStatus = "overdue" | "today" | "upcoming" | "none";

/** Today's date as YYYY-MM-DD in the user's local time zone. */
export function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Compares a YYYY-MM-DD follow-up date with today. ISO date strings sort correctly as text. */
export function followUpStatus(followUpDate: string | null | undefined, today: string = localDateString()): FollowUpStatus {
  if (!followUpDate) return "none";
  if (followUpDate < today) return "overdue";
  if (followUpDate === today) return "today";
  return "upcoming";
}

export function isFollowUpDue(followUpDate: string | null | undefined, today?: string): boolean {
  const status = followUpStatus(followUpDate, today);
  return status === "overdue" || status === "today";
}
