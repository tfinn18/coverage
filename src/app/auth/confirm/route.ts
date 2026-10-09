import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_APP_PATH } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Links in sign-up confirmation and password reset emails land here.
 * Supports both the token_hash link (works on any device) and the default `code` link.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const isRecovery = type === "recovery";
  const destination = isRecovery ? "/reset-password" : `${DEFAULT_APP_PATH}?welcome=1`;

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(destination, origin));
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destination, origin));
  }

  const failPath = isRecovery ? "/forgot-password?error=link_invalid" : "/login?error=link_invalid";
  return NextResponse.redirect(new URL(failPath, origin));
}
