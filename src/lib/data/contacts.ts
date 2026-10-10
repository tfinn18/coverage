import type { Call, Contact, Database, Json } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";

export type ContactPatch = Database["public"]["Tables"]["contacts"]["Update"];
export type ContactInsert = Database["public"]["Tables"]["contacts"]["Insert"];

// RLS limits every query to the signed-in user's rows, so no user_id filter is needed here.

export async function fetchContacts(): Promise<Contact[]> {
  const { data, error } = await createClient()
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10_000);
  if (error) throw error;
  return data;
}

export async function insertContacts(rows: ContactInsert[]): Promise<Contact[]> {
  if (rows.length === 0) return [];
  const { data, error } = await createClient().from("contacts").insert(rows).select("*");
  if (error) throw error;
  return data;
}

export async function updateContact(id: string, patch: ContactPatch): Promise<void> {
  const { error } = await createClient().from("contacts").update(patch).eq("id", id);
  if (error) throw error;
}

export type DeletedContactExtras = { calls: Call[]; notesDoc: Json | null };

/** Deletes a contact (its calls and notes cascade) and returns what's needed to undo the delete. */
export async function deleteContact(id: string): Promise<DeletedContactExtras> {
  const supabase = createClient();
  const [{ data: calls, error: callsError }, { data: notes, error: notesError }] = await Promise.all([
    supabase.from("calls").select("*").eq("contact_id", id),
    supabase.from("contact_notes").select("doc").eq("contact_id", id).maybeSingle(),
  ]);
  if (callsError) throw callsError;
  if (notesError) throw notesError;
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) throw error;
  return { calls, notesDoc: notes?.doc ?? null };
}

/** Puts a deleted contact back with the same id, plus the calls and notes that were removed with it. */
export async function restoreContact(contact: Contact, { calls, notesDoc }: DeletedContactExtras): Promise<void> {
  const supabase = createClient();
  const { user_id: _userId, ...row } = contact;
  const { error } = await supabase.from("contacts").insert(row);
  if (error) throw error;
  if (calls.length > 0) {
    const { error: callsError } = await supabase
      .from("calls")
      .insert(calls.map(({ user_id: _u, ...call }) => call));
    if (callsError) throw callsError;
  }
  if (notesDoc !== null) {
    const { error: notesError } = await supabase.from("contact_notes").insert({ contact_id: contact.id, doc: notesDoc });
    if (notesError) throw notesError;
  }
}

/** Adds the clearly labeled example contacts and calls from "Try with example data". */
export async function insertExampleData(): Promise<Contact[]> {
  const { buildExampleData } = await import("@/lib/examples");
  const { contacts, calls } = buildExampleData(new Date());
  const ids = new Map(contacts.map((c) => [c.key, crypto.randomUUID()]));
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contacts")
    .insert(contacts.map(({ key, doc, ...c }) => ({ ...c, id: ids.get(key) })))
    .select("*");
  if (error) throw error;
  const { error: callsError } = await supabase
    .from("calls")
    .insert(calls.map((c) => ({ contact_id: ids.get(c.key)!, starts_at: c.startsAt.toISOString() })));
  if (callsError) throw callsError;
  const notes = contacts.filter((c) => c.doc).map((c) => ({ contact_id: ids.get(c.key)!, doc: c.doc as unknown as Json }));
  const { error: notesError } = await supabase.from("contact_notes").insert(notes);
  if (notesError) throw notesError;
  return data;
}

/** Deletes every example contact (their calls cascade). Real contacts are untouched. */
export async function deleteExampleData(): Promise<void> {
  const { error } = await createClient().from("contacts").delete().eq("is_example", true);
  if (error) throw error;
}
