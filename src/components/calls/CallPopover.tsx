"use client";

import Link from "next/link";
import { useId } from "react";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Popover } from "@/components/ui/Popover";
import { callDetails, callTitle, googleCalendarUrl } from "@/lib/calls/gcal";
import { formatCallTime } from "@/lib/calls/schedule";
import { cn } from "@/lib/cn";
import { STAGE_CLASSES, STAGE_LABEL } from "@/lib/contacts/stages";
import type { Call, Contact } from "@/lib/database.types";

export function CallPopover({
  call,
  contact,
  anchor,
  onClose,
  onMarkCalled,
  onReschedule,
  onRemove,
}: {
  call: Call;
  contact: Contact;
  anchor: HTMLElement;
  onClose: () => void;
  onMarkCalled: () => void;
  onReschedule: () => void;
  onRemove: () => void;
}) {
  const titleId = useId();
  const start = new Date(call.starts_at);
  const name = contact.name.trim() || "Unnamed contact";

  return (
    <Popover anchor={anchor} onClose={onClose} labelledBy={titleId}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={titleId} className="truncate font-serif text-lg font-semibold leading-tight">
            {name}
          </h2>
          <p className="truncate text-sm text-muted">
            {[contact.title, contact.company].filter((s) => s.trim()).join(" · ") || "No company yet"}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 -mt-1 rounded px-1.5 py-0.5 text-muted hover:text-ink">
          ✕
        </button>
      </div>

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-muted">When</dt>
        <dd>{formatCallTime(start, call.duration_minutes)}</dd>
        <dt className="text-muted">Stage</dt>
        <dd>
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STAGE_CLASSES[contact.stage])}>
            {STAGE_LABEL[contact.stage]}
          </span>
        </dd>
        {contact.linkedin_url && (
          <>
            <dt className="text-muted">LinkedIn</dt>
            <dd>
              <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-brass underline underline-offset-2">
                View profile
              </a>
            </dd>
          </>
        )}
        {contact.notes.trim() && (
          <>
            <dt className="text-muted">Notes</dt>
            <dd className="line-clamp-3 text-ink-2">{contact.notes}</dd>
          </>
        )}
      </dl>

      <div className="mt-4 flex flex-col gap-2">
        {contact.stage !== "called" && (
          <Button onClick={onMarkCalled} className="w-full">
            ✓ Mark as called
          </Button>
        )}
        <a
          href={googleCalendarUrl({
            title: callTitle(contact),
            start,
            durationMinutes: call.duration_minutes,
            details: callDetails(contact),
          })}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses("secondary", "md", "w-full")}
        >
          Add to Google Calendar
        </a>
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/contacts?focus=${contact.id}`} className={buttonClasses("ghost", "sm")}>
            View in Contacts
          </Link>
          <Button variant="ghost" size="sm" onClick={onReschedule}>
            Change time
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove} className="text-danger">
          Remove from calendar
        </Button>
      </div>
    </Popover>
  );
}
