import type { Json } from "@/lib/database.types";
import { parseNotesDoc, type NotesDoc } from "@/lib/notes/doc";
import { createClient } from "@/lib/supabase/client";

// RLS: users can only read or write notes for their own contacts.

/** Loads a contact's notes document, or null if they have none yet. */
export async function fetchNotes(contactId: string): Promise<NotesDoc | null> {
  const { data, error } = await createClient()
    .from("contact_notes")
    .select("doc")
    .eq("contact_id", contactId)
    .maybeSingle();
  if (error) throw error;
  return data ? parseNotesDoc(data.doc) : null;
}

/**
 * Saves the document and its plain-text copy (contacts.notes, used for the grid preview,
 * search and CSV export).
 */
export async function saveNotes(contactId: string, doc: NotesDoc, text: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("contact_notes")
    .upsert({ contact_id: contactId, doc: doc as unknown as Json }, { onConflict: "contact_id" });
  if (error) throw error;
  const { error: textError } = await supabase.from("contacts").update({ notes: text }).eq("id", contactId);
  if (textError) throw textError;
}

/** Creates notes documents for newly imported or example contacts. */
export async function insertNotesDocs(rows: { contact_id: string; doc: NotesDoc }[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await createClient()
    .from("contact_notes")
    .insert(rows.map((r) => ({ contact_id: r.contact_id, doc: r.doc as unknown as Json })));
  if (error) throw error;
}
