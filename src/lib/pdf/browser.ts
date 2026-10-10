import type { PdfJs } from "./extract";

let loading: Promise<PdfJs> | undefined;

/** Loads pdf.js on demand (it's large), using the worker copied to /public by scripts/copy-pdf-worker.mjs. */
export function loadPdfJs(): Promise<PdfJs> {
  loading ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    return pdfjs as unknown as PdfJs;
  });
  return loading;
}
