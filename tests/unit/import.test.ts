import { readFileSync } from "node:fs";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv/parse";
import { candidate, dedupeKey, findDuplicates } from "@/lib/import/candidate";
import { parseDate, parseImportCsv } from "@/lib/import/csv-import";
import { parseLinkedInProfile, splitHeadline } from "@/lib/linkedin/profile-pdf";
import { nameFromLinkedInUrl, normalizeLinkedInUrl } from "@/lib/linkedin/url";
import { extractPdfLines, type PdfJs } from "@/lib/pdf/extract";
import { itemsToLines } from "@/lib/pdf/lines";

const fixture = (name: string) => readFileSync(new URL(`../fixtures/${name}`, import.meta.url));

async function parsePdfFixture(name: string) {
  const { lines, pageWidth } = await extractPdfLines(pdfjs as unknown as PdfJs, new Uint8Array(fixture(name)));
  return parseLinkedInProfile(lines, pageWidth);
}

describe("LinkedIn profile PDF parser", () => {
  it("reads name, current company and title from the Experience section", async () => {
    expect(await parsePdfFixture("linkedin-profile-single-role.pdf")).toEqual({
      name: "Ava Chen",
      company: "Goldman Sachs",
      title: "Investment Banking Analyst",
      linkedin_url: "https://www.linkedin.com/in/ava-chen-8b2a91",
    });
  });

  it("skips the total-tenure line when someone has several roles at one company", async () => {
    expect(await parsePdfFixture("linkedin-profile-multi-role.pdf")).toEqual({
      name: "Marcus O'Neill",
      company: "Morgan Stanley",
      title: "Vice President, M&A",
      linkedin_url: "https://www.linkedin.com/in/marcusoneill",
    });
  });

  it("falls back to the headline when there is no Experience section", async () => {
    expect(await parsePdfFixture("linkedin-profile-headline-only.pdf")).toEqual({
      name: "Priya Raman",
      company: "Bryant University",
      title: "Finance Student",
      linkedin_url: "https://www.linkedin.com/in/priya-raman-2027",
    });
  });

  it("rejects files that aren't PDFs", async () => {
    await expect(
      extractPdfLines(pdfjs as unknown as PdfJs, new TextEncoder().encode("not a pdf")),
    ).rejects.toThrow();
  });

  it("joins text items on the same baseline into one line", () => {
    const item = (str: string, x: number, y: number, size = 10, width = str.length * 5) => ({
      str,
      transform: [size, 0, 0, size, x, y],
      width,
    });
    const lines = itemsToLines([item("Chen", 255, 700), item("Ava", 220, 700), item("Analyst", 220, 680)], 1, 792);
    expect(lines.map((l) => l.text)).toEqual(["Ava Chen", "Analyst"]);
  });

  it("splits headlines into title and company", () => {
    expect(splitHeadline("Analyst at Goldman Sachs")).toEqual({ title: "Analyst", company: "Goldman Sachs" });
    expect(splitHeadline("VP, M&A | Morgan Stanley | Ex-Lazard")).toEqual({ title: "VP, M&A", company: "Morgan Stanley" });
    expect(splitHeadline("Aspiring banker")).toEqual({ title: "Aspiring banker", company: "" });
  });
});

describe("CSV parser", () => {
  it("handles quotes, escaped quotes, embedded commas and newlines, CRLF and BOM", () => {
    expect(parseCsv('﻿a,b,c\r\n"x, y","say ""hi""","line1\nline2"\r\n\r\nlast,,\n')).toEqual([
      ["a", "b", "c"],
      ["x, y", 'say "hi"', "line1\nline2"],
      ["last", "", ""],
    ]);
  });

  it("parses thousands of rows quickly", () => {
    const rows = Array.from({ length: 3000 }, (_, i) => `First${i},Last${i},https://www.linkedin.com/in/p${i},,"Co, ${i}",Analyst,01 Jan 2026`);
    const text = "Notes:\nsome note\n\nFirst Name,Last Name,URL,Email Address,Company,Position,Connected On\n" + rows.join("\n");
    const start = performance.now();
    const result = parseImportCsv(text);
    expect(performance.now() - start).toBeLessThan(500);
    expect(result.ok && result.candidates.length).toBe(3000);
    expect(result.ok && result.candidates[2999].company).toBe("Co, 2999");
  });
});

describe("Connections.csv import", () => {
  const result = parseImportCsv(fixture("Connections.csv").toString("utf8"));

  it("skips LinkedIn's notes lines and maps the columns", () => {
    expect(result.ok && result.kind).toBe("linkedin");
    if (!result.ok) return;
    expect(result.candidates).toHaveLength(6);
    expect(result.candidates[1]).toMatchObject({
      name: "Marcus O'Neill",
      company: "Morgan Stanley",
      title: "Vice President, M&A",
      linkedin_url: "https://www.linkedin.com/in/marcusoneill",
    });
    expect(result.candidates[3].title).toBe('Student, "Finance Society" President');
    expect(result.candidates[2].name).toBe("José Álvarez");
  });

  it("starts every LinkedIn import at Contacted with blank follow-up and notes", () => {
    if (!result.ok) throw new Error(result.error);
    for (const c of result.candidates) {
      expect(c.stage).toBe("contacted");
      expect(c.follow_up_date).toBeNull();
      expect(c.notes).toBe("");
    }
  });
});

