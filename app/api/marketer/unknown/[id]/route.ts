import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { completeIfReady } from "@/lib/status";
import { inhouseProfile } from "@/lib/inhouse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Turn an Unknown row into a real schedule under Inhouse.
 *
 * Unknown holds analytics rows that matched no schedule. The marketer's job
 * is to drain it to zero: converting a row books it against the Inhouse
 * account with its figures attached, so it appears in Pending/Success and
 * counts toward reporting instead of sitting in limbo.
 *
 * The row is deleted once converted — it now exists as a booking, and
 * leaving both would double-count it.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user || user.role !== "marketer")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const row = await db
    .prepare(
      `SELECT id, live_name, live_date, live_time, duration, ad_spend, gross_revenue, roi
         FROM unknown_lives WHERE id = ? AND marketer_id = ?`
    )
    .get<{
      id: number; live_name: string | null; live_date: string | null;
      live_time: string | null; duration: string | null;
      ad_spend: number | null; gross_revenue: number | null; roi: number | null;
    }>(params.id, user.id);
  if (!row) return NextResponse.json({ error: "Row not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  // The marketer can correct anything before it becomes a schedule; the row's
  // own values are the defaults.
  const liveDate = String(body.live_date || row.live_date || "").trim();
  const startTime = String(body.start_time || row.live_time || "").trim();
  const endTime = String(body.end_time || "").trim();
  const duration = String(body.duration_live ?? row.duration ?? "").trim();
  const note = String(body.note ?? row.live_name ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(liveDate))
    return NextResponse.json({ error: "Pick a valid date." }, { status: 400 });
  if (!/^\d{2}:\d{2}$/.test(startTime))
    return NextResponse.json({ error: "Pick a valid start time (HH:MM)." }, { status: 400 });
  if (endTime && !/^\d{2}:\d{2}$/.test(endTime))
    return NextResponse.json({ error: "End time must be HH:MM." }, { status: 400 });

  // Brand is optional here — the live already happened, and forcing a brand
  // would stop the marketer clearing Unknown.
  let brandId: number | null = null;
  const brandRaw = String(body.brand_id ?? "").trim();
  if (brandRaw) {
    const b = await db
      .prepare("SELECT id FROM brands WHERE id = ? AND marketer_id = ?")
      .get(Number(brandRaw), user.id);
    if (!b) return NextResponse.json({ error: "That brand is not yours." }, { status: 403 });
    brandId = Number(brandRaw);
  }

  const num = (v: any, fallback: number | null) => {
    if (v === "" || v == null) return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const budget = num(body.ads_budget, null);
  const spend = num(body.ad_spend, row.ad_spend);
  const gross = num(body.gross_revenue, row.gross_revenue);
  const roi = num(body.roi, row.roi);

  const inhouse = await inhouseProfile(user.id);

  const info = await db
    .prepare(
      `INSERT INTO bookings
         (user_id, profile_id, brand_id, live_date, start_time, end_time, note,
          status, source, affiliate_can_edit, ads_budget, ad_spend, gross_revenue, roi)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'inhouse', 1, ?, ?, ?, ?) RETURNING id`
    )
    .run(
      inhouse.userId, inhouse.profileId, brandId, liveDate, startTime,
      endTime || null, note || null, budget, spend, gross, roi
    );
  const bookingId = Number(info.lastInsertRowid);

  if (duration) {
    await db
      .prepare(
        "INSERT INTO live_results (booking_id, user_id, duration_live) VALUES (?, ?, ?)"
      )
      .run(bookingId, inhouse.userId, duration);
  }

  // Budget + Spend + Gross + ROI present -> it lands straight in Success.
  const status = await completeIfReady(bookingId);

  await db.prepare("DELETE FROM unknown_lives WHERE id = ?").run(params.id);

  return NextResponse.json({ ok: true, booking_id: bookingId, status });
}

/** Discard a row that should not become a schedule at all. */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user || user.role !== "marketer")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const info = await db
    .prepare("DELETE FROM unknown_lives WHERE id = ? AND marketer_id = ?")
    .run(params.id, user.id);
  if (info.changes === 0)
    return NextResponse.json({ error: "Row not found." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
