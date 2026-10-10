"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Toast, type ToastData } from "@/components/ui/Toast";
import { bookableContacts, formatCallTime, readyToSchedule, upcomingCalls } from "@/lib/calls/schedule";
import { createCall, deleteCall, fetchCalls, moveCall } from "@/lib/data/calls";
import { fetchContacts, updateContact } from "@/lib/data/contacts";
import type { Call, Contact, ContactStage } from "@/lib/database.types";
import { BookDialog } from "./BookDialog";
import { CallPopover } from "./CallPopover";
import { ReadyPanel } from "./ReadyPanel";
import type { CalendarEvent } from "./WeekCalendar";

// FullCalendar measures the DOM, so it only renders in the browser.
const WeekCalendar = dynamic(() => import("./WeekCalendar"), {
  ssr: false,
  loading: () => <CalendarSkeleton />,
});

function CalendarSkeleton() {
  return <div className="h-[640px] animate-pulse rounded-lg border border-rule bg-surface" aria-hidden="true" />;
}

type BookingState = { contactId: string; callId?: string; initial: Date } | null;

export function CallsView() {
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [popover, setPopover] = useState<{ callId: string; anchor: HTMLElement } | null>(null);
  const [booking, setBooking] = useState<BookingState>(null);
  const [focusDate, setFocusDate] = useState<Date | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const contactsRef = useRef<Contact[]>([]);

  const showToast = useCallback((t: Omit<ToastData, "id">) => setToast({ ...t, id: Date.now() }), []);
  const dismissToast = useCallback(() => setToast(null), []);

  const setContactList = useCallback((fn: (prev: Contact[]) => Contact[]) => {
    setContacts((prev) => {
      const next = fn(prev ?? []);
      contactsRef.current = next;
      return next;
    });
  }, []);

  const load = useCallback(() => {
    Promise.all([fetchContacts(), fetchCalls()]).then(
      ([c, k]) => {
        contactsRef.current = c;
        setNarrow(window.matchMedia("(max-width: 767px)").matches);
        setNow(new Date());
        setContacts(c);
        setCalls(k);
      },
      () => setLoadError(true),
    );
  }, []);

  useEffect(load, [load]);

  // Keep "Coming up" current.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  // Make the "Ready to schedule" cards draggable onto the calendar.
  const loaded = contacts !== null;
  useEffect(() => {
    if (!loaded || !panelRef.current) return;
    let draggable: { destroy: () => void } | undefined;
    let cancelled = false;
    import("@fullcalendar/interaction").then(({ Draggable }) => {
      if (cancelled || !panelRef.current) return;
      draggable = new Draggable(panelRef.current, {
        itemSelector: "[data-drag-contact]",
        minDistance: 6,
        longPressDelay: 400,
        eventData: (el) => ({ title: el.dataset.title, duration: "00:30", create: false }),
      });
    });
    return () => {
      cancelled = true;
      draggable?.destroy();
    };
  }, [loaded]);

  // Escape cancels tap-to-book.
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelectedId(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const byId = useMemo(() => new Map((contacts ?? []).map((c) => [c.id, c])), [contacts]);
  const ready = useMemo(() => readyToSchedule(contacts ?? [], calls), [contacts, calls]);
  const others = useMemo(() => {
    const readyIds = new Set(ready.map((c) => c.id));
    return bookableContacts(contacts ?? [], calls).filter((c) => !readyIds.has(c.id));
  }, [contacts, calls, ready]);
  const upcoming = useMemo(() => (now ? upcomingCalls(calls, now, 5) : []), [calls, now]);

  const events: CalendarEvent[] = useMemo(
    () =>
      calls.map((call) => {
        const contact = byId.get(call.contact_id);
        const start = new Date(call.starts_at);
        return {
          id: call.id,
          title: contact?.name.trim() || "Unnamed contact",
          start,
          end: new Date(start.getTime() + call.duration_minutes * 60_000),
          classNames: [`call-${contact?.stage ?? "contacted"}`],
          extendedProps: { company: contact?.company ?? "", stage: contact?.stage ?? "contacted" },
        };
      }),
    [calls, byId],
  );

  const setStage = useCallback(
    async (contactId: string, stage: ContactStage) => {
      const before = contactsRef.current.find((c) => c.id === contactId)?.stage;
      setContactList((prev) => prev.map((c) => (c.id === contactId ? { ...c, stage, updated_at: new Date().toISOString() } : c)));
      try {
        await updateContact(contactId, { stage });
      } catch {
        if (before) setContactList((prev) => prev.map((c) => (c.id === contactId ? { ...c, stage: before } : c)));
        throw new Error("stage update failed");
      }
    },
    [setContactList],
  );

  const book = useCallback(
    async (contactId: string, start: Date) => {
      const contact = contactsRef.current.find((c) => c.id === contactId);
      if (!contact) return;
      setSelectedId(null);
      try {
        const call = await createCall(contactId, start);
        setCalls((prev) => [...prev, call]);
        // Booking someone still at Contacted moves them to Call scheduled.
        if (contact.stage === "contacted") await setStage(contactId, "call_scheduled");
        showToast({
          message: `Booked ${contact.name.trim() || "call"} for ${formatCallTime(start, call.duration_minutes)}.`,
          action: {
            label: "Undo",
            onClick: () => {
              setCalls((prev) => prev.filter((c) => c.id !== call.id));
              void deleteCall(call.id);
            },
          },
        });
      } catch {
        showToast({ tone: "error", message: "Couldn't book that call. Please try again." });
      }
    },
    [setStage, showToast],
  );

  const move = useCallback(
    async (callId: string, start: Date, revert?: () => void) => {
      const previous = calls.find((c) => c.id === callId);
      setCalls((prev) => prev.map((c) => (c.id === callId ? { ...c, starts_at: start.toISOString() } : c)));
      try {
        await moveCall(callId, start);
      } catch {
        revert?.();
        if (previous) setCalls((prev) => prev.map((c) => (c.id === callId ? previous : c)));
        showToast({ tone: "error", message: "Couldn't move that call. Please try again." });
      }
    },
    [calls, showToast],
  );

  async function remove(call: Call) {
    setPopover(null);
    setCalls((prev) => prev.filter((c) => c.id !== call.id));
    try {
      await deleteCall(call.id);
      const name = byId.get(call.contact_id)?.name.trim() || "the call";
      showToast({
        message: `Removed ${name} from the calendar.`,
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              const restored = await createCall(call.contact_id, new Date(call.starts_at), call.duration_minutes);
              setCalls((prev) => [...prev, restored]);
            } catch {
              showToast({ tone: "error", message: "Couldn't put that call back." });
            }
          },
        },
      });
    } catch {
      setCalls((prev) => [...prev, call]);
      showToast({ tone: "error", message: "Couldn't remove that call. Please try again." });
    }
  }

  async function markCalled(contact: Contact) {
    setPopover(null);
    try {
      await setStage(contact.id, "called");
      showToast({ message: `Marked ${contact.name.trim() || "contact"} as called. Nice work.` });
    } catch {
      showToast({ tone: "error", message: "Couldn't update the stage. Please try again." });
    }
  }

  const onOpenCall = useCallback((callId: string, anchor: HTMLElement) => setPopover({ callId, anchor }), []);
  const onSlotClick = useCallback(
    (start: Date) => {
      if (selectedId) void book(selectedId, start);
    },
    [selectedId, book],
  );
  const onMoveCall = useCallback((id: string, start: Date, revert: () => void) => void move(id, start, revert), [move]);
  const onDropContact = useCallback((id: string, start: Date) => void book(id, start), [book]);
  const closePopover = useCallback(() => setPopover(null), []);

  const popoverCall = popover ? calls.find((c) => c.id === popover.callId) : undefined;
  const popoverContact = popoverCall ? byId.get(popoverCall.contact_id) : undefined;
  const selected = selectedId ? byId.get(selectedId) : undefined;
  const bookingContact = booking ? byId.get(booking.contactId) : undefined;

  if (loadError) {
    return (
      <Alert tone="error">
        We couldn&apos;t load your calendar. Check your connection.{" "}
        <button
          type="button"
          className="font-semibold underline underline-offset-2"
          onClick={() => {
            setLoadError(false);
            load();
          }}
        >
          Try again
        </button>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Call Schedule</h1>
        <p className="mt-1 text-sm text-muted">Book 30-minute calls with the people you&apos;re covering.</p>
      </div>

      {contacts === null ? (
        <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
          <div className="h-64 animate-pulse rounded-lg border border-rule bg-surface" aria-hidden="true" />
          <CalendarSkeleton />
          <p role="status" className="sr-only">
            Loading your calendar…
          </p>
        </div>
      ) : (
        // Phones: Ready to schedule, then the calendar, then Coming up. Desktop: both lists in a left column.
        <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)] lg:grid-rows-[auto_1fr]">
          <div className="lg:col-start-1 lg:row-start-1">
            <ReadyPanel
              ref={panelRef}
              ready={ready}
              others={others}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onBook={(id) => setBooking({ contactId: id, initial: nextSlotFrom(new Date()) })}
            />
          </div>
          <div className="lg:col-start-1 lg:row-start-2 max-lg:order-last">
            <ComingUp
              upcoming={upcoming}
              byId={byId}
              onOpen={(call, anchor) => {
                setFocusDate(new Date(call.starts_at));
                setPopover({ callId: call.id, anchor });
              }}
            />
          </div>

          <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            {selected && (
              <div
                role="status"
                className="mb-3 flex items-center justify-between gap-3 rounded-md border border-brass/50 bg-brass-soft px-3 py-2 text-sm"
              >
                <span>
                  Tap a time slot to book <strong>{selected.name.trim() || "this contact"}</strong>.
                </span>
                <button type="button" onClick={() => setSelectedId(null)} className="font-semibold underline underline-offset-2">
                  Cancel
                </button>
              </div>
            )}
            {contacts.length === 0 && (
              <Alert tone="info" className="mb-3">
                Add contacts first, then set their Stage to Call scheduled to book calls here.{" "}
                <Link href="/contacts" className="font-semibold underline underline-offset-2">
                  Go to Contacts
                </Link>
              </Alert>
            )}
            <WeekCalendar
              events={events}
              narrow={narrow}
              armed={Boolean(selectedId)}
              onDropContact={onDropContact}
              onMoveCall={onMoveCall}
              onOpenCall={onOpenCall}
              onSlotClick={onSlotClick}
              focusDate={focusDate}
            />
          </div>
        </div>
      )}

      {popover && popoverCall && popoverContact && (
        <CallPopover
          call={popoverCall}
          contact={popoverContact}
          anchor={popover.anchor}
          onClose={closePopover}
          onMarkCalled={() => void markCalled(popoverContact)}
          onReschedule={() => {
            setPopover(null);
            setBooking({ contactId: popoverContact.id, callId: popoverCall.id, initial: new Date(popoverCall.starts_at) });
          }}
          onRemove={() => void remove(popoverCall)}
        />
      )}

      {booking && bookingContact && (
        <BookDialog
          name={bookingContact.name.trim() || "this contact"}
          initial={booking.initial}
          rescheduling={Boolean(booking.callId)}
          onClose={() => setBooking(null)}
          onSubmit={(start) => {
            const { callId, contactId } = booking;
            setBooking(null);
            setFocusDate(start);
            if (callId) void move(callId, start);
            else void book(contactId, start);
          }}
        />
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}

function nextSlotFrom(date: Date): Date {
  const d = new Date(date);
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60);
  return d;
}

function ComingUp({
  upcoming,
  byId,
  onOpen,
}: {
  upcoming: Call[];
  byId: Map<string, Contact>;
  onOpen: (call: Call, anchor: HTMLElement) => void;
}) {
  return (
    <section aria-labelledby="coming-up-heading">
      <h2 id="coming-up-heading" className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink-2">
        Coming up
      </h2>
      {upcoming.length === 0 ? (
        <p className="mt-2 text-xs text-muted">No calls booked yet.</p>
      ) : (
        <ol className="mt-2 flex flex-col divide-y divide-rule rounded-md border border-rule bg-surface">
          {upcoming.map((call) => {
            const contact = byId.get(call.contact_id);
            return (
              <li key={call.id}>
                <button
                  type="button"
                  onClick={(e) => onOpen(call, e.currentTarget)}
                  className="w-full px-3 py-2 text-left hover:bg-surface-2"
                >
                  <span className="block font-mono text-[11px] text-brass">
                    {formatCallTime(new Date(call.starts_at), call.duration_minutes)}
                  </span>
                  <span className="block truncate text-sm font-semibold">{contact?.name.trim() || "Unnamed contact"}</span>
                  {contact?.company && <span className="block truncate text-xs text-muted">{contact.company}</span>}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
