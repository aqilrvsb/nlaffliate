import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db.prepare(
      `SELECT b.*, p.label AS profile_label, p.url AS profile_url,
              r.id AS result_id, r.live_title, r.gmv, r.viewers, r.items_sold,
              r.duration_live, r.screenshot_path
       FROM bookings b
       JOIN tiktok_profiles p ON p.id = b.profile_id
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

  const { profile_id, live_date, start_time, end_time, note } = await req.json();
  if (!profile_id || !live_date || !start_time) {
    return NextResponse.json(
      { error: "Profile, date and start time are required." },
      { status: 400 }
    );
  }

  // ensure the profile belongs to this user
  const owns = await db.prepare("SELECT id FROM tiktok_profiles WHERE id = ? AND user_id = ?")
    .get(profile_id, user.id);
  if (!owns) return NextResponse.json({ error: "Invalid profile." }, { status: 400 });

  // Status is set explicitly (not left to the column default) so existing
  // databases created before the pending/completed rename behave correctly.
  const info = await db.prepare(
      `INSERT INTO bookings (user_id, profile_id, live_date, start_time, end_time, note, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending') RETURNING id`
    )
    .run(user.id, profile_id, live_date, start_time, end_time || null, note || null);
  return NextResponse.json({ id: Number(info.lastInsertRowid) });
}
