import db from "@/lib/db";

export type Readiness = {
  hasResult: boolean;
  hasLink: boolean;
  ready: boolean;
};

/** What a live still needs before it can be transferred to Done Post. */
export function readiness(bookingId: number | string): Readiness {
  const row = db
    .prepare(
      `SELECT b.post_url,
              (SELECT COUNT(*) FROM live_results r WHERE r.booking_id = b.id) AS has_result
       FROM bookings b WHERE b.id = ?`
    )
    .get(bookingId) as any;

  if (!row) return { hasResult: false, hasLink: false, ready: false };

  const hasLink = !!(row.post_url && String(row.post_url).trim());
  const hasResult = row.has_result > 0;
  return { hasResult, hasLink, ready: hasLink && hasResult };
}

/**
 * Completion is an explicit action (the "transfer to Done Post" button), so
 * we never auto-promote here. But a live that has lost its link or its
 * screenshot must not stay in Done Post — demote it back to pending.
 */
/**
 * A live auto-moves to Success only when the marketer has all four:
 * Budget + Spend + Gross Revenue + ROI. Promote-only — never demotes an
 * already-completed live.
 */
export function completeIfReady(bookingId: number | string): string {
  const row = db
    .prepare(
      "SELECT ads_budget, ad_spend, gross_revenue, roi, status FROM bookings WHERE id = ?"
    )
    .get(bookingId) as any;
  if (!row) return "pending";

  const ready =
    row.ads_budget != null &&
    row.ad_spend != null &&
    row.gross_revenue != null &&
    row.roi != null;

  if (ready && row.status !== "completed") {
    db.prepare("UPDATE bookings SET status = 'completed' WHERE id = ?").run(bookingId);
    return "completed";
  }
  return row.status;
}

export function demoteIfIncomplete(bookingId: number | string): string {
  const { ready } = readiness(bookingId);
  const row = db
    .prepare("SELECT status FROM bookings WHERE id = ?")
    .get(bookingId) as any;
  if (!row) return "pending";

  if (row.status === "completed" && !ready) {
    db.prepare("UPDATE bookings SET status = 'pending' WHERE id = ?").run(bookingId);
    return "pending";
  }
  return row.status;
}
