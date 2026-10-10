import { describe, expect, it } from "vitest";
import { contactsToCsv } from "@/lib/contacts/export";
import { followUpStatus, isFollowUpDue, localDateString } from "@/lib/contacts/followup";
import { parseStage } from "@/lib/contacts/stages";
import { countByStage, visibleContactIds, type ContactLike, type ViewOptions } from "@/lib/contacts/view";
import { csvField, toCsv } from "@/lib/csv/write";
import type { Contact } from "@/lib/database.types";

const TODAY = "2026-10-09";

function contact(overrides: Partial<Contact> & { id: string }): Contact {
  return {
    user_id: "u1",
    company: "",
    name: "",
    title: "",
    stage: "contacted",
    follow_up_date: null,
    notes: "",
    linkedin_url: null,
    is_example: false,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    ...overrides,
  };
}

const people: ContactLike[] = [
  contact({ id: "a", company: "Goldman Sachs", name: "Ava Chen", title: "Analyst", stage: "called", follow_up_date: "2026-10-01" }),
  contact({ id: "b", company: "evercore", name: "Ben Ortiz", title: "Associate", stage: "call_scheduled", follow_up_date: TODAY }),
  contact({ id: "c", company: "", name: "Cara Patel", title: "VP", stage: "contacted", follow_up_date: "2026-11-02", notes: "Met at Bryant finance club" }),
  contact({ id: "d", company: "Centerview", name: "Dan Kim", title: "", stage: "contacted" }),
];

const base: ViewOptions = { search: "", stage: "all", followUpsDue: false, sort: { key: "company", dir: "asc" }, today: TODAY };

describe("follow-up status", () => {
  it("flags overdue, due today, upcoming and empty dates", () => {
    expect(followUpStatus("2026-10-08", TODAY)).toBe("overdue");
    expect(followUpStatus(TODAY, TODAY)).toBe("today");
    expect(followUpStatus("2026-10-10", TODAY)).toBe("upcoming");
    expect(followUpStatus(null, TODAY)).toBe("none");
    expect(isFollowUpDue("2026-01-01", TODAY)).toBe(true);
    expect(isFollowUpDue("2027-01-01", TODAY)).toBe(false);
  });

  it("formats today in local time as YYYY-MM-DD", () => {
    expect(localDateString(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("visibleContactIds", () => {
  it("sorts text case-insensitively with blanks last in both directions", () => {
    expect(visibleContactIds(people, base)).toEqual(["d", "b", "a", "c"]);
    expect(visibleContactIds(people, { ...base, sort: { key: "company", dir: "desc" } })).toEqual(["a", "b", "d", "c"]);
  });

  it("sorts stage by pipeline order and dates chronologically", () => {
    expect(visibleContactIds(people, { ...base, sort: { key: "stage", dir: "asc" } })).toEqual(["c", "d", "b", "a"]);
    expect(visibleContactIds(people, { ...base, sort: { key: "follow_up_date", dir: "asc" } })).toEqual(["a", "b", "c", "d"]);
    expect(visibleContactIds(people, { ...base, sort: { key: "follow_up_date", dir: "desc" } })).toEqual(["c", "b", "a", "d"]);
  });

  it("filters by stage, follow-ups due and multi-word search", () => {
    expect(visibleContactIds(people, { ...base, stage: "contacted" })).toEqual(["d", "c"]);
    expect(visibleContactIds(people, { ...base, followUpsDue: true })).toEqual(["b", "a"]);
    expect(visibleContactIds(people, { ...base, search: "finance bryant" })).toEqual(["c"]);
    expect(visibleContactIds(people, { ...base, search: "GOLDMAN" })).toEqual(["a"]);
    expect(visibleContactIds(people, { ...base, search: "nobody" })).toEqual([]);
  });

  it("counts contacts per stage and follow-ups due", () => {
    expect(countByStage(people, TODAY)).toEqual({ all: 4, contacted: 2, call_scheduled: 1, called: 1, due: 2 });
  });
});

describe("parseStage", () => {
  it("accepts labels and enum values, case-insensitively", () => {
    expect(parseStage("Call scheduled")).toBe("call_scheduled");
    expect(parseStage("call_scheduled")).toBe("call_scheduled");
    expect(parseStage(" CALLED ")).toBe("called");
    expect(parseStage("contacted")).toBe("contacted");
    expect(parseStage("maybe")).toBeNull();
    expect(parseStage("")).toBeNull();
  });
});

describe("CSV export", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvField('Say "hi", then\nleave')).toBe('"Say ""hi"", then\nleave"');
    expect(csvField(null)).toBe("");
    expect(toCsv([["a", "b"], ["1", "2"]])).toBe("a,b\r\n1,2\r\n");
  });

  it("neutralizes spreadsheet formulas", () => {
    expect(csvField("=HYPERLINK(\"http://x\")")).toBe("\"'=HYPERLINK(\"\"http://x\"\")\"");
    expect(csvField("+1 555")).toBe("'+1 555");
    expect(csvField("@handle")).toBe("'@handle");
  });

  it("exports contacts with readable stage labels", () => {
    const csv = contactsToCsv([
      contact({ id: "x", company: "Lazard", name: "Eve Li", title: "Analyst", stage: "call_scheduled", follow_up_date: "2026-10-20", notes: "Ask about RX, M&A", linkedin_url: "https://www.linkedin.com/in/eveli" }),
    ]);
    expect(csv).toBe(
      "Company,Name,Title,Stage,Follow-up date,Notes,LinkedIn URL\r\n" +
        'Lazard,Eve Li,Analyst,Call scheduled,2026-10-20,"Ask about RX, M&A",https://www.linkedin.com/in/eveli\r\n',
    );
  });
});

describe("example data", async () => {
  const { addWeekdays, buildExampleData } = await import("@/lib/examples");
  const now = new Date(2026, 9, 9, 9, 0); // Friday, Oct 9 2026
  const data = buildExampleData(now);

  it("is clearly marked and starts in a realistic state", () => {
    expect(data.contacts.every((c) => c.is_example)).toBe(true);
    const due = data.contacts.filter((c) => c.follow_up_date && c.follow_up_date <= "2026-10-09");
    expect(due.length).toBeGreaterThanOrEqual(2); // something overdue and something due today
    // Someone at Call scheduled has no call yet, so "Ready to schedule" isn't empty.
    const booked = new Set(data.calls.map((c) => c.key));
    expect(data.contacts.some((c) => c.stage === "call_scheduled" && !booked.has(c.key))).toBe(true);
  });

  it("books calls on weekdays relative to today", () => {
    for (const c of data.calls) expect([1, 2, 3, 4, 5]).toContain(c.startsAt.getDay());
    expect(addWeekdays(now, 1).getDay()).toBe(1); // Friday + 1 weekday = Monday
    expect(addWeekdays(now, -1).getDay()).toBe(4); // Thursday
  });
});
