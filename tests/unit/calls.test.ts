import { describe, expect, it } from "vitest";
import { callDetails, callTitle, googleCalendarUrl } from "@/lib/calls/gcal";
import {
  bookableContacts,
  callEnd,
  fromLocalInputs,
  localTimeString,
  readyToSchedule,
  snapToSlot,
  upcomingCalls,
} from "@/lib/calls/schedule";
import type { Call, Contact } from "@/lib/database.types";

function contact(id: string, stage: Contact["stage"], updated_at = "2026-10-01T00:00:00Z"): Contact {
  return {
    id,
    user_id: "u",
    company: "Co",
    name: id,
    title: "",
    stage,
    follow_up_date: null,
    notes: "",
    linkedin_url: null,
    is_example: false,
    created_at: "2026-10-01T00:00:00Z",
    updated_at,
  };
}

function call(id: string, contact_id: string, starts_at: string, duration_minutes = 30): Call {
  return { id, user_id: "u", contact_id, starts_at, duration_minutes, created_at: starts_at };
}

describe("Ready to schedule", () => {
  const contacts = [
    contact("a", "call_scheduled", "2026-10-01T00:00:00Z"),
    contact("b", "call_scheduled", "2026-10-05T00:00:00Z"),
    contact("c", "call_scheduled"),
    contact("d", "contacted"),
    contact("e", "called"),
  ];
  const calls = [call("1", "c", "2026-10-10T15:00:00Z")];

  it("lists Call scheduled contacts with nothing on the calendar, newest first", () => {
    expect(readyToSchedule(contacts, calls).map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("lets you book anyone not yet booked except people already called", () => {
    expect(bookableContacts(contacts, calls).map((c) => c.id)).toEqual(["a", "b", "d"]);
  });
});

describe("Coming up", () => {
  it("returns unfinished calls soonest first, including one in progress", () => {
    const now = new Date("2026-10-09T15:10:00Z");
    const calls = [
      call("later", "x", "2026-10-12T14:00:00Z"),
      call("past", "x", "2026-10-08T14:00:00Z"),
      call("now", "x", "2026-10-09T15:00:00Z"),
      call("soon", "x", "2026-10-09T18:00:00Z"),
    ];
    expect(upcomingCalls(calls, now, 2).map((c) => c.id)).toEqual(["now", "soon"]);
  });

  it("computes the end time from the duration", () => {
    expect(callEnd(call("x", "y", "2026-10-09T15:00:00Z", 45)).toISOString()).toBe("2026-10-09T15:45:00.000Z");
  });
});

describe("time helpers", () => {
  it("snaps to the start of a 30-minute slot", () => {
    expect(localTimeString(snapToSlot(new Date(2026, 9, 9, 14, 47, 31)))).toBe("14:30");
    expect(localTimeString(snapToSlot(new Date(2026, 9, 9, 9, 5)))).toBe("09:00");
  });

  it("reads date and time inputs in local time", () => {
    expect(fromLocalInputs("2026-10-09", "14:30")?.getTime()).toBe(new Date(2026, 9, 9, 14, 30).getTime());
    expect(fromLocalInputs("10/09/2026", "14:30")).toBeNull();
    expect(fromLocalInputs("2026-10-09", "")).toBeNull();
  });
});

describe("Add to Google Calendar link", () => {
  it("builds a prefilled calendar.google.com template link in UTC", () => {
    const url = new URL(
      googleCalendarUrl({
        title: callTitle({ name: "Ava Chen", company: "Goldman Sachs" }),
        start: new Date("2026-10-09T18:30:00Z"),
        durationMinutes: 30,
        details: callDetails({ title: "Analyst", company: "Goldman Sachs", linkedin_url: "https://www.linkedin.com/in/ava" }),
      }),
    );
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Call: Ava Chen (Goldman Sachs)");
    expect(url.searchParams.get("dates")).toBe("20261009T183000Z/20261009T190000Z");
    expect(url.searchParams.get("details")).toBe(
      "Analyst, Goldman Sachs\nLinkedIn: https://www.linkedin.com/in/ava\nScheduled with Coverage",
    );
  });

  it("handles contacts with missing details", () => {
    expect(callTitle({ name: " ", company: "" })).toBe("Call: Networking call");
    expect(callDetails({ title: "", company: "", linkedin_url: null })).toBe("Scheduled with Coverage");
  });
});
