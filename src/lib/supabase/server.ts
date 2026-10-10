import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "@/lib/database.types";
import { SUPABASE_KEY, SUPABASE_URL, assertSupabaseEnv } from "./env";

/** Supabase client for Server Components, Route Handlers and Server Actions. Create one per request. */
export async function createClient() {
  assertSupabaseEnv();
  // Auth is per-request: opt out of prerendering before Supabase reads the clock or cookies.
  await connection();
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components can't set cookies. The proxy refreshes the session instead.
        }
      },
    },
  });
}
