import type { Call, Contact, Database } from "@/lib/database.types";
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

/** Deletes a contact (its calls cascade) and returns what's needed to undo the delete. */
export async function deleteContact(id: string): Promise<{ calls: Call[] }> {
  const supabase = createClient();
  const { data: calls, error: callsError } = await supabase.from("calls").select("*").eq("contact_id", id);
  if (callsError) throw callsError;
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) throw error;
  return { calls };
}

/** Puts a deleted contact back with the same id, plus any calls that were removed with it. */
export async function restoreContact(contact: Contact, calls: Call[]): Promise<void> {
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
}
