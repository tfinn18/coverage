import { describe, expect, it } from "vitest";
import {
  emptyNotesDoc,
  isValidEmail,
  mailtoUrl,
  mergeWithPrevious,
  notesDocFromText,
  notesToText,
  parseNotesDoc,
  setItem,
  splitItem,
  thankYouText,
} from "@/lib/notes/doc";

describe("notes document", () => {
  it("starts completely empty", () => {
    const doc = emptyNotesDoc();
    expect(doc.prep).toEqual({ background: [], whyCompany: "", questions: [] });
    expect(doc.call).toEqual({ date: null, keyAdvice: [], firm: [], people: [], askedFor: "" });
    expect(doc.followUp).toEqual({ subject: "", body: "", sentOn: null, nextSteps: [] });
  });

  it("fills in missing or malformed fields when reading stored JSON", () => {
    expect(parseNotesDoc(null)).toEqual(emptyNotesDoc());
    expect(parseNotesDoc("nonsense")).toEqual(emptyNotesDoc());
    const doc = parseNotesDoc({
      prep: { questions: ["How did you recruit?", 42, null], whyCompany: 7 },
      call: { date: "Oct 1", keyAdvice: ["Network early"] },
      followUp: { sentOn: "2026-10-10" },
    });
    expect(doc.prep.questions).toEqual(["How did you recruit?"]);
    expect(doc.prep.whyCompany).toBe("");
    expect(doc.call.date).toBeNull();
    expect(doc.call.keyAdvice).toEqual(["Network early"]);
    expect(doc.followUp.sentOn).toBe("2026-10-10");
  });

  it("moves old free-text notes into Key advice bullets, one per line", () => {
    const doc = notesDocFromText("Met at info session\r\n\n  Ask about RX  \n");
    expect(doc.call.keyAdvice).toEqual(["Met at info session", "Ask about RX"]);
    expect(doc.prep.questions).toEqual([]);
  });
});

describe("plain-text copy for search, preview and export", () => {
  it("lists the most useful sections first and skips empty ones", () => {
    const doc = emptyNotesDoc();
    doc.prep.questions = ["Typical week?", "", "How to stand out?"];
    doc.prep.whyCompany = "Strong healthcare group";
    doc.call.keyAdvice = ["Learn the 3 statements", " "];
    doc.call.date = "2026-10-08";
    doc.followUp.sentOn = "2026-10-09";
    expect(notesToText(doc, "Meridian & Co.")).toBe(
      [
        "Key advice: Learn the 3 statements",
        "Call date: 2026-10-08",
        "Why Meridian & Co.?: Strong healthcare group",
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
