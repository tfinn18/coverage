import type { ContactStage } from "@/lib/database.types";
import { localDateString } from "@/lib/contacts/followup";
import { notesDocFromText, notesToText, type NotesDoc } from "@/lib/notes/doc";

type ExampleContact = {
  key: string;
  name: string;
  company: string;
  title: string;
  stage: ContactStage;
  /** Days from today, or null for no follow-up. */
  followUp: number | null;
  notes: string;
  /** Book a call this many weekdays from today at hour:minute (negative = in the past). */
  call?: { weekdays: number; hour: number; minute: number };
};

// Fictional people at fictional firms, so nothing here can be mistaken for a real person.
const EXAMPLES: ExampleContact[] = [
  {
    key: "maya",
    name: "Maya Lindqvist",
    company: "Northbridge Capital",
    title: "Investment Banking Analyst",
    stage: "called",
    followUp: -3,
    notes: "Great call about the TMT group. Send a thank-you note.",
    call: { weekdays: -1, hour: 11, minute: 0 },
  },
  {
    key: "daniel",
    name: "Daniel Okafor",
    company: "Halcyon Partners",
    title: "Associate, M&A",
    stage: "call_scheduled",
    followUp: null,
    notes: "Alum from my school. Ask how he recruited from a non-target.",
    call: { weekdays: 1, hour: 10, minute: 0 },
  },
  {
    key: "priya",
    name: "Priya Desai",
    company: "Meridian & Co.",
    title: "Vice President, Healthcare",
    stage: "call_scheduled",
    followUp: null,
    notes: "Referred by Maya.",
    call: { weekdays: 2, hour: 14, minute: 30 },
  },
  {
    key: "sam",
    name: "Sam Whitaker",
    company: "Ashford Lane Advisors",
    title: "Analyst, Restructuring",
    stage: "call_scheduled",
    followUp: 1,
    notes: "Said any afternoon next week works.",
  },
  {
    key: "elena",
    name: "Elena Rossi",
    company: "Kestrel Securities",
    title: "Sales & Trading Analyst",
    stage: "contacted",
    followUp: 0,
    notes: "Emailed after the info session. Follow up today.",
  },
  {
    key: "marcus",
    name: "Marcus Bell",
    company: "Harbor Point Equity",
    title: "Private Equity Associate",
    stage: "contacted",
    followUp: 5,
    notes: "",
  },
  {
    key: "grace",
    name: "Grace Kim",
    company: "Northbridge Capital",
    title: "Campus Recruiting",
    stage: "contacted",
    followUp: null,
    notes: "Met at the career fair booth.",
  },
  {
    key: "omar",
    name: "Omar Haddad",
    company: "Wexford Hill Capital",
    title: "Analyst, Leveraged Finance",
    stage: "call_scheduled",
    followUp: null,
    notes: "Prep two questions about the analyst program.",
    call: { weekdays: 1, hour: 16, minute: 0 },
  },
  {
    key: "leah",
    name: "Leah Brooks",
    company: "Crestline Partners",
    title: "Associate, Equity Research",
    stage: "call_scheduled",
    followUp: null,
    notes: "",
    call: { weekdays: 3, hour: 9, minute: 30 },
  },
  {
    key: "tom",
    name: "Tom Alvarez",
    company: "Summit Ridge Advisors",
    title: "Analyst",
    stage: "called",
    followUp: 14,
    notes: "Check back before superday season.",
    call: { weekdays: -2, hour: 15, minute: 0 },
  },
];

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Moves `count` weekdays from `from` (Mon–Fri only). Negative counts go backwards. */
export function addWeekdays(from: Date, count: number): Date {
  const step = count < 0 ? -1 : 1;
  let d = new Date(from);
  let left = Math.abs(count);
  while (left > 0) {
    d = addDays(d, step);
    if (d.getDay() !== 0 && d.getDay() !== 6) left -= 1;
  }
  return d;
}

export const EXAMPLE_COUNT = EXAMPLES.length;

/** Fuller notes for two examples, so the notes panel shows what a finished page looks like. */
function richNotes(key: string, now: Date): NotesDoc | null {
  if (key === "maya") {
    const doc = notesDocFromText("");
    doc.prep.background = ["Bryant '24, joined the TMT group as a first-year analyst"];
    doc.prep.whyCompany = "Mid-size firm, so analysts get real deal responsibility early.";
    doc.prep.questions = ["What does a typical week look like in TMT?", "How did you prepare for technical interviews?"];
    doc.call.date = localDateString(addWeekdays(now, -1));
    doc.call.keyAdvice = ["Know the three statements cold", "Have a clear story for why banking"];
    doc.call.firm = ["Recently closed two software sell-side deals"];
    doc.call.people = ["Grace Kim (campus recruiting)"];
    doc.call.askedFor = "If she'd pass my resume along before the application deadline.";
    doc.followUp.subject = "Thank you for your time";
    doc.followUp.body =
      "Hi Maya,\n\nThank you for taking the time to talk yesterday. Your advice about the three statements was really helpful.\n\nBest,\n";
    doc.followUp.nextSteps = ["Send resume by Friday", "Follow up after the info session"];
    return doc;
  }
  if (key === "daniel") {
    const doc = notesDocFromText("");
    doc.prep.background = ["Same school, recruited from a non-target", "Moved from Big 4 to M&A"];
    doc.prep.questions = ["How did you network into banking from a non-target?", "What made you switch from accounting?"];
    return doc;
  }
  return null;
}

/** The example contacts and calls, with dates relative to `now` so follow-ups and calls always look current. */
export function buildExampleData(now: Date) {
  const contacts = EXAMPLES.map((e) => {
    const doc = richNotes(e.key, now) ?? (e.notes ? notesDocFromText(e.notes) : null);
    return {
      key: e.key,
      name: e.name,
      company: e.company,
      title: e.title,
      stage: e.stage,
      follow_up_date: e.followUp === null ? null : localDateString(addDays(now, e.followUp)),
      notes: doc ? notesToText(doc, e.company) : "",
      linkedin_url: null,
      is_example: true,
      doc,
    };
  });
  const calls = EXAMPLES.filter((e) => e.call).map((e) => {
    const day = addWeekdays(now, e.call!.weekdays);
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), e.call!.hour, e.call!.minute);
    return { key: e.key, startsAt: start };
  });
  return { contacts, calls };
}
