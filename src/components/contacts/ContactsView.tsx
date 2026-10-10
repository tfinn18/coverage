"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Toast, type ToastData } from "@/components/ui/Toast";
import { contactsToCsv, exportFileName } from "@/lib/contacts/export";
import { localDateString } from "@/lib/contacts/followup";
import { countByStage, visibleContactIds, type SortKey, type ViewOptions } from "@/lib/contacts/view";
import { deleteContact, fetchContacts, insertContacts, restoreContact } from "@/lib/data/contacts";
import type { Contact, ContactStage } from "@/lib/database.types";
import { downloadText } from "@/lib/download";
import type { RowHandlers } from "./ContactRow";
import { ContactsTable, TableSkeleton } from "./ContactsTable";
import { ContactsToolbar } from "./ContactsToolbar";
import { LinkedInDialog } from "./LinkedInDialog";
import { useAutosave } from "./useAutosave";

type Options = Omit<ViewOptions, "today">;

const DEFAULT_OPTIONS: Options = {
  search: "",
  stage: "all",
  followUpsDue: false,
  sort: { key: "created_at", dir: "desc" },
};

function blankContact(id: string): Contact {
  const now = new Date().toISOString();
  return {
    id,
    user_id: "",
    company: "",
    name: "",
    title: "",
    stage: "contacted",
    follow_up_date: null,
    notes: "",
    linkedin_url: null,
    created_at: now,
    updated_at: now,
  };
}

function displayName(c: Contact) {
  return c.name.trim() || c.company.trim() || "contact";
}

