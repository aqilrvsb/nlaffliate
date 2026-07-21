import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Marketer can lock schedule edits once they've set the ad budget. Block
  // the affiliate from changing the timing/details while locked.
  const scheduleKeys = ["profile_id", "live_date", "start_time", "end_time", "note"];
  const touchesSchedule = scheduleKeys.some((k) => k in body);
  if (touchesSchedule) {
    const row = await db.prepare("SELECT ads_budget, affiliate_can_edit FROM bookings WHERE id = ? AND user_id = ?")
      .get(params.id, user.id) as any;
    // Locked only when a budget is set AND the marketer toggle is off.
    const locked = row && row.ads_budget != null && row.affiliate_can_edit === 0;
    if (locked) {
      return NextResponse.json(
        { error: "Your marketer has locked this live. Ask them to allow edits." },
        { status: 403 }
      );
    }
  }

  const fields: string[] = [];
  const values: any[] = [];
  for (const key of ["profile_id", "live_date", "start_time", "end_time", "note", "status"]) {
    if (key in body) {
      fields.push(`${key} = ?`);
      values.push(body[key]);
    }
  }
  if (!fields.length) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  values.push(params.id, user.id);

  const info = await db.prepare(`UPDATE bookings SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`)
    .run(...values);
  if (info.changes === 0)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const info = await db.prepare("DELETE FROM bookings WHERE id = ? AND user_id = ?")
    .run(params.id, user.id);
  if (info.changes === 0)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
