import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { liveSummary, notifyScheduleChange } from "@/lib/notify";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db.prepare(
      `SELECT b.*, p.label AS profile_label, p.url AS profile_url,
              pb.name AS profile_brand,
              br.name AS brand_name,
              r.id AS result_id, r.live_title, r.gmv, r.viewers, r.items_sold,
              r.duration_live, r.screenshot_path
       FROM bookings b
       JOIN tiktok_profiles p ON p.id = b.profile_id
       LEFT JOIN brands pb ON pb.id = p.brand_id
       LEFT JOIN brands br ON br.id = b.brand_id
       LEFT JOIN live_results r ON r.booking_id = b.id
       WHERE b.user_id = ?
       ORDER BY b.live_date DESC, b.start_time DESC`
    )
    .all(user.id);
  return NextResponse.json({ bookings: rows });
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { profile_id, live_date, start_time, end_time, note } = body;
  // End time is required: hourly commission and the booked slot both depend
  // on knowing when the live finishes.
  if (!profile_id || !live_date || !start_time || !end_time) {
    return NextResponse.json(
      { error: "Profile, date, start time and end time are required." },
      { status: 400 }
    );
  }

  // ensure the profile belongs to this user
  const owns = await db.prepare("SELECT id FROM tiktok_profiles WHERE id = ? AND user_id = ?")
    .get(profile_id, user.id);
  if (!owns) return NextResponse.json({ error: "Invalid profile." }, { status: 400 });

  // The brand must belong to this affiliate's own marketer — otherwise a
  // booking could be filed against another marketer's brand.
  const brandRaw = String(body.brand_id ?? "").trim();
  const brandId = Number(brandRaw);
  if (!brandRaw || !Number.isFinite(brandId)) {
    return NextResponse.json({ error: "Pick a brand." }, { status: 400 });
  }
  const brand = await db.prepare(
      `SELECT b.id FROM brands b
         JOIN users a ON a.marketer_id = b.marketer_id
        WHERE b.id = ? AND a.id = ?`
    ).get(brandId, user.id);
  if (!brand) {
    return NextResponse.json(
      { error: "That brand is not available to you." },
      { status: 403 }
    );
  }


  // The brand must actually be registered on this link. A live is paid at the
  // rate set for the (link, brand) pair, so a mismatch books a live that
  // nothing can pay and that reporting cannot group.
  const onLink = await db
    .prepare("SELECT 1 AS ok FROM tiktok_profile_brands WHERE profile_id = ? AND brand_id = ?")
    .get(profile_id, brandId);
  if (!onLink) {
    return NextResponse.json(
      { error: "Brand itu tidak didaftarkan pada link profile ini." },
      { status: 400 }
    );
  }

  // Status is set explicitly (not left to the column default) so existing
  // databases created before the pending/completed rename behave correctly.
  const info = await db.prepare(
      `INSERT INTO bookings (user_id, profile_id, brand_id, live_date, start_time, end_time, note, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending') RETURNING id`
    )
    .run(user.id, profile_id, brandId, live_date, start_time, end_time, note || null);

  const id = Number(info.lastInsertRowid);
  // The marketer plans budgets around a schedule they do not own, so a new
  // live is news. Best-effort — a failed message must not fail the booking.
  await notifyScheduleChange("created", await liveSummary(id));

  return NextResponse.json({ id });
}
