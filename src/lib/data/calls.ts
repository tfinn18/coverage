import type { Call } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";

// RLS limits every query to the signed-in user's rows (and only lets calls point at their own contacts).

export async function fetchCalls(): Promise<Call[]> {
  const { data, error } = await createClient().from("calls").select("*").order("starts_at").limit(10_000);
  if (error) throw error;
  return data;
}

export async function createCall(contactId: string, startsAt: Date, durationMinutes = 30): Promise<Call> {
  const { data, error } = await createClient()
    .from("calls")
    .insert({ contact_id: contactId, starts_at: startsAt.toISOString(), duration_minutes: durationMinutes })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function moveCall(id: string, startsAt: Date): Promise<void> {
  const { error } = await createClient().from("calls").update({ starts_at: startsAt.toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function deleteCall(id: string): Promise<void> {
  const { error } = await createClient().from("calls").delete().eq("id", id);
  if (error) throw error;
}
