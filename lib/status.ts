import db from "@/lib/db";

export type Readiness = {
  hasResult: boolean;
  hasLink: boolean;
  ready: boolean;
};

/** What a live still needs before it can be transferred to Done Post. */
export async function readiness(bookingId: number | string): Promise<Readiness> {
  const row = await db
    .prepare(
      `SELECT b.post_url,
              (SELECT COUNT(*)::int FROM live_results r WHERE r.booking_id = b.id) AS has_result
       FROM bookings b WHERE b.id = ?`
    )
    .get<{ post_url: string | null; has_result: number }>(bookingId);

  if (!row) return { hasResult: false, hasLink: false, ready: false };

  const hasLink = !!(row.post_url && String(row.post_url).trim());
  const hasResult = row.has_result > 0;
  return { hasResult, hasLink, ready: hasLink && hasResult };
}

/**
 * A live auto-moves to Success only when the marketer has all four:
 * Budget + Spend + Gross Revenue + ROI. Promote-only — never demotes an
 * already-completed live.
 */
export async function completeIfReady(bookingId: number | string): Promise<string> {
  const row = await db
    .prepare(
      "SELECT ads_budget, ad_spend, gross_revenue, roi, status FROM bookings WHERE id = ?"
    )
    .get<any>(bookingId);
  if (!row) return "pending";

  const ready =
    row.ads_budget != null &&
    row.ad_spend != null &&
    row.gross_revenue != null &&
    row.roi != null;

  if (ready && row.status !== "completed") {
    await db.prepare("UPDATE bookings SET status = 'completed' WHERE id = ?").run(bookingId);
    return "completed";
  }
  return row.status;
}

/**
 * Completion is an explicit action, so we never auto-promote here. But a live
 * that has lost its link or its screenshot must not stay in Done Post.
 */
export async function demoteIfIncomplete(bookingId: number | string): Promise<string> {
  const { ready } = await readiness(bookingId);
  const row = await db
    .prepare("SELECT status FROM bookings WHERE id = ?")
    .get<{ status: string }>(bookingId);
  if (!row) return "pending";

  if (row.status === "completed" && !ready) {
    await db.prepare("UPDATE bookings SET status = 'pending' WHERE id = ?").run(bookingId);
    return "pending";
  }
  return row.status;
}
