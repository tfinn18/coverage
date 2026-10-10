// Generates small PDFs that mimic the layout of LinkedIn's "More > Save to PDF" profile export:
// a narrow left sidebar (Contact, Top Skills) and a main column with the name in large type,
// headline, location, and an Experience section. Used as fixtures for the PDF parser tests.
// Run: node scripts/make-pdf-fixtures.mjs
import { writeFileSync } from "node:fs";

const PAGE = { w: 612, h: 792 };

function pdfString(text) {
  return `(${text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")})`;
}

/** lines: [{ text, x, y, size, bold? }] per page */
function buildPdf(pages) {
  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };
  const catalogId = add(null);
  const pagesId = add(null);
  const fontRegular = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const fontBold = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  const pageIds = [];
  for (const lines of pages) {
    const stream = lines
      .map((l) => `BT /${l.bold ? "F2" : "F1"} ${l.size} Tf ${l.x} ${l.y} Td ${pdfString(l.text)} Tj ET`)
      .join("\n");
    const contentId = add(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
    pageIds.push(
      add(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE.w} ${PAGE.h}] ` +
          `/Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentId} 0 R >>`,
      ),
    );
  }
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let out = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

/** Lays out a LinkedIn-style profile. */
function profile({ name, headline, location, url, skills, summary, experience, education }) {
  const side = [];
  const main = [];
  let sy = 740;
  const sideLine = (text, size = 10, bold = false, gap = 14) => {
    side.push({ text, x: 30, y: sy, size, bold });
    sy -= gap;
  };
  sideLine("Contact", 13, true, 20);
  for (const part of url) sideLine(part, 10);
  sy -= 10;
  sideLine("Top Skills", 13, true, 20);
  for (const s of skills) sideLine(s, 10);

  let my = 740;
  const mainLine = (text, size, bold = false, gap) => {
    main.push({ text, x: 220, y: my, size, bold });
    my -= gap ?? Math.round(size * 1.6);
  };
  mainLine(name, 26, false, 34);
  mainLine(headline, 12, false, 18);
  mainLine(location, 10, false, 30);
  if (summary) {
    mainLine("Summary", 15.75, false, 22);
    for (const s of summary) mainLine(s, 10.5, false, 15);
    my -= 12;
  }
  if (experience) {
    mainLine("Experience", 15.75, false, 24);
    for (const job of experience) {
      mainLine(job.company, 12, true, 17);
      if (job.total) mainLine(job.total, 10.5, false, 15);
      for (const role of job.roles) {
        mainLine(role.title, 11.5, false, 16);
        mainLine(role.dates, 10.5, false, 15);
        if (role.place) mainLine(role.place, 10.5, false, 22);
        else my -= 7;
      }
    }
  }
  if (education) {
    mainLine("Education", 15.75, false, 24);
    for (const e of education) {
      mainLine(e.school, 12, true, 17);
      mainLine(e.detail, 10.5, false, 22);
    }
  }
  // Like the real export, the sidebar is drawn after the main column in the content stream.
  return [[...main, ...side]];
}

const fixtures = {
  "linkedin-profile-single-role.pdf": profile({
    name: "Ava Chen",
    headline: "Investment Banking Analyst at Goldman Sachs",
    location: "New York, New York, United States",
    url: ["www.linkedin.com/in/ava-chen-", "8b2a91 (LinkedIn)"],
    skills: ["Financial Modeling", "Valuation", "Excel"],
    summary: ["Analyst in the TMT group. Bryant University alum."],
    experience: [
      {
        company: "Goldman Sachs",
        roles: [{ title: "Investment Banking Analyst", dates: "July 2025 - Present (1 year 4 months)", place: "New York, New York" }],
      },
      {
        company: "Bryant University",
        roles: [{ title: "Teaching Assistant, Finance", dates: "January 2024 - May 2025 (1 year 5 months)" }],
      },
    ],
    education: [{ school: "Bryant University", detail: "Bachelor of Science, Finance · (2021 - 2025)" }],
  }),
  "linkedin-profile-multi-role.pdf": profile({
    name: "Marcus O'Neill",
    headline: "Vice President, M&A | Morgan Stanley",
    location: "Boston, Massachusetts, United States",
    url: ["www.linkedin.com/in/marcusoneill (LinkedIn)"],
    skills: ["Mergers & Acquisitions", "Due Diligence"],
    experience: [
      {
        company: "Morgan Stanley",
        total: "6 years 2 months",
        roles: [
          { title: "Vice President, M&A", dates: "January 2024 - Present (2 years 10 months)", place: "Boston, Massachusetts" },
          { title: "Associate", dates: "September 2020 - December 2023 (3 years 4 months)" },
        ],
      },
    ],
  }),
  "linkedin-profile-headline-only.pdf": profile({
    name: "Priya Raman",
    headline: "Finance Student at Bryant University",
    location: "Smithfield, Rhode Island, United States",
    url: ["www.linkedin.com/in/priya-raman-2027 (LinkedIn)"],
    skills: ["Excel"],
    summary: ["Sophomore studying finance, recruiting for 2027 internships."],
  }),
};

for (const [file, pages] of Object.entries(fixtures)) {
  writeFileSync(new URL(`../tests/fixtures/${file}`, import.meta.url), buildPdf(pages));
  console.log("wrote tests/fixtures/" + file);
}