export function ContactsView() {
  const params = useSearchParams();
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [options, setOptions] = useState<Options>(DEFAULT_OPTIONS);
  /** Row order is recomputed only when filters/sort change or rows are added/removed, so rows don't jump while you type. */
  const [order, setOrder] = useState<string[]>([]);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [linkedInFor, setLinkedInFor] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    params.get("welcome")
      ? "Welcome to Coverage! Your account is ready."
      : params.get("passwordUpdated")
        ? "Your password has been updated."
        : null,
  );
  // Set in the browser when contacts load (the server must not read the clock while prerendering).
  const [today, setToday] = useState("");
  const contactsRef = useRef<Contact[]>([]);
  const focusIdRef = useRef<string | null>(null);
  const { status: saveStatus, schedule, flush, flushAll, cancel, trackInsert } = useAutosave();

  const showToast = useCallback((t: Omit<ToastData, "id">) => setToast({ ...t, id: Date.now() }), []);
  const dismissToast = useCallback(() => setToast(null), []);

  const updateContacts = useCallback((fn: (prev: Contact[]) => Contact[]) => {
    setContacts((prev) => {
      const next = fn(prev ?? []);
      contactsRef.current = next;
      return next;
    });
  }, []);

  const applyOptions = useCallback(
    (next: Options, list: Contact[] = contactsRef.current) => {
      setOptions(next);
      setOrder(visibleContactIds(list, { ...next, today }));
    },
    [today],
  );

  const showLoaded = useCallback((rows: Contact[]) => {
    const now = localDateString();
    contactsRef.current = rows;
    setToday(now);
    setContacts(rows);
    setOrder(visibleContactIds(rows, { ...DEFAULT_OPTIONS, today: now }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchContacts().then(
      (rows) => !cancelled && showLoaded(rows),
      () => !cancelled && setLoadError(true),
    );
    return () => {
      cancelled = true;
    };
  }, [showLoaded]);

  function retryLoad() {
    setLoadError(false);
    fetchContacts().then(showLoaded, () => setLoadError(true));
  }

  // After adding a row, put the cursor in its first cell.
  useEffect(() => {
    const id = focusIdRef.current;
    if (!id) return;
    focusIdRef.current = null;
    document.querySelector<HTMLInputElement>(`tr[data-id="${id}"] input`)?.focus();
  }, [order]);

  const handlers: RowHandlers = useMemo(
    () => ({
      onEdit: (id, field, value) => {
        updateContacts((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
        schedule(id, { [field]: value as ContactStage & string });
      },
      onCommit: (id) => void flush(id),
      onEditLinkedIn: (id) => setLinkedInFor(id),
      onDelete: async (id) => {
        const contact = contactsRef.current.find((c) => c.id === id);
        if (!contact) return;
        const index = contactsRef.current.indexOf(contact);
        cancel(id);
        updateContacts((prev) => prev.filter((c) => c.id !== id));
        setOrder((prev) => prev.filter((x) => x !== id));

        const putBack = () => {
          updateContacts((prev) => [...prev.slice(0, index), contact, ...prev.slice(index)]);
          setOrder((prev) => (prev.includes(id) ? prev : [...prev.slice(0, index), id, ...prev.slice(index)]));
        };

        try {
          const { calls } = await deleteContact(id);
          showToast({
            message: `Deleted ${displayName(contact)}.`,
            action: {
              label: "Undo",
              onClick: async () => {
                try {
                  await restoreContact(contact, calls);
                  putBack();
                } catch {
                  showToast({ tone: "error", message: "Couldn't restore that contact. Please try again." });
                }
              },
            },
          });
        } catch {
          putBack();
          showToast({ tone: "error", message: "Couldn't delete that contact. Please try again." });
        }
      },
    }),
    [schedule, flush, cancel, updateContacts, showToast],
  );

  function addContact() {
    const contact = blankContact(crypto.randomUUID());
    focusIdRef.current = contact.id;
    updateContacts((prev) => [contact, ...prev]);
    setOrder((prev) => [contact.id, ...prev]);
    const { id, company, name, title, stage, notes } = contact;
    const insert = insertContacts([{ id, company, name, title, stage, notes }]);
    trackInsert(id, insert);
    insert.catch(() => {
      cancel(id);
      updateContacts((prev) => prev.filter((c) => c.id !== id));
      setOrder((prev) => prev.filter((x) => x !== id));
      showToast({ tone: "error", message: "Couldn't add a contact. Check your connection and try again." });
    });
  }

  function onSort(key: SortKey) {
    const dir = options.sort.key === key && options.sort.dir === "asc" ? "desc" : "asc";
    applyOptions({ ...options, sort: { key, dir } });
  }

  const byId = useMemo(() => new Map((contacts ?? []).map((c) => [c.id, c])), [contacts]);
  const rows = useMemo(() => order.map((id) => byId.get(id)).filter((c): c is Contact => Boolean(c)), [order, byId]);
  const counts = useMemo(() => countByStage(contacts ?? [], today), [contacts, today]);
  const filtered = options.search.trim() !== "" || options.stage !== "all" || options.followUpsDue;

  function exportCsv() {
    flushAll();
    downloadText(exportFileName(), contactsToCsv(rows));
    showToast({ message: `Exported ${rows.length} contact${rows.length === 1 ? "" : "s"}${filtered ? " (current filter)" : ""}.` });
  }

  const linkedInContact = linkedInFor ? byId.get(linkedInFor) : undefined;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Contacts</h1>
          {contacts && (
            <p className="mt-1 text-sm text-muted">
              {counts.all} contact{counts.all === 1 ? "" : "s"}
              {counts.due > 0 && (
                <>
                  {" · "}
                  <span className="font-medium text-danger">
                    {counts.due} follow-up{counts.due === 1 ? "" : "s"} due
                  </span>
                </>
              )}
            </p>
          )}
        </div>
      </div>

      {notice && (
        <Alert tone="success" className="flex items-center justify-between gap-3">
          {notice}
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="px-1">
            ✕
          </button>
        </Alert>
      )}

      {loadError ? (
        <Alert tone="error">
          We couldn&apos;t load your contacts. Check your connection.{" "}
          <button type="button" onClick={retryLoad} className="font-semibold underline underline-offset-2">
            Try again
          </button>
        </Alert>
      ) : contacts === null ? (
        <>
          <div className="h-[76px]" aria-hidden="true" />
          <TableSkeleton />
          <p role="status" className="sr-only">
            Loading contacts…
          </p>
        </>
      ) : contacts.length === 0 ? (
        <EmptyState onAdd={addContact} />
      ) : (
        <>
          <ContactsToolbar
            search={options.search}
            onSearch={(search) => applyOptions({ ...options, search })}
            stage={options.stage}
            onStage={(stage) => applyOptions({ ...options, stage })}
            followUpsDue={options.followUpsDue}
            onFollowUpsDue={(followUpsDue) => applyOptions({ ...options, followUpsDue })}
            counts={counts}
            onAdd={addContact}
            onExport={exportCsv}
            canExport={rows.length > 0}
            saveStatus={saveStatus}
          />
          <ContactsTable
            contacts={rows}
            today={today}
            sort={options.sort}
            onSort={onSort}
            handlers={handlers}
            emptyMessage={
              filtered && (
                <>
                  No contacts match these filters.{" "}
                  <button
                    type="button"
                    className="font-semibold text-ink underline underline-offset-2"
                    onClick={() => applyOptions({ ...DEFAULT_OPTIONS, sort: options.sort })}
                  >
                    Clear filters
                  </button>
                </>
              )
            }
          />
          <p className="text-xs text-muted">
            Tip: <kbd className="font-mono">Tab</kbd> moves across, <kbd className="font-mono">Enter</kbd> moves down.
            Changes save automatically.
          </p>
        </>
      )}

      {linkedInContact && (
        <LinkedInDialog
          name={displayName(linkedInContact)}
          initialUrl={linkedInContact.linkedin_url}
          onClose={() => setLinkedInFor(null)}
          onSave={(url) => {
            handlers.onEdit(linkedInContact.id, "linkedin_url", url);
            handlers.onCommit(linkedInContact.id);
            setLinkedInFor(null);
          }}
        />
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-rule-strong bg-surface px-6 py-14 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brass">Your coverage list</p>
      <h2 className="mt-2 font-serif text-2xl font-semibold">Start covering your network</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        Add the bankers, alumni, and recruiters you&apos;re talking to. Track where each conversation stands and when
        to follow up.
      </p>
      <Button className="mt-6" onClick={onAdd}>
        + Add your first contact
      </Button>
    </div>
  );
}
