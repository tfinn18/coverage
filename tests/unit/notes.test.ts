import { describe, expect, it } from "vitest";
import {
  emptyNotesDoc,
  gmailComposeUrl,
  isValidEmail,
  mailtoUrl,
  mergeWithPrevious,
  notesDocFromText,
  notesToText,
  parseNotesDoc,
  pasteItems,
  setItem,
  splitItem,
  thankYouText,
} from "@/lib/notes/doc";

describe("notes document", () => {
  it("starts completely empty", () => {
    const doc = emptyNotesDoc();
    expect(doc.v).toBe(2);
    expect(doc.prep).toEqual({ background: [], questions: [] });
    expect(doc.call).toEqual({ date: null, notes: [], whyCompany: "", people: [] });
    expect(doc.followUp).toEqual({ subject: "", body: "", sentOn: null, nextSteps: [] });
  });

  it("fills in missing or malformed fields when reading stored JSON", () => {
    expect(parseNotesDoc(null)).toEqual(emptyNotesDoc());
    expect(parseNotesDoc("nonsense")).toEqual(emptyNotesDoc());
    const doc = parseNotesDoc({
      prep: { questions: ["How did you recruit?", 42, null] },
      call: { date: "Oct 1", notes: ["Network early"], whyCompany: 7 },
      followUp: { sentOn: "2026-10-10" },
    });
    expect(doc.prep.questions).toEqual(["How did you recruit?"]);
    expect(doc.call.whyCompany).toBe("");
    expect(doc.call.date).toBeNull();
    expect(doc.call.notes).toEqual(["Network early"]);
    expect(doc.followUp.sentOn).toBe("2026-10-10");
  });

  it("moves removed fields from the old layout into Notes and Call notes, losing nothing", () => {
    const old = {
      v: 1,
      prep: { background: ["Ex-consultant"], whyCompany: "Great healthcare group", questions: ["Typical week?"] },
      call: {
        date: "2026-10-08",
        keyAdvice: ["Know the three statements"],
        firm: ["Two sell-side deals closed"],
        people: ["Grace Kim"],
        askedFor: "Resume referral\nIntro to the group head",
      },
      followUp: { subject: "Thanks", body: "Hi", sentOn: null, nextSteps: ["Send resume"] },
    };
    expect(parseNotesDoc(old)).toEqual({
      v: 2,
      prep: { background: ["Ex-consultant"], questions: ["Typical week?"] },
      call: {
        date: "2026-10-08",
        notes: ["Know the three statements", "Two sell-side deals closed", "Resume referral", "Intro to the group head"],
        whyCompany: "Great healthcare group",
        people: ["Grace Kim"],
      },
      followUp: { subject: "Thanks", body: "Hi", sentOn: null, nextSteps: ["Send resume"] },
    });
  });

  it("keeps both answers if Why [company]? was filled in both places", () => {
    const doc = parseNotesDoc({ prep: { whyCompany: "Old answer" }, call: { whyCompany: "New answer" } });
    expect(doc.call.whyCompany).toBe("New answer\n\nOld answer");
  });

  it("is stable: reading a converted document again changes nothing", () => {
    const once = parseNotesDoc({ call: { keyAdvice: ["A"], notes: ["B"] } });
    expect(parseNotesDoc(JSON.parse(JSON.stringify(once)))).toEqual(once);
  });

  it("turns old free-text notes into Notes bullets, one per line", () => {
    const doc = notesDocFromText("Met at info session\r\n\n  Ask about RX  \n");
    expect(doc.call.notes).toEqual(["Met at info session", "Ask about RX"]);
    expect(doc.prep.questions).toEqual([]);
  });
});

describe("plain-text copy for search, preview and export", () => {
  it("lists the most useful sections first and skips empty ones", () => {
    const doc = emptyNotesDoc();
    doc.prep.questions = ["Typical week?", "", "How to stand out?"];
    doc.call.whyCompany = "Strong healthcare group";
    doc.call.notes = ["Learn the 3 statements", " "];
    doc.call.date = "2026-10-08";
    doc.followUp.sentOn = "2026-10-09";
    expect(notesToText(doc, "Meridian & Co.")).toBe(
      [
        "Notes: Learn the 3 statements",
        "Why Meridian & Co.?: Strong healthcare group",
        "Call date: 2026-10-08",
        "My questions: 1. Typical week? 2. How to stand out?",
        "Thank-you sent: 2026-10-09",
      ].join("\n"),
    );
  });

  it("is empty for an empty document", () => {
    expect(notesToText(emptyNotesDoc(), "Lazard")).toBe("");
  });
});

