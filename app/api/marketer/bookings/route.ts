import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { inhouseProfile } from "@/lib/inhouse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Marketer books a live on an affiliate's behalf.
 *
 * The affiliate normally schedules their own, but a marketer planning the
 * week ahead shouldn't have to wait for each one to do it — and an affiliate
 * who is locked out or slow would otherwise block the whole plan.
 *
 * The profile must belong to an affiliate this marketer manages, and the
 * brand must be their own, so neither can be used to book against someone
 * else's account.
 */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "marketer")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const liveDate = String(body.live_date || "").trim();
  const startTime = String(body.start_time || "").trim();
  const endTime = String(body.end_time || "").trim();
  const note = String(body.note || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(liveDate))
    return NextResponse.json({ error: "Pick a valid date." }, { status: 400 });
  if (!/^\d{2}:\d{2}$/.test(startTime))
    return NextResponse.json({ error: "Pick a start time." }, { status: 400 });
  if (endTime && !/^\d{2}:\d{2}$/.test(endTime))
    return NextResponse.json({ error: "End time must be HH:MM." }, { status: 400 });

  // The profile identifies the affiliate, and must be one of this marketer's
  // own. "inhouse" is a sentinel rather than a real id: the bucket account is
  // created lazily, so it must be bookable before any import has made it.
  let profile: { id: number; user_id: number } | undefined;
  if (String(body.profile_id) === "inhouse") {
    const ih = await inhouseProfile(user.id);
    profile = { id: ih.profileId, user_id: ih.userId };
  } else {
    profile = await db.prepare(
        `SELECT p.id, p.user_id
           FROM tiktok_profiles p
           JOIN users u ON u.id = p.user_id
          WHERE p.id = ? AND u.marketer_id = ?`
      ).get<{ id: number; user_id: number }>(Number(body.profile_id), user.id);
  }
  if (!profile)
    return NextResponse.json(
      { error: "Pick a TikTok profile belonging to one of your affiliates." },
      { status: 400 }
    );

  const brandRaw = String(body.brand_id ?? "").trim();
  if (!brandRaw)
    return NextResponse.json({ error: "Pick a brand." }, { status: 400 });
  const brand = await db
    .prepare("SELECT id FROM brands WHERE id = ? AND marketer_id = ?")
    .get(Number(brandRaw), user.id);
  if (!brand)
    return NextResponse.json({ error: "That brand is not yours." }, { status: 403 });

  const budget = body.ads_budget === "" || body.ads_budget == null
    ? null : Number(body.ads_budget);
  if (budget != null && (!Number.isFinite(budget) || budget < 0))
    return NextResponse.json({ error: "Budget must be a positive number." }, { status: 400 });

  // affiliate_can_edit = 0: the marketer owns a slot they booked, matching
  // what setting a budget already does.
  const info = await db.prepare(
      `INSERT INTO bookings
         (user_id, profile_id, brand_id, live_date, start_time, end_time, note,
          status, source, affiliate_can_edit, ads_budget)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, 0, ?) RETURNING id`
    ).run(
      profile.user_id, profile.id, Number(brandRaw), liveDate, startTime,
      endTime || null, note || null,
      String(body.profile_id) === "inhouse" ? "inhouse" : "affiliate",
      budget
    );

  return NextResponse.json({ ok: true, id: Number(info.lastInsertRowid) });
}
