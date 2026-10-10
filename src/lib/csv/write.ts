/**
 * Escapes one CSV field (RFC 4180). Also neutralizes spreadsheet formula injection:
 * values starting with = + - @ (or tab/CR) get a leading apostrophe so Excel/Sheets
 * treat them as text instead of running them.
 */
export function csvField(value: string | number | null | undefined): string {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((row) => row.map(csvField).join(",")).join("\r\n") + "\r\n";
}
