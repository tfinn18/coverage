"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { SaveIndicator } from "@/components/contacts/ContactsToolbar";
import { Alert } from "@/components/ui/Alert";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { inputClasses } from "@/components/ui/TextField";
import { localDateString } from "@/lib/contacts/followup";
import { fetchNotes, saveNotes } from "@/lib/data/notes";
import { updateContact } from "@/lib/data/contacts";
import type { Contact } from "@/lib/database.types";
import {
  emptyNotesDoc,
  isValidEmail,
  mailtoUrl,
  notesDocFromText,
  notesToText,
  thankYouText,
  type NotesDoc,
} from "@/lib/notes/doc";
import { AutoTextarea } from "./AutoTextarea";
import { ListEditor } from "./ListEditor";

type SaveStatus = "idle" | "saving" | "saved" | "error";
const SAVE_DELAY = 700;

function withoutEmptyItems(doc: NotesDoc): NotesDoc {
  const strip = (items: string[]) => items.filter((s) => s.trim() !== "");
  return {
    ...doc,
    prep: { ...doc.prep, background: strip(doc.prep.background), questions: strip(doc.prep.questions) },
    call: { ...doc.call, keyAdvice: strip(doc.call.keyAdvice), firm: strip(doc.call.firm), people: strip(doc.call.people) },
    followUp: { ...doc.followUp, nextSteps: strip(doc.followUp.nextSteps) },
  };
}

function formatSentDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Notes for one contact. Desktop: a panel on the right half of the screen, next to the table.
 * Phones: a full-screen sheet. Escape or the X closes it. Everything auto-saves.
 */
