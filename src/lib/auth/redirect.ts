export const DEFAULT_APP_PATH = "/contacts";

/**
 * Returns a same-site path to send the user to after auth, or the app home.
 * Rejects absolute URLs and protocol-relative paths so `?next=` can't be used as an open redirect.
 */
export function safeNextPath(next: string | null | undefined, fallback = DEFAULT_APP_PATH): string {
  if (!next) return fallback;
  let decoded: string;
  try {
    decoded = decodeURIComponent(next);
  } catch {
    return fallback;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(decoded)) return fallback;
  if (decoded === "/login" || decoded === "/signup" || decoded.startsWith("/auth/")) return fallback;
  return decoded;
}
