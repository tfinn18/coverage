/**
 * Proves Row Level Security keeps users apart, using two ordinary accounts and only the
 * public (publishable/anon) key — the same access any browser has. No service role key.
 *
 * Setup: create two users in Supabase → Authentication → Users → Add user (tick "Auto Confirm User"),
 * then set TEST_USER_A_* and TEST_USER_B_* in .env.local. Run: npm run test:rls
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/database.types";

config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const a = { email: process.env.TEST_USER_A_EMAIL, password: process.env.TEST_USER_A_PASSWORD };
const b = { email: process.env.TEST_USER_B_EMAIL, password: process.env.TEST_USER_B_PASSWORD };
const configured = Boolean(url && key && a.email && a.password && b.email && b.password);

if (!configured) {
  console.warn(
    "\n[test:rls] Skipped: set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and TEST_USER_A/B_EMAIL/PASSWORD in .env.local.\n",
  );
}

type Client = SupabaseClient<Database>;

function newClient(): Client {
  return createClient<Database>(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function signIn(creds: { email?: string; password?: string }) {
  const client = newClient();
  const { data, error } = await client.auth.signInWithPassword({ email: creds.email!, password: creds.password! });
  if (error) throw new Error(`Could not sign in ${creds.email}: ${error.message}`);
  return { client, userId: data.user.id };
}

describe.skipIf(!configured)("Row Level Security isolation", () => {
  let alice: { client: Client; userId: string };
  let bob: { client: Client; userId: string };
  let contactId: string;
  let callId: string;
  const marker = `rls-test-${Date.now()}`;

  beforeAll(async () => {
    alice = await signIn(a);
    bob = await signIn(b);
    expect(alice.userId).not.toBe(bob.userId);

    const { data: contact, error } = await alice.client
      .from("contacts")
      .insert({ company: "RLS Test Co", name: marker, title: "Analyst" })
      .select()
      .single();
    if (error) throw error;
    contactId = contact.id;

    const { data: call, error: callError } = await alice.client
      .from("calls")
      .insert({ contact_id: contactId, starts_at: new Date().toISOString() })
      .select()
      .single();
    if (callError) throw callError;
    callId = call.id;
  });

  afterAll(async () => {
    if (alice && contactId) await alice.client.from("contacts").delete().eq("id", contactId);
    await alice?.client.auth.signOut();
    await bob?.client.auth.signOut();
  });

  it("lets the owner read their own rows", async () => {
    const { data } = await alice.client.from("contacts").select("id, user_id").eq("id", contactId);
    expect(data).toEqual([{ id: contactId, user_id: alice.userId }]);
  });

  it("hides another user's contacts, calls and profile", async () => {
    const contacts = await bob.client.from("contacts").select("id").eq("id", contactId);
    expect(contacts.error).toBeNull();
    expect(contacts.data).toEqual([]);

    const byOwner = await bob.client.from("contacts").select("id").eq("user_id", alice.userId);
    expect(byOwner.data).toEqual([]);

    const calls = await bob.client.from("calls").select("id").eq("id", callId);
    expect(calls.data).toEqual([]);

    const profile = await bob.client.from("profiles").select("id").eq("id", alice.userId);
    expect(profile.data).toEqual([]);
  });

  it("blocks updating another user's rows", async () => {
    const { data } = await bob.client.from("contacts").update({ notes: "hacked" }).eq("id", contactId).select();
    expect(data).toEqual([]);

    const { data: calls } = await bob.client
      .from("calls")
      .update({ starts_at: new Date(0).toISOString() })
      .eq("id", callId)
      .select();
    expect(calls).toEqual([]);

    const { data: check } = await alice.client.from("contacts").select("notes").eq("id", contactId).single();
    expect(check?.notes).toBe("");
  });

  it("blocks deleting another user's rows", async () => {
    const { data } = await bob.client.from("contacts").delete().eq("id", contactId).select();
    expect(data).toEqual([]);

    const { data: calls } = await bob.client.from("calls").delete().eq("id", callId).select();
    expect(calls).toEqual([]);

    const { count } = await alice.client.from("contacts").select("id", { count: "exact", head: true }).eq("id", contactId);
    expect(count).toBe(1);
  });

  it("blocks inserting rows owned by someone else", async () => {
    const { error } = await bob.client.from("contacts").insert({ user_id: alice.userId, name: "Impostor" });
    expect(error?.code).toBe("42501");
  });

  it("blocks attaching a call to another user's contact", async () => {
    const { error } = await bob.client
      .from("calls")
      .insert({ contact_id: contactId, starts_at: new Date().toISOString() });
    expect(error?.code).toBe("42501");
  });

  it("shows logged-out visitors nothing", async () => {
    const anon = newClient();
    const { data } = await anon.from("contacts").select("id").eq("id", contactId);
    expect(data ?? []).toEqual([]);
  });
});
