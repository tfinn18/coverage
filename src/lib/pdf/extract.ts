import { itemsToLines, type PdfLine, type PdfTextItem } from "./lines";

/** The slice of the pdf.js API we use, so the browser and Node tests can each pass their own build. */
export type PdfJs = {
  getDocument: (src: { data: Uint8Array; isEvalSupported?: boolean; verbosity?: number }) => {
    promise: Promise<{
      numPages: number;
      getPage: (n: number) => Promise<{
        getViewport: (o: { scale: number }) => { width: number; height: number };
        getTextContent: () => Promise<{ items: unknown[] }>;
      }>;
    }>;
    destroy: () => Promise<void>;
  };
};

export const MAX_PDF_BYTES = 8 * 1024 * 1024;

/** Reads the text lines from the first `maxPages` pages of a PDF. Runs entirely in the browser. */
export async function extractPdfLines(pdfjs: PdfJs, data: ArrayBuffer | Uint8Array, maxPages = 2) {
  const task = pdfjs.getDocument({
    data: data instanceof Uint8Array ? data : new Uint8Array(data),
    isEvalSupported: false,
    verbosity: 0,
  });
  try {
    const doc = await task.promise;
    const lines: PdfLine[] = [];
    let pageWidth = 612;
    for (let n = 1; n <= Math.min(doc.numPages, maxPages); n++) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: 1 });
      if (n === 1) pageWidth = viewport.width;
      const content = await page.getTextContent();
      const items = content.items.filter((it): it is PdfTextItem => typeof (it as PdfTextItem).str === "string");
      lines.push(...itemsToLines(items, n, viewport.height));
    }
    return { lines, pageWidth };
  } finally {
    await task.destroy();
  }
}
