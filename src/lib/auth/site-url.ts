/** The origin auth emails and OAuth should send people back to. Prefers the current browser origin. */
export function siteOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
