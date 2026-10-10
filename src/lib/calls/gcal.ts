/** UTC timestamp in Google Calendar's compact format: 20261009T143000Z. */
function gcalTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * A prefilled "add event" link for calendar.google.com. Opening it lets the user save the call to
 * their own Google Calendar; no OAuth or API key is involved.
 */
export function googleCalendarUrl(event: {
  title: string;
  start: Date;
  durationMinutes: number;
  details?: string;
}): string {
  const end = new Date(event.start.getTime() + event.durationMinutes * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${gcalTime(event.start)}/${gcalTime(end)}`,
  });
  if (event.details) params.set("details", event.details);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function callTitle(contact: { name: string; company: string }): string {
  const who = contact.name.trim() || "Networking call";
  return contact.company.trim() ? `Call: ${who} (${contact.company.trim()})` : `Call: ${who}`;
}

export function callDetails(contact: { title: string; company: string; linkedin_url: string | null }): string {
  return [
    [contact.title, contact.company].filter((s) => s.trim()).join(", "),
    contact.linkedin_url ? `LinkedIn: ${contact.linkedin_url}` : "",
    "Scheduled with Coverage",
  ]
    .filter(Boolean)
    .join("\n");
}
