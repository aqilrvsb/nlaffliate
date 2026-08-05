import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Grab a pending (un-owned) schedule created by a shared affiliate. First come,
 * first served: the UPDATE only lands while it's still un-owned AND the affiliate
 * is one this marketer manages, so two marketers racing can't both win. Once
 * grabbed, the schedule is this marketer's and rolls up to their reporting.
 */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user || (user.role !== "marketer" && user.role !== "leader"))
    return NextResponse.json({ error: "Marketers only." }, { status: 403 });

  const { booking_id } = await req.json().catch(() => ({}));
  const id = Number(booking_id);
  if (!Number.isFinite(id))
    return NextResponse.json({ error: "booking_id required" }, { status: 400 });

  const done = await db
    .prepare(
      `UPDATE bookings SET marketer_id = ?
        WHERE id = ? AND marketer_id IS NULL
          AND user_id IN (SELECT affiliate_id FROM affiliate_marketers WHERE marketer_id = ?)
        RETURNING id`
    )
    .run(user.id, id, user.id);

  if (!done.changes)
    return NextResponse.json(
      { error: "Jadual ini sudah diambil marketer lain atau bukan affiliate anda." },
      { status: 409 }
    );

  return NextResponse.json({ ok: true });
}
