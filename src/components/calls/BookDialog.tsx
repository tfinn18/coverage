"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { localDateString } from "@/lib/contacts/followup";
import { fromLocalInputs, localTimeString, snapToSlot } from "@/lib/calls/schedule";

/** Keyboard-friendly way to book or reschedule: pick a date and a time. */
export function BookDialog({
  name,
  initial,
  rescheduling,
  onSubmit,
  onClose,
}: {
  name: string;
  initial: Date;
  rescheduling: boolean;
  onSubmit: (start: Date) => void;
  onClose: () => void;
}) {
  const start = snapToSlot(initial);
  const [date, setDate] = useState(localDateString(start));
  const [time, setTime] = useState(localTimeString(start));
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const when = fromLocalInputs(date, time);
    if (!when) return setError("Pick a date and a time.");
    onSubmit(when);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={rescheduling ? "Change call time" : "Book a call"}
      description={`30-minute call with ${name}.`}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          <TextField
            label="Start time"
            type="time"
            required
            step={1800}
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        {error && <p className="text-sm font-medium text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{rescheduling ? "Save time" : "Book call"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
