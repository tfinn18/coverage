"use client";

import { useEffect, useState } from "react";
import { updateContact, type ContactPatch } from "@/lib/data/contacts";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const DEBOUNCE_MS = 600;
const RETRY_MS = 4000;

type Pending = { patch: ContactPatch; timer: ReturnType<typeof setTimeout> | null };

/**
 * Debounced, per-contact auto-saver. Edits to the same contact within DEBOUNCE_MS are merged into one
 * update; failed saves are retried with the newest values. Plain object (not React state) so timers
 * and in-flight requests survive re-renders.
 */
function createSaver(setStatus: (status: SaveStatus) => void) {
  const pending = new Map<string, Pending>();
  /** Rows still being inserted; updates for them wait until the insert finishes. */
  const inserting = new Map<string, Promise<unknown>>();
  let inFlight = 0;

  const report = (failed = false) =>
    setStatus(failed ? "error" : inFlight > 0 || pending.size > 0 ? "saving" : "saved");

  async function flush(id: string) {
    const entry = pending.get(id);
    if (!entry) return;
    if (entry.timer) clearTimeout(entry.timer);
    pending.delete(id);
    inFlight += 1;
    setStatus("saving");
    try {
      await inserting.get(id);
      await updateContact(id, entry.patch);
      inFlight -= 1;
      report();
    } catch {
      inFlight -= 1;
      const newer = pending.get(id);
      if (newer?.timer) clearTimeout(newer.timer);
      pending.set(id, { patch: { ...entry.patch, ...newer?.patch }, timer: setTimeout(() => void flush(id), RETRY_MS) });
      report(true);
    }
  }

  return {
    hasUnsaved: () => pending.size > 0 || inFlight > 0,
    flush,
    flushAll() {
      for (const id of Array.from(pending.keys())) void flush(id);
    },
    schedule(id: string, patch: ContactPatch) {
      const existing = pending.get(id);
      if (existing?.timer) clearTimeout(existing.timer);
      pending.set(id, { patch: { ...existing?.patch, ...patch }, timer: setTimeout(() => void flush(id), DEBOUNCE_MS) });
      setStatus("saving");
    },
    /** Drop unsaved edits for a contact that is being deleted. */
    cancel(id: string) {
      const entry = pending.get(id);
      if (entry?.timer) clearTimeout(entry.timer);
      pending.delete(id);
      report();
    },
    trackInsert(id: string, promise: Promise<unknown>) {
      inserting.set(
        id,
        promise.then(
          () => inserting.delete(id),
          () => inserting.delete(id),
        ),
      );
    },
  };
}

export function useAutosave() {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [saver] = useState(() => createSaver(setStatus));

  // Save immediately when the tab is hidden, and warn before closing with unsaved edits.
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && saver.flushAll();
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saver.hasUnsaved()) {
        saver.flushAll();
        e.preventDefault();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      saver.flushAll();
    };
  }, [saver]);

  return { status, ...saver };
}
