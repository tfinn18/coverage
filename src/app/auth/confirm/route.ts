import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Links in sign-up confirmation and password reset emails land here.
 *
 * Supabase's default email templates send a PKCE `code`, which can only be exchanged in the
 * same browser that requested the email. Custom templates (which need custom SMTP) can send a
 * `token_hash` instead, which works on any device; both are supported.
 * Password reset emails are requested with `?next=/reset-password`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const isRecovery = type === "recovery" || next === "/reset-password";
  const destination = isRecovery ? "/reset-password" : safeNextPath(next, "/contacts?welcome=1");

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(destination, origin));
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destination, origin));
  }

  if (isRecovery) return NextResponse.redirect(new URL("/forgot-password?error=link_invalid", origin));
  // A sign-up link opened in a different browser can't sign in here, but Supabase has
  // already confirmed the email by this point, so logging in will work.
  const failCode = code ? "confirm_other_browser" : "link_invalid";
  return NextResponse.redirect(new URL(`/login?error=${failCode}`, origin));
}
