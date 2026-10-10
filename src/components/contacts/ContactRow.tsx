"use client";

import { memo } from "react";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { cn } from "@/lib/cn";
import { followUpStatus } from "@/lib/contacts/followup";
import { STAGE_CLASSES, STAGES } from "@/lib/contacts/stages";
import type { Contact, ContactStage } from "@/lib/database.types";
import type { EditableField } from "./columns";

export type RowHandlers = {
  onEdit: (id: string, field: EditableField | "linkedin_url", value: string | null) => void;
  onCommit: (id: string) => void;
  onDelete: (id: string) => void;
  onEditLinkedIn: (id: string) => void;
};

const CELL_INPUT =
  "block h-10 w-full min-w-0 bg-transparent px-3 text-sm text-ink placeholder:text-muted/70 " +
  "focus:bg-surface focus:outline-2 focus:-outline-offset-2 focus:outline-focus";

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4">
      <path
        fill="currentColor"
        d="M13.6 0H2.4A2.4 2.4 0 0 0 0 2.4v11.2A2.4 2.4 0 0 0 2.4 16h11.2a2.4 2.4 0 0 0 2.4-2.4V2.4A2.4 2.4 0 0 0 13.6 0ZM4.9 13.4H2.6V6h2.3v7.4ZM3.7 5a1.3 1.3 0 1 1 0-2.7 1.3 1.3 0 0 1 0 2.7Zm9.7 8.4h-2.3V9.8c0-.9 0-2-1.2-2s-1.4.9-1.4 1.9v3.7H6.2V6h2.2v1h.1c.3-.6 1.1-1.2 2.2-1.2 2.4 0 2.8 1.6 2.8 3.6v4Z"
      />
    </svg>
  );
}

function FollowUpFlag({ status, id }: { status: ReturnType<typeof followUpStatus>; id: string }) {
  if (status !== "overdue" && status !== "today") return null;
  return (
    <span
      id={id}
      className={cn(
        "mr-2 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        status === "overdue" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning",
      )}
    >
      {status === "overdue" ? "Overdue" : "Today"}
    </span>
  );
}

export function ExampleTag() {
  return (
    <span className="mr-2 shrink-0 rounded border border-dashed border-warning/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
      Example
    </span>
  );
}

export const ContactRow = memo(function ContactRow({
  contact,
  rowIndex,
  today,
  handlers,
}: {
  contact: Contact;
  rowIndex: number;
  today: string;
  handlers: RowHandlers;
}) {
  const who = contact.name.trim() || contact.company.trim() || "new contact";
  const status = followUpStatus(contact.follow_up_date, today);
  const flagId = `flag-${contact.id}`;

  const text = (field: "company" | "name" | "title" | "notes", col: number, placeholder: string) => (
    <input
      type="text"
      value={contact[field]}
      onChange={(e) => handlers.onEdit(contact.id, field, e.target.value)}
      onBlur={() => handlers.onCommit(contact.id)}
      aria-label={`${placeholder} for ${who}`}
      placeholder={placeholder}
      data-row={rowIndex}
      data-col={col}
      maxLength={field === "notes" ? 5000 : 300}
      className={CELL_INPUT}
    />
  );

  return (
    <tr
      data-id={contact.id}
      className={cn(
        "group border-b border-rule bg-surface hover:bg-surface-2/60",
        status === "overdue" && "shadow-[inset_3px_0_0_var(--danger)]",
        status === "today" && "shadow-[inset_3px_0_0_var(--warning)]",
      )}
    >
      <td className="border-r border-rule p-0">{text("company", 0, "Company")}</td>
      <td className="border-r border-rule p-0">
        <div className="flex items-center">
          {text("name", 1, "Name")}
          {contact.is_example && <ExampleTag />}
          {contact.linkedin_url && (
            <a
              href={contact.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mr-2 shrink-0 rounded p-1 text-[#0a66c2] hover:bg-surface-2 dark:text-[#70b5f9]"
              aria-label={`Open ${who}'s LinkedIn profile in a new tab`}
              title="LinkedIn profile"
            >
              <LinkedInIcon />
            </a>
          )}
        </div>
      </td>
      <td className="border-r border-rule p-0">{text("title", 2, "Title")}</td>
      <td className="border-r border-rule px-2 py-0">
        <div className="relative">
          <select
            value={contact.stage}
            onChange={(e) => {
              handlers.onEdit(contact.id, "stage", e.target.value as ContactStage);
              handlers.onCommit(contact.id);
            }}
            aria-label={`Stage for ${who}`}
            data-row={rowIndex}
            data-col={3}
            className={cn(
              "h-7 w-full cursor-pointer appearance-none rounded-full border-0 pl-3 pr-7 text-xs font-semibold",
              STAGE_CLASSES[contact.stage],
            )}
          >
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <svg
            viewBox="0 0 10 6"
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 top-1/2 h-1.5 w-2.5 -translate-y-1/2 opacity-70"
          >
            <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      </td>
      <td className="border-r border-rule p-0">
        <div className="flex items-center">
          <input
            type="date"
            value={contact.follow_up_date ?? ""}
            onChange={(e) => handlers.onEdit(contact.id, "follow_up_date", e.target.value || null)}
            onBlur={() => handlers.onCommit(contact.id)}
            aria-label={`Follow-up date for ${who}`}
            aria-describedby={status === "overdue" || status === "today" ? flagId : undefined}
            data-row={rowIndex}
            data-col={4}
            className={cn(CELL_INPUT, "font-mono text-[13px]", !contact.follow_up_date && "text-muted")}
          />
          <FollowUpFlag status={status} id={flagId} />
        </div>
      </td>
      <td className="border-r border-rule p-0">{text("notes", 5, "Notes")}</td>
      <td className="w-12 p-0 text-center">
        <Menu
          buttonLabel={`Actions for ${who}`}
          menuLabel={`Actions for ${who}`}
          buttonClassName="mx-auto flex h-8 w-8 items-center justify-center rounded text-muted hover:bg-surface-2 hover:text-ink"
          buttonContent={<span aria-hidden="true">⋯</span>}
        >
          {(close) => (
            <>
              <MenuItem
                onSelect={() => {
                  close();
                  handlers.onEditLinkedIn(contact.id);
                }}
              >
                {contact.linkedin_url ? "Edit LinkedIn URL" : "Add LinkedIn URL"}
              </MenuItem>
              <MenuItem
                danger
                onSelect={() => {
                  close();
                  handlers.onDelete(contact.id);
                }}
              >
                Delete contact
              </MenuItem>
            </>
          )}
        </Menu>
      </td>
    </tr>
  );
});
