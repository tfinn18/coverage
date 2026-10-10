"use client";

import type { EventClickArg, EventContentArg, EventDropArg, EventInput } from "@fullcalendar/core";
import interactionPlugin, { type DateClickArg, type DropArg } from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useEffect, useRef } from "react";

export type CalendarEvent = EventInput & { id: string; extendedProps: { company: string; stage: string; example: boolean } };

type Props = {
  events: CalendarEvent[];
  narrow: boolean;
  armed: boolean;
  onDropContact: (contactId: string, start: Date) => void;
  onMoveCall: (callId: string, start: Date, revert: () => void) => void;
  onOpenCall: (callId: string, anchor: HTMLElement) => void;
  onSlotClick: (start: Date) => void;
  /** Jump the calendar to this date whenever it changes (e.g. clicking a call in "Coming up"). */
  focusDate: Date | null;
};

function EventContent({ event }: EventContentArg) {
  const company = event.extendedProps.company as string;
  return (
    <div className="flex h-full flex-col overflow-hidden px-1.5 py-0.5 leading-tight">
      <span className="truncate text-xs font-semibold">
        {event.extendedProps.example && <span className="mr-1 font-mono text-[9px] uppercase">Example</span>}
        {event.title}
      </span>
      {company && <span className="truncate text-[11px]">{company}</span>}
    </div>
  );
}

/** Google Calendar–style week view: 30-minute slots, a current-time line, drag to move, drop to book. */
export default function WeekCalendar({
  events,
  narrow,
  armed,
  onDropContact,
  onMoveCall,
  onOpenCall,
  onSlotClick,
  focusDate,
}: Props) {
  const ref = useRef<FullCalendar>(null);

  useEffect(() => {
    if (focusDate) ref.current?.getApi().gotoDate(focusDate);
  }, [focusDate]);

  return (
    <div className={armed ? "coverage-calendar is-armed" : "coverage-calendar"}>
      <FullCalendar
        ref={ref}
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView={narrow ? "timeGridThreeDay" : "timeGridWeek"}
        views={{ timeGridThreeDay: { type: "timeGrid", duration: { days: 3 }, buttonText: "3 days" } }}
        headerToolbar={{ left: "today prev,next", center: "", right: "title" }}
        buttonText={{ today: "Today" }}
        buttonHints={{ prev: "Previous $0", next: "Next $0", today: "Go to today" }}
        height="auto"
        expandRows
        allDaySlot={false}
        nowIndicator
        slotDuration="00:30:00"
        snapDuration="00:30:00"
        scrollTime="08:00:00"
        slotMinTime="06:00:00"
        slotMaxTime="23:00:00"
        slotLabelFormat={{ hour: "numeric", minute: "2-digit", omitZeroMinute: true, meridiem: "short" }}
        dayHeaderFormat={{ weekday: "short", day: "numeric" }}
        defaultTimedEventDuration="00:30:00"
        events={events}
        eventContent={EventContent}
        editable
        eventDurationEditable={false}
        droppable
        longPressDelay={300}
        drop={(info: DropArg) => {
          const id = info.draggedEl.dataset.dragContact;
          if (id) onDropContact(id, info.date);
        }}
        eventDrop={(info: EventDropArg) => {
          if (info.event.start) onMoveCall(info.event.id, info.event.start, info.revert);
        }}
        eventClick={(info: EventClickArg) => {
          info.jsEvent.preventDefault();
          onOpenCall(info.event.id, info.el);
        }}
        dateClick={(info: DateClickArg) => onSlotClick(info.date)}
        datesSet={() => {
          // FullCalendar's arrow icons are decorative; the buttons already have accessible names.
          document.querySelectorAll(".coverage-calendar .fc-icon").forEach((icon) => icon.setAttribute("aria-hidden", "true"));
        }}
        eventDidMount={({ el, event }) => {
          // Make booked calls reachable and operable from the keyboard.
          el.setAttribute("tabindex", "0");
          el.setAttribute("role", "button");
          const when = event.start?.toLocaleString(undefined, {
            weekday: "long",
            hour: "numeric",
            minute: "2-digit",
          });
          el.setAttribute("aria-label", `Call with ${event.title}, ${when}. Press Enter for details.`);
          el.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpenCall(event.id, el);
            }
          });
        }}
      />
    </div>
  );
}
