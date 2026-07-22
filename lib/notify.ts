import db from "@/lib/db";
import {
  sendWhatsApp, marketerContact, scheduleAlert, resultsAlert, type LiveSummary,
} from "@/lib/whatsapp";
import { fmtDate } from "@/lib/format";
import { profileName } from "@/lib/tiktok";

/**
 * Marketer alerts for what their affiliates do.
 *
 * A marketer plans budgets around a schedule they do not own, so a live
 * appearing, moving or vanishing is news they need. Every send is
 * best-effort and never blocks the action that triggered it — the booking is
 * the real work, the message is a courtesy on top.
 */

type Row = {
  affiliate_id: number;
  affiliate: string;
  brand: string | null;
  profile_brand: string | null;
  profile_url: string | null;
  live_date: string;
  start_time: string | null;
  end_time: string | null;
  note: string | null;
};

/** Everything a message needs, read before the row can be deleted. */
export async function liveSummary(bookingId: number | string) {
  const r = await db
    .prepare(
      `SELECT b.user_id AS affiliate_id, u.name AS affiliate,
              br.name AS brand, pb.name AS profile_brand, p.url AS profile_url,
              b.live_date, b.start_time, b.end_time, b.note
         FROM bookings b
         JOIN users u ON u.id = b.user_id
         JOIN tiktok_profiles p ON p.id = b.profile_id
         LEFT JOIN brands pb ON pb.id = p.brand_id
         LEFT JOIN brands br ON br.id = b.brand_id
        WHERE b.id = ?`
    )
    .get<Row>(bookingId);
  if (!r) return null;

  const summary: LiveSummary = {
    affiliate: r.affiliate,
    brand: r.brand,
    profile: profileName(r.profile_brand, r.profile_url),
    date: fmtDate(r.live_date),
    start: r.start_time,
    end: r.end_time,
    note: r.note,
  };
  return { affiliateId: r.affiliate_id, summary };
}

async function toMarketer(affiliateId: number, message: string) {
  try {
    const c = await marketerContact(affiliateId);
    if (!c?.marketer_phone) return;
    const res = await sendWhatsApp(c.marketer_phone, message);
    if (!res.ok) console.error("[whatsapp] marketer alert failed:", res.skipped || res.error);
  } catch (e: any) {
    console.error("[whatsapp] marketer alert threw:", e?.message);
  }
}

/** Affiliate booked, changed or removed a live. */
export async function notifyScheduleChange(
  kind: "created" | "updated" | "deleted",
  snapshot: { affiliateId: number; summary: LiveSummary } | null
) {
  if (!snapshot) return;
  await toMarketer(snapshot.affiliateId, scheduleAlert(kind, snapshot.summary));
}

/** Affiliate uploaded a screenshot; the figures read from it ride along. */
export async function notifyResults(
  bookingId: number | string,
  figures: {
    gmv?: number | null; viewers?: number | null; items_sold?: number | null;
    duration?: string | null; title?: string | null;
  }
) {
  const snap = await liveSummary(bookingId);
  if (!snap) return;
  await toMarketer(snap.affiliateId, resultsAlert(snap.summary, figures));
}
