/** Today's date in Kuala Lumpur (GMT+8) as YYYY-MM-DD. */
export function todayKL(): string {
  // en-CA formats as YYYY-MM-DD. Fixing the timeZone keeps server and
  // client renders identical, so there's no hydration mismatch.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** First and last day of the current month in Kuala Lumpur, YYYY-MM-DD. */
export function monthRangeKL(): { from: string; to: string } {
  const [y, m] = todayKL().split("-").map(Number);
  const mm = String(m).padStart(2, "0");
  // Day 0 of the *next* month is the last day of this one.
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(lastDay).padStart(2, "0")}` };
}

export type ResolvedRange = { from: string; to: string; showAll: boolean };

/**
 * Resolve the active date range from URL params.
 *   - ?all=1         -> no date filtering
 *   - ?from=&to=     -> explicit range
 *   - otherwise      -> the `mode` default:
 *        "today" (default) -> today .. today
 *        "month"           -> first .. last day of the current month
 *        "all"             -> no date filtering
 */
export function resolveRange(
  p: { from?: string | null; to?: string | null; all?: string | null },
  mode: "today" | "month" | "all" = "today"
): ResolvedRange {
  if (p.all === "1") return { from: "", to: "", showAll: true };
  if (p.from || p.to) {
    const t = todayKL();
    return { from: p.from ?? t, to: p.to ?? t, showAll: false };
  }
  if (mode === "all") return { from: "", to: "", showAll: true };
  if (mode === "month") {
    const m = monthRangeKL();
    return { from: m.from, to: m.to, showAll: false };
  }
  const t = todayKL();
  return { from: t, to: t, showAll: false };
}
