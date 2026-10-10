// Copies pdf.js's worker into public/ so the browser can load it from /pdf.worker.min.mjs.
// Runs before `dev` and `build`, so the worker always matches the installed pdfjs-dist version.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const src = require.resolve("pdfjs-dist/build/pdf.worker.min.mjs");
mkdirSync(new URL("../public/", import.meta.url), { recursive: true });
copyFileSync(src, new URL("../public/pdf.worker.min.mjs", import.meta.url));
