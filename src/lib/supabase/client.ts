import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { SUPABASE_KEY, SUPABASE_URL, assertSupabaseEnv } from "./env";

let browserClient: SupabaseClient<Database> | undefined;

/** Supabase client for Client Components. One shared instance per tab. */
export function createClient() {
  if (!browserClient) {
    assertSupabaseEnv();
    browserClient = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_KEY);
  }
  return browserClient;
}
