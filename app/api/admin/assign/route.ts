import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { affiliate_id, marketer_id } = await req.json();
  if (!affiliate_id)
    return NextResponse.json({ error: "affiliate_id required" }, { status: 400 });

  // affiliate must be an affiliate
  const aff = db
    .prepare("SELECT id FROM users WHERE id = ? AND role = 'affiliate'")
    .get(affiliate_id);
  if (!aff) return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });

  // marketer_id may be null (unassign) or must be a marketer
  let mid: number | null = null;
  if (marketer_id) {
    const mk = db
      .prepare("SELECT id FROM users WHERE id = ? AND role = 'marketer'")
      .get(marketer_id);
    if (!mk) return NextResponse.json({ error: "Marketer not found" }, { status: 404 });
    mid = Number(marketer_id);
  }

  db.prepare("UPDATE users SET marketer_id = ? WHERE id = ?").run(mid, affiliate_id);
  return NextResponse.json({ ok: true });
}
