import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { liveSummary, notifyScheduleToOwnerOrManagers } from "@/lib/notify";

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
  // Any real brand may be booked — the on-link check below is the guard (the
  // brand must be registered on this link). Brands aren't tied to one marketer.
  const brand = await db.prepare("SELECT id FROM brands WHERE id = ?").get(brandId);
  if (!brand) {
    return NextResponse.json({ error: "Brand tidak wujud." }, { status: 400 });
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

  // Who owns this schedule? An affiliate with a single marketer → that marketer
  // owns it straight away (old flow). With several marketers it's left
  // unowned (marketer_id NULL) and lands in the pending grab pool — the first
  // of their marketers to grab it becomes the owner.
  const managers = (await db
    .prepare("SELECT marketer_id FROM affiliate_marketers WHERE affiliate_id = ?")
    .all<{ marketer_id: number }>(user.id)).map((m) => Number(m.marketer_id));
  const ownerId = managers.length === 1 ? managers[0] : null;

  // Status is set explicitly (not left to the column default) so existing
  // databases created before the pending/completed rename behave correctly.
  const info = await db.prepare(
      `INSERT INTO bookings (user_id, profile_id, brand_id, live_date, start_time, end_time, note, status, marketer_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?) RETURNING id`
    )
    .run(user.id, profile_id, brandId, live_date, start_time, end_time, note || null, ownerId);

  const id = Number(info.lastInsertRowid);
  // A new live is news for the marketers planning budgets around it. When
  // pending, EVERY managing marketer is told (any can grab it); once owned,
  // only the owner. Best-effort — a failed message must not fail the booking.
  await notifyScheduleToOwnerOrManagers("created", await liveSummary(id), ownerId);

  return NextResponse.json({ id });
}
