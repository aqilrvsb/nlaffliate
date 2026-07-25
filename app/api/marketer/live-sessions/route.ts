import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Create a live session for one of the marketer's live users. No login and no
 * notification — this is a plain schedule row the marketer manages.
 */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "marketer" && user.role !== "leader")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const liveUserId = Number(body.live_user_id);
  const liveDate = String(body.live_date ?? "").trim();
  const start = String(body.start_time ?? "").trim() || null;
  const end = String(body.end_time ?? "").trim() || null;
  const note = String(body.note ?? "").trim() || null;
  const brandRaw = String(body.brand_id ?? "").trim();
  const brandId = brandRaw ? Number(brandRaw) : null;

  if (!Number.isFinite(liveUserId))
    return NextResponse.json({ error: "Pilih live user." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(liveDate))
    return NextResponse.json({ error: "Pilih tarikh yang sah." }, { status: 400 });

  const lu = await db.prepare("SELECT id FROM live_users WHERE id = ? AND marketer_id = ?")
    .get(liveUserId, user.id);
  if (!lu) return NextResponse.json({ error: "Live user not found." }, { status: 404 });

  if (brandId != null) {
    const b = await db.prepare("SELECT id FROM brands WHERE id = ? AND marketer_id = ?")
      .get(brandId, user.id);
    if (!b) return NextResponse.json({ error: "That brand is not yours." }, { status: 403 });
  }

  const info = await db.prepare(
      `INSERT INTO live_sessions (marketer_id, live_user_id, brand_id, live_date, start_time, end_time, note, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending') RETURNING id`
    ).run(user.id, liveUserId, brandId, liveDate, start, end, note);
  return NextResponse.json({ ok: true, id: Number(info.lastInsertRowid) });
}
