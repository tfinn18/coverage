import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

/** The signed-in user for Server Components, narrowed to what the UI needs. Redirects to /login if signed out. */
export async function getCurrentUser(): Promise<CurrentUser> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const meta = user.user_metadata ?? {};

  return {
    id: user.id,
    email: user.email ?? "",
    name: profile?.full_name ?? meta.full_name ?? meta.name ?? null,
    avatarUrl: typeof meta.avatar_url === "string" ? meta.avatar_url : null,
  };
}
