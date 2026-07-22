/**
 * How a TikTok link identifies itself.
 *
 * Links used to carry a hand-typed label ("Main"), which said nothing useful
 * once an affiliate ran several accounts. What actually distinguishes them is
 * the brand they run and the account handle, so both are derived rather than
 * asked for.
 */

/** "https://www.tiktok.com/@ida.glow" -> "@ida.glow" */
export function handleFromUrl(url?: string | null): string {
  if (!url) return "";
  const m = String(url).match(/@([A-Za-z0-9._-]+)/);
  if (m) return `@${m[1]}`;
  // No handle in the path — fall back to the last meaningful segment.
  const tail = String(url).replace(/\/+$/, "").split("/").pop();
  return tail && tail !== "www.tiktok.com" ? tail : "TikTok";
}

/**
 * What to show for a link: the brand it runs, or its handle until a brand is
 * assigned. Never blank, so a link always has something to click.
 */
export function profileName(
  brandName?: string | null,
  url?: string | null
): string {
  const brand = String(brandName ?? "").trim();
  return brand || handleFromUrl(url);
}
