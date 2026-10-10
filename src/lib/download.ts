/** Saves text as a file in the browser. CSVs get a UTF-8 BOM so Excel shows accented names correctly. */
export function downloadText(filename: string, text: string, type = "text/csv;charset=utf-8") {
  const bom = type.startsWith("text/csv") ? "﻿" : "";
  const url = URL.createObjectURL(new Blob([bom + text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
