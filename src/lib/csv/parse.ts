/**
 * Parses CSV text (RFC 4180): quoted fields, escaped quotes (""), commas and newlines inside quotes,
 * CRLF or LF line endings, and a leading UTF-8 BOM. Returns rows of raw string fields.
 * Single pass, so 1,000+ row files parse in milliseconds.
 */
export function parseCsv(text: string): string[][] {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < input.length) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
      } else {
        field += ch;
      }
      i += 1;
      continue;
    }
    if (ch === '"' && field === "") inQuotes = true;
    else if (ch === ",") endField();
    else if (ch === "\n") endRow();
    else if (ch === "\r") {
      endRow();
      if (input[i + 1] === "\n") i += 1;
    } else field += ch;
    i += 1;
  }
  if (field !== "" || row.length > 0) endRow();

  // Drop completely empty lines (e.g. blank lines between the notes and the header).
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}
