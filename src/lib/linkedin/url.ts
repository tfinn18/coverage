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

/**
 * Guesses a display name from a profile URL's slug, e.g. /in/ava-chen-8b2a91 → "Ava Chen".
 * Drops LinkedIn's trailing ID segments (any part containing a digit). This is only a starting
 * point: the user confirms or edits it in the review step.
 */
export function nameFromLinkedInUrl(url: string): string {
  const normalized = normalizeLinkedInUrl(url);
  if (!normalized) return "";
  const slug = decodeURIComponent(normalized.split("/in/")[1] ?? "");
  const parts = slug.split(/[-_]+/).filter(Boolean);
  while (parts.length > 1 && /\d/.test(parts[parts.length - 1])) parts.pop();
  return parts
    .filter((p) => !/\d/.test(p))
    .map((p) => p.charAt(0).toLocaleUpperCase() + p.slice(1))
    .join(" ");
}