export function NotesPanel({
  contact,
  onClose,
  onSaved,
}: {
  contact: Contact;
  onClose: () => void;
  /** Keeps the grid's copy of the contact (preview text, email) in sync after a save. */
  onSaved: (id: string, patch: Partial<Pick<Contact, "notes" | "email">>) => void;
}) {
  const ids = useId();
  const [doc, setDoc] = useState<NotesDoc | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [email, setEmail] = useState(contact.email ?? "");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [copied, setCopied] = useState<"copied" | "failed" | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const company = contact.company.trim();

  // Latest values for the debounced savers (so unmount can flush them).
  const pendingDoc = useRef<NotesDoc | null>(null);
  const pendingEmail = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contactRef = useRef(contact);
  useEffect(() => {
    contactRef.current = contact;
  }, [contact]);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const nextDoc = pendingDoc.current;
    const nextEmail = pendingEmail.current;
    pendingDoc.current = null;
    pendingEmail.current = null;
    if (!nextDoc && nextEmail === null) return;
    const { id, company: co } = contactRef.current;
    setStatus("saving");
    try {
      if (nextDoc) {
        const text = notesToText(nextDoc, co);
        await saveNotes(id, nextDoc, text);
        onSaved(id, { notes: text });
      }
      if (nextEmail !== null) {
        const value = nextEmail.trim() || null;
        await updateContact(id, { email: value });
        onSaved(id, { email: value });
      }
      setStatus("saved");
    } catch {
      // Put the edits back so the next change (or closing the panel) retries them.
      pendingDoc.current ??= nextDoc;
      if (pendingEmail.current === null) pendingEmail.current = nextEmail;
      setStatus("error");
    }
  }, [onSaved]);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_DELAY);
    setStatus("saving");
  }, [flush]);

  // Load the document; save anything pending when the panel closes or switches contact.
  useEffect(() => {
    let cancelled = false;
    fetchNotes(contact.id).then(
      (stored) => {
        if (cancelled) return;
        const initial = stored ?? (contact.notes.trim() ? notesDocFromText(contact.notes) : emptyNotesDoc());
        setDoc(withoutEmptyItems(initial));
      },
      () => !cancelled && setLoadError(true),
    );
    return () => {
      cancelled = true;
      void flush();
    };
    // Load once per contact; the panel is keyed by contact id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact.id]);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  function update(fn: (d: NotesDoc) => NotesDoc) {
    setDoc((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      pendingDoc.current = next;
      return next;
    });
    schedule();
  }

  function onEmailChange(value: string) {
    setEmail(value);
    if (value.trim() && !isValidEmail(value)) {
      setEmailError("That doesn't look like an email address yet.");
      return;
    }
    setEmailError(null);
    pendingEmail.current = value;
    schedule();
  }

  async function copyEmail() {
    if (!doc) return;
    try {
      await navigator.clipboard.writeText(thankYouText(doc.followUp.subject, doc.followUp.body));
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
    setTimeout(() => setCopied(null), 2500);
  }

  const labelId = (key: string) => `${ids}-${key}`;
  const validEmail = email.trim() && isValidEmail(email) ? email.trim() : null;

  return (
    <aside
      role="dialog"
      aria-labelledby={labelId("title")}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
      className="fixed inset-0 z-40 flex flex-col bg-surface lg:inset-y-0 lg:left-1/2 lg:right-0 lg:top-14 lg:border-l lg:border-rule lg:shadow-[-16px_0_40px_-28px_rgba(13,27,42,0.45)]"
    >
      <header className="border-b border-rule bg-surface px-5 pb-4 pt-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-brass">Notes</p>
              <SaveIndicator status={status} />
            </div>
            <h2 id={labelId("title")} ref={headingRef} tabIndex={-1} className="truncate font-serif text-2xl font-semibold outline-none">
              {contact.name.trim() || "Unnamed contact"}
            </h2>
            <p className="truncate text-sm text-muted">
              {[company, contact.title.trim()].filter(Boolean).join(" · ") || "No company or title yet"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close notes"
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
        <div className="mt-3 max-w-sm">
          <label htmlFor={labelId("email")} className="text-xs font-medium text-ink-2">
            Email <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id={labelId("email")}
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="name@firm.com"
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? labelId("email-error") : undefined}
            className={`${inputClasses} mt-1 h-9`}
          />
          {emailError && (
            <p id={labelId("email-error")} className="mt-1 text-xs font-medium text-danger">
              {emailError}
            </p>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-16 pt-2 sm:px-6">
        {loadError ? (
          <Alert tone="error" className="mt-4">
            We couldn&apos;t load these notes. Close the panel and try again.
          </Alert>
        ) : !doc ? (
          <div className="flex justify-center py-12 text-muted">
            <Spinner label="Loading notes" />
          </div>
        ) : (
          <div className="mx-auto max-w-2xl">
            <Section title="Prep">
              <Field label="Their background" id={labelId("background")}>
                <ListEditor
                  labelId={labelId("background")}
                  itemLabel="Background note"
                  placeholder="Add a note"
                  items={doc.prep.background}
                  onChange={(background) => update((d) => ({ ...d, prep: { ...d.prep, background } }))}
                />
              </Field>
              <Field label={`Why ${company || "this firm"}?`} id={labelId("why")}>
                <AutoTextarea
                  aria-labelledby={labelId("why")}
                  minRows={2}
                  placeholder="Add a note"
                  value={doc.prep.whyCompany}
                  onChange={(e) => {
                    const whyCompany = e.target.value;
                    update((d) => ({ ...d, prep: { ...d.prep, whyCompany } }));
                  }}
                />
              </Field>
              <Field label="My questions" id={labelId("questions")}>
                <ListEditor
                  ordered
                  labelId={labelId("questions")}
                  itemLabel="Question"
                  placeholder="Add a question"
                  items={doc.prep.questions}
                  onChange={(questions) => update((d) => ({ ...d, prep: { ...d.prep, questions } }))}
                />
              </Field>
            </Section>

            <Section title="Call notes">
              <Field label="Call date" id={labelId("date")}>
                <div className="max-w-[13rem]">
                  <input
                  type="date"
                  aria-labelledby={labelId("date")}
                  value={doc.call.date ?? ""}
                  onChange={(e) => {
                    const date = e.target.value || null;
                    update((d) => ({ ...d, call: { ...d.call, date } }));
                  }}
                    className={`${inputClasses} h-9 font-mono text-[13px]`}
                  />
                </div>
              </Field>
              {(
                [
                  ["keyAdvice", "Key advice", "Advice"],
                  ["firm", "About the firm and industry", "Firm note"],
                  ["people", "People to contact", "Person"],
                ] as const
              ).map(([key, label, item]) => (
                <Field key={key} label={label} id={labelId(key)}>
                  <ListEditor
                    labelId={labelId(key)}
                    itemLabel={item}
                    placeholder="Add a note"
                    items={doc.call[key]}
                    onChange={(items) => update((d) => ({ ...d, call: { ...d.call, [key]: items } }))}
                  />
                </Field>
              ))}
              <Field label="What I asked for at the end" id={labelId("asked")}>
                <AutoTextarea
                  aria-labelledby={labelId("asked")}
                  minRows={2}
                  placeholder="Add a note"
                  value={doc.call.askedFor}
                  onChange={(e) => {
                    const askedFor = e.target.value;
                    update((d) => ({ ...d, call: { ...d.call, askedFor } }));
                  }}
                />
              </Field>
            </Section>

            <Section title="Follow-up">
              <Field label="Thank-you email" id={labelId("thanks")}>
                <div className="flex flex-col gap-2 rounded-lg border border-rule bg-paper/60 p-3">
                  <label htmlFor={labelId("subject")} className="sr-only">
                    Subject
                  </label>
                  <input
                    id={labelId("subject")}
                    value={doc.followUp.subject}
                    onChange={(e) => {
                      const subject = e.target.value;
                      update((d) => ({ ...d, followUp: { ...d.followUp, subject } }));
                    }}
                    placeholder="Subject"
                    className={`${inputClasses} h-9 font-medium`}
                  />
                  <label htmlFor={labelId("body")} className="sr-only">
                    Body
                  </label>
                  <AutoTextarea
                    id={labelId("body")}
                    minRows={8}
                    placeholder="Write your thank-you email"
                    value={doc.followUp.body}
                    onChange={(e) => {
                      const body = e.target.value;
                      update((d) => ({ ...d, followUp: { ...d.followUp, body } }));
                    }}
                    boxed
                    className="min-h-48"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={copyEmail}>
                      Copy
                    </Button>
                    <a
                      href={mailtoUrl(validEmail, doc.followUp.subject, doc.followUp.body)}
                      className={buttonClasses("primary", "sm")}
                    >
                      Open in email
                    </a>
                    <span role="status" className="text-xs text-muted">
                      {copied === "copied"
                        ? "Copied subject and body."
                        : copied === "failed"
                          ? "Couldn't copy. Select the text and copy it manually."
                          : !validEmail
                            ? "Add their email above to fill in the To field."
                            : ""}
                    </span>
                  </div>
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(doc.followUp.sentOn)}
                    onChange={(e) => {
                      const sentOn = e.target.checked ? localDateString() : null;
                      update((d) => ({ ...d, followUp: { ...d.followUp, sentOn } }));
                    }}
                    className="h-4 w-4 accent-[var(--navy)]"
                  />
                  Thank-you sent
                  {doc.followUp.sentOn && (
                    <span className="text-muted">· {formatSentDate(doc.followUp.sentOn)}</span>
                  )}
                </label>
              </Field>
              <Field label="Next steps" id={labelId("next")}>
                <ListEditor
                  labelId={labelId("next")}
                  itemLabel="Next step"
                  placeholder="Add a note"
                  items={doc.followUp.nextSteps}
                  onChange={(nextSteps) => update((d) => ({ ...d, followUp: { ...d.followUp, nextSteps } }))}
                />
              </Field>
            </Section>
          </div>
        )}
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-rule py-5 last:border-b-0">
      <h3 className="mb-3 text-base font-bold text-ink">{title}</h3>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <p id={id} className="mb-1 text-sm font-semibold text-ink-2">
        {label}
      </p>
      {children}
    </div>
  );
}
