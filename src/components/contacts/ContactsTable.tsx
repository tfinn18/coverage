"use client";

import { cn } from "@/lib/cn";
import type { SortDir, SortKey } from "@/lib/contacts/view";
import type { Contact } from "@/lib/database.types";
import { COLUMNS } from "./columns";
import { ContactRow, type RowHandlers } from "./ContactRow";

const TEXT_COLUMNS = new Set(["0", "1", "2", "5"]);

/** Spreadsheet keys: Enter / Shift+Enter move down / up a row; arrow keys do the same in text cells; Escape leaves the cell. */
function onGridKeyDown(e: React.KeyboardEvent<HTMLTableSectionElement>) {
  const target = e.target as HTMLElement;
  const row = target.dataset.row;
  const col = target.dataset.col;
  if (row === undefined || col === undefined) return;

  let delta = 0;
  // Enter on a button (e.g. "Open notes") activates it rather than moving down.
  if (e.key === "Enter" && target.tagName !== "SELECT" && target.tagName !== "BUTTON") delta = e.shiftKey ? -1 : 1;
  else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && TEXT_COLUMNS.has(col) && !e.altKey)
    delta = e.key === "ArrowDown" ? 1 : -1;
  else if (e.key === "Escape") {
    target.blur();
    return;
  }
  if (delta === 0) return;

  const next = e.currentTarget.querySelector<HTMLElement>(`[data-row="${Number(row) + delta}"][data-col="${col}"]`);
  if (next) {
    e.preventDefault();
    next.focus();
    if (next instanceof HTMLInputElement && next.type === "text") next.select();
  } else if (e.key === "Enter") {
    e.preventDefault();
    target.blur();
  }
}

export function ContactsTable({
  contacts,
  today,
  sort,
  onSort,
  handlers,
  emptyMessage,
  notesOpenId,
}: {
  contacts: Contact[];
  today: string;
  sort: { key: SortKey; dir: SortDir };
  onSort: (key: SortKey) => void;
  handlers: RowHandlers;
  emptyMessage?: React.ReactNode;
  notesOpenId: string | null;
}) {
  return (
    <div className="relative overflow-x-auto rounded-lg border border-rule bg-surface shadow-[0_1px_0_var(--rule)]">
      <table className="w-full min-w-[1160px] table-fixed border-collapse text-left">
        <caption className="sr-only">
          Contacts. Each cell is editable and saves automatically. Use Tab to move across, Enter to move down.
        </caption>
        <thead className="bg-surface-2">
          <tr className="border-b border-rule-strong">
            {COLUMNS.map((column) => {
              const active = sort.key === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                  className={cn("border-r border-rule p-0 last:border-r-0", column.width)}
                >
                  <button
                    type="button"
                    onClick={() => onSort(column.key)}
                    className="flex h-9 w-full items-center gap-1.5 px-3 text-left font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-ink-2 hover:text-ink"
                  >
                    {column.label}
                    <span aria-hidden="true" className={cn("text-[10px]", active ? "text-brass" : "text-transparent")}>
                      {active && sort.dir === "desc" ? "▼" : "▲"}
                    </span>
                    <span className="sr-only">
                      {active ? `, sorted ${sort.dir === "asc" ? "ascending" : "descending"}. Click to reverse.` : ", click to sort"}
                    </span>
                  </button>
                </th>
              );
            })}
            <th scope="col" className="w-12 p-0">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody onKeyDown={onGridKeyDown}>
          {contacts.map((contact, index) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              rowIndex={index}
              today={today}
              handlers={handlers}
              notesOpen={notesOpenId === contact.id}
            />
          ))}
          {contacts.length === 0 && emptyMessage && (
            <tr>
              <td colSpan={COLUMNS.length + 1} className="px-4 py-10 text-center text-sm text-muted">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-rule bg-surface" aria-hidden="true">
      <div className="h-9 border-b border-rule-strong bg-surface-2" />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex h-10 items-center gap-6 border-b border-rule px-3">
          {[16, 17, 17, 12, 14, 24].map((w, j) => (
            <div key={j} className="h-3 animate-pulse rounded bg-surface-2" style={{ width: `${w - 4}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}