describe("thank-you email", () => {
  it("copies subject and body together", () => {
    expect(thankYouText("Thank you!", "Hi Ava,\n\nThanks for your time.")).toBe(
      "Subject: Thank you!\n\nHi Ava,\n\nThanks for your time.",
    );
    expect(thankYouText("", "Just a body")).toBe("Just a body");
  });

  it("builds a mailto link with the address, subject and body encoded", () => {
    expect(mailtoUrl("ava.chen+recruiting@example.com", "Thanks & next steps", "Hi Ava,\nThank you!")).toBe(
      "mailto:ava.chen%2Brecruiting@example.com?subject=Thanks%20%26%20next%20steps&body=Hi%20Ava%2C%0D%0AThank%20you!",
    );
    expect(mailtoUrl(null, "Hi", "")).toBe("mailto:?subject=Hi");
    expect(mailtoUrl("", "", "")).toBe("mailto:");
  });

  it("builds a Gmail compose link with to, subject and body URL-encoded", () => {
    const url = gmailComposeUrl("ava.chen+recruiting@example.com", "Thanks & next steps", "Hi Ava,\nThank you!");
    expect(url).toBe(
      "https://mail.google.com/mail/?view=cm&fs=1&to=ava.chen%2Brecruiting%40example.com" +
        "&su=Thanks%20%26%20next%20steps&body=Hi%20Ava%2C%0AThank%20you!",
    );
    const parsed = new URL(url);
    expect(parsed.searchParams.get("to")).toBe("ava.chen+recruiting@example.com");
    expect(parsed.searchParams.get("su")).toBe("Thanks & next steps");
    expect(parsed.searchParams.get("body")).toBe("Hi Ava,\nThank you!");
    expect(gmailComposeUrl(null, "", "")).toBe("https://mail.google.com/mail/?view=cm&fs=1&to=&su=&body=");
  });

  it("validates the optional email address loosely", () => {
    expect(isValidEmail("ava@example.com")).toBe(true);
    expect(isValidEmail(" ava@example.co.uk ")).toBe(true);
    expect(isValidEmail("ava@example")).toBe(false);
    expect(isValidEmail("ava example@x.com")).toBe(false);
  });
});

describe("list editing", () => {
  it("Enter splits the item at the cursor into two", () => {
    expect(splitItem(["Ask about deals"], 0, 15)).toEqual(["Ask about deals", ""]);
    expect(splitItem(["Ask about deals"], 0, 9)).toEqual(["Ask about", " deals"]);
    expect(splitItem(["a", "b", "c"], 1, 1)).toEqual(["a", "b", "", "c"]);
  });

  it("Backspace at the start merges an item into the one above", () => {
    expect(mergeWithPrevious(["a", "", "c"], 1)).toEqual(["a", "c"]);
    expect(mergeWithPrevious(["one", "two"], 1)).toEqual(["onetwo"]);
    expect(mergeWithPrevious(["only"], 0)).toEqual(["only"]);
  });

  it("typing into an empty list creates its first item", () => {
    expect(setItem([], 0, "First")).toEqual(["First"]);
    expect(setItem(["a", "b"], 1, "B")).toEqual(["a", "B"]);
  });
});

describe("pasting a list", () => {
  it("splits pasted lines into separate items and strips numbers and bullets", () => {
    const pasted = "1. What does your day look like?\n2) How did you get into IB?\n- Why Citi?\n\n• Any advice?";
    const result = pasteItems([""], 0, 0, 0, pasted);
    expect(result?.items).toEqual([
      "What does your day look like?",
      "How did you get into IB?",
      "Why Citi?",
      "Any advice?",
    ]);
    expect(result?.focusIndex).toBe(3);
    expect(result?.caret).toBe("Any advice?".length);
  });

  it("keeps text around the cursor and the other items", () => {
    const result = pasteItems(["a", "start end", "z"], 1, 6, 6, "one\ntwo");
    expect(result?.items).toEqual(["a", "start one", "twoend", "z"]);
    expect(result?.focusIndex).toBe(2);
    expect(result?.caret).toBe(3);
  });

  it("leaves a single line to the browser", () => {
    expect(pasteItems([""], 0, 0, 0, "just one question")).toBeNull();
    expect(pasteItems([""], 0, 0, 0, "1. just one question\n")).toBeNull();
  });
});
