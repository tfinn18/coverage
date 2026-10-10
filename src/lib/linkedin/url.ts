/**
 * Normalizes a LinkedIn profile URL to https://www.linkedin.com/in/<slug>.
 * Accepts missing protocol, country subdomains, trailing slashes and query strings.
 * Returns null for anything that isn't a linkedin.com/in/ profile link.
 */
export function normalizeLinkedInUrl(input: string | null | undefined): string | null {
  const raw = input?.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) return null;
  const match = url.pathname.match(/^\/in\/([^/]+)\/?/i);
  if (!match) return null;
  let slug: string;
  try {
    slug = decodeURIComponent(match[1]);
  } catch {
    return null;
  }
  if (!slug.trim()) return null;
  return `https://www.linkedin.com/in/${encodeURIComponent(slug)}`;
}
