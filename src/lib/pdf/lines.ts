/** The parts of a pdf.js TextItem we use. transform = [scaleX, skewY, skewX, scaleY, x, y]. */
export type PdfTextItem = { str: string; transform: number[]; width: number };

export type PdfLine = {
  text: string;
  /** Font size in points. */
  size: number;
  /** Left edge, in points from the left of the page. */
  x: number;
  /** Baseline, in points from the top of the page (grows downward, like reading order). */
  top: number;
  page: number;
};

/**
 * Groups a page's text items into visual lines: items on the same baseline in the same column
 * are joined left to right. Lines come back in reading order (top to bottom, then left to right).
 */
export function itemsToLines(items: PdfTextItem[], page: number, pageHeight: number, columnGap = 40): PdfLine[] {
  const pieces = items
    .filter((it) => it.str.trim() !== "")
    .map((it) => ({
      text: it.str,
      size: Math.round(Math.hypot(it.transform[2], it.transform[3]) * 100) / 100,
      x: it.transform[4],
      right: it.transform[4] + it.width,
      top: pageHeight - it.transform[5],
    }))
    .sort((a, b) => a.top - b.top || a.x - b.x);

  const lines: (PdfLine & { right: number })[] = [];
  for (const piece of pieces) {
    const line = lines.find(
      (l) => Math.abs(l.top - piece.top) <= 2 && piece.x >= l.x && piece.x - l.right < columnGap,
    );
    if (line) {
      const needsSpace = piece.x - line.right > 1 && !line.text.endsWith(" ") && !piece.text.startsWith(" ");
      line.text += (needsSpace ? " " : "") + piece.text;
      line.right = Math.max(line.right, piece.right);
      line.size = Math.max(line.size, piece.size);
    } else {
      lines.push({ ...piece, page });
    }
  }
  return lines
    .map(({ right: _right, ...line }) => ({ ...line, text: line.text.replace(/\s+/g, " ").trim() }))
    .sort((a, b) => a.top - b.top || a.x - b.x);
}
