import type { PdfLine } from "@/lib/pdf/lines";
import { normalizeLinkedInUrl } from "./url";

export type ParsedProfile = {
  name: string;
  company: string;
  title: string;
  linkedin_url: string | null;
};

const DURATION = /^(\d+\s+years?)?\s*(\d+\s+months?)?$/i;
const DATE_RANGE = /^(?:[A-Z][a-z]+\s+)?\d{4}\s*[-–]\s*(?:Present|(?:[A-Z][a-z]+\s+)?\d{4})/;
const SECTION_HEADINGS = new Set([
  "Summary",
  "Experience",
  "Education",
  "Licenses & Certifications",
  "Certifications",
  "Volunteer Experience",
  "Honors-Awards",
  "Publications",
  "Projects",
  "Languages",
  "Top Skills",
  "Contact",
  "Skills",
]);

function isDuration(text: string) {
  return text.trim() !== "" && DURATION.test(text.trim());
}

/** Splits a headline like "Analyst at Goldman Sachs" or "VP, M&A | Morgan Stanley" into title and company. */
export function splitHeadline(headline: string): { title: string; company: string } {
  const text = headline.trim();
  const at = text.match(/^(.*?)\s+(?:at|@)\s+(.+)$/i);
  if (at) return { title: at[1].trim(), company: at[2].split(/\s+[|·•]\s+/)[0].trim() };
  const bar = text.split(/\s+[|·•]\s+/);
  if (bar.length >= 2) return { title: bar[0].trim(), company: bar[1].trim() };
  return { title: text, company: "" };
}

/** Finds the profile URL in the sidebar. LinkedIn often wraps it across two lines before "(LinkedIn)". */
function findProfileUrl(lines: PdfLine[]): string | null {
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i].text;
    if (!/linkedin\.com\/in\//i.test(text)) continue;
    let joined = text;
    for (let j = i + 1; j < Math.min(i + 3, lines.length) && !/\(LinkedIn\)/i.test(joined); j++) {
      joined += lines[j].text;
    }
    const match = joined.replace(/\s*\(LinkedIn\).*/i, "").match(/(?:https?:\/\/)?(?:[\w-]+\.)?linkedin\.com\/in\/[^\s)]+/i);
    if (match) return normalizeLinkedInUrl(match[0]);
  }
  return null;
}

/**
 * Extracts name, current company and current title from the text of a LinkedIn "Save to PDF" profile.
 *
 * Layout: a left sidebar (Contact, Top Skills…) and a main column with the name in the largest type,
 * then the headline, location, and sections. The first entry under "Experience" is the current job:
 * company, then title (or a total-tenure line like "6 years 2 months" when there are several roles).
 * Falls back to the headline ("Title at Company") when there's no Experience section.
 */
export function parseLinkedInProfile(allLines: PdfLine[], pageWidth = 612): ParsedProfile {
  const lines = allLines.filter((l) => !/^Page \d+ of \d+$/i.test(l.text));
  const firstPage = lines.filter((l) => l.page === 1);
  const sidebarEdge = pageWidth * 0.3;
  const main = lines.filter((l) => l.x >= sidebarEdge);
  const mainFirst = firstPage.filter((l) => l.x >= sidebarEdge);

  // Name: the largest text in the main column of page 1.
  const nameLine = mainFirst.reduce<PdfLine | null>((best, l) => (!best || l.size > best.size ? l : best), null);
  const name = nameLine?.text ?? "";

  let company = "";
  let title = "";

  const expIndex = main.findIndex((l) => l.text === "Experience");
  if (expIndex !== -1) {
    const entries = main.slice(expIndex + 1).filter((l) => l.text !== "");
    const end = entries.findIndex((l) => SECTION_HEADINGS.has(l.text));
    const section = end === -1 ? entries : entries.slice(0, end);
    if (section.length > 0) {
      company = section[0].text;
      const rest = section.slice(1);
      const titleLine = isDuration(rest[0]?.text ?? "") ? rest[1] : rest[0];
      if (titleLine && !DATE_RANGE.test(titleLine.text)) title = titleLine.text;
    }
  }

  if (!company || !title) {
    // Headline sits right below the name.
    const nameIndex = nameLine ? main.indexOf(nameLine) : -1;
    const headline = nameIndex >= 0 ? main[nameIndex + 1]?.text : undefined;
    if (headline && !SECTION_HEADINGS.has(headline)) {
      const fromHeadline = splitHeadline(headline);
      company ||= fromHeadline.company;
      title ||= fromHeadline.title;
    }
  }

  const sidebar = lines.filter((l) => l.x < sidebarEdge);
  return { name, company, title, linkedin_url: findProfileUrl(sidebar) ?? findProfileUrl(lines) };
}
