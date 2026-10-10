type AuthLikeError = { code?: string; message?: string; status?: number } | null | undefined;

const MESSAGES: Record<string, string> = {
  invalid_credentials: "That email and password don't match. Check for typos, or reset your password.",
  email_not_confirmed: "Please confirm your email first. Check your inbox for the link we sent.",
  user_already_exists: "An account with this email already exists. Try logging in instead.",
  email_exists: "An account with this email already exists. Try logging in instead.",
  weak_password: "That password is too weak. Use at least 8 characters with a letter and a number.",
  same_password: "Your new password must be different from your current one.",
  over_email_send_rate_limit: "We've sent too many emails recently. Please wait a few minutes and try again.",
  over_request_rate_limit: "Too many attempts. Please wait a minute and try again.",
  otp_expired: "That link has expired or was already used. Request a new one.",
  email_address_invalid: "That email address doesn't look right.",
  validation_failed: "Please check the form and try again.",
  signup_disabled: "Sign-ups are turned off right now.",
  session_not_found: "Your session has expired. Please log in again.",
  user_not_found: "We couldn't find that account.",
  reauthentication_needed: "Please log in again before changing your password.",
};

/** Turns a Supabase auth error into a friendly sentence for the UI. */
export function friendlyAuthError(error: AuthLikeError): string {
  if (!error) return "Something went wrong. Please try again.";
  if (error.code && MESSAGES[error.code]) return MESSAGES[error.code];

  const msg = (error.message ?? "").toLowerCase();
  if (msg.includes("invalid login credentials")) return MESSAGES.invalid_credentials;
  if (msg.includes("email not confirmed")) return MESSAGES.email_not_confirmed;
  if (msg.includes("already registered")) return MESSAGES.user_already_exists;
  if (msg.includes("rate limit")) return MESSAGES.over_email_send_rate_limit;
  if (msg.includes("failed to fetch") || msg.includes("network"))
    return "We couldn't reach the server. Check your connection and try again.";
  return "Something went wrong. Please try again.";
}

/** Messages for `?error=` codes our own routes put in the URL. */
export const URL_ERROR_MESSAGES: Record<string, string> = {
  link_invalid: "That link is invalid or has expired. Please request a new one.",
  confirm_other_browser:
    "If you just clicked your confirmation link, your email is confirmed. Log in below to continue.",
  oauth_failed: "Google sign-in didn't complete. Please try again.",
  session_expired: "Your reset link has expired. Request a new one below.",
};