describe("tracker CSV import", () => {
  const result = parseImportCsv(fixture("tracker.csv").toString("utf8"));

  it("maps Company/Name/Title/Stage/Follow-up/Notes and skips empty rows", () => {
    expect(result.ok && result.kind).toBe("tracker");
    if (!result.ok) return;
    expect(result.candidates.map((c) => c.name)).toEqual(["Ben Ortiz", "Dan Kim", "Sara Wolfe", "Tom Reyes"]);
    expect(result.candidates[0]).toMatchObject({
      company: "Evercore",
      stage: "call_scheduled",
      follow_up_date: "2026-10-20",
      notes: "Met at info session, asked about RX",
    });
    expect(result.candidates[1]).toMatchObject({ stage: "called", follow_up_date: "2026-11-02", notes: "Line one\nline two" });
  });

  it("falls back to Contacted and no date for values it can't read", () => {
    if (!result.ok) return;
    expect(result.candidates[3]).toMatchObject({ stage: "contacted", follow_up_date: null });
  });

  it("round-trips Coverage's own CSV export", () => {
    const exported =
      "Company,Name,Title,Stage,Follow-up date,Notes,LinkedIn URL\r\n" +
      'Lazard,Eve Li,Analyst,Call scheduled,2026-10-20,"Ask about RX, M&A",https://www.linkedin.com/in/eveli\r\n';
    const r = parseImportCsv(exported);
    expect(r.ok && r.candidates[0]).toMatchObject({
      company: "Lazard",
      name: "Eve Li",
      stage: "call_scheduled",
      follow_up_date: "2026-10-20",
      notes: "Ask about RX, M&A",
      linkedin_url: "https://www.linkedin.com/in/eveli",
    });
  });

  it("explains what's wrong with files it can't use", () => {
    expect(parseImportCsv("")).toEqual({ ok: false, error: "That file is empty." });
    const noName = parseImportCsv("Foo,Bar\n1,2\n");
    expect(noName.ok).toBe(false);
  });

  it("parses US and ISO dates and rejects impossible ones", () => {
    expect(parseDate("10/9/26")).toBe("2026-10-09");
    expect(parseDate("2026-02-28")).toBe("2026-02-28");
    expect(parseDate("2026-02-30")).toBeNull();
    expect(parseDate("next week")).toBeNull();
  });
});

describe("profile URL import", () => {
  it("normalizes LinkedIn profile URLs", () => {
    expect(normalizeLinkedInUrl("linkedin.com/in/ava-chen/")).toBe("https://www.linkedin.com/in/ava-chen");
    expect(normalizeLinkedInUrl("https://uk.linkedin.com/in/ava-chen?trk=abc")).toBe("https://www.linkedin.com/in/ava-chen");
    expect(normalizeLinkedInUrl("https://www.linkedin.com/company/goldman-sachs")).toBeNull();
    expect(normalizeLinkedInUrl("https://evil.com/in/ava")).toBeNull();
    expect(normalizeLinkedInUrl("https://linkedin.com.evil.com/in/ava")).toBeNull();
  });

  it("guesses a name from the slug only", () => {
    expect(nameFromLinkedInUrl("https://www.linkedin.com/in/ava-chen-8b2a91")).toBe("Ava Chen");
    expect(nameFromLinkedInUrl("linkedin.com/in/marcusoneill")).toBe("Marcusoneill");
    expect(nameFromLinkedInUrl("https://www.linkedin.com/in/jos%C3%A9-%C3%A1lvarez-123")).toBe("José Álvarez");
    expect(nameFromLinkedInUrl("not a url")).toBe("");
  });
});

describe("duplicate detection", () => {
  it("matches on name + company, ignoring case, accents and punctuation", () => {
    expect(dedupeKey({ name: "José  Álvarez", company: "Lazard, Inc." })).toBe(dedupeKey({ name: "jose alvarez", company: "LAZARD INC" }));
  });

  it("flags duplicates of existing contacts and repeats within the batch", () => {
    const a = candidate({ name: "Ava Chen", company: "Goldman Sachs" });
    const b = candidate({ name: "Ben Ortiz", company: "Evercore" });
    const c = candidate({ name: "ava chen", company: "goldman sachs" });
    const d = candidate({ name: "", company: "" });
    const e = candidate({ name: "", company: "" });
    const dupes = findDuplicates([a, b, c, d, e], [{ name: "Ben Ortiz", company: "Evercore" }]);
    expect(Object.fromEntries(dupes)).toEqual({ [b.key]: "existing", [c.key]: "batch" });
  });
});
