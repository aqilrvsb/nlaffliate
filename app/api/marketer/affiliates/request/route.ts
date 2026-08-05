import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { normaliseStaffId } from "@/lib/staff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A marketer requests to also manage an existing affiliate by their Staff ID
 * (AFL-###). An affiliate can be managed by several marketers at once
 * (affiliate_marketers); they share the same TikTok links/commissions, but each
 * marketer owns the schedules they create or grab. This just adds the
 * membership — the affiliate keeps their single login.
 */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user || (user.role !== "marketer" && user.role !== "leader"))
    return NextResponse.json({ error: "Marketers only." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const staffId = normaliseStaffId(body.staff_id ?? "");
  if (!staffId)
    return NextResponse.json({ error: "Masukkan ID Staff affiliate (AFL-###)." }, { status: 400 });

  const aff = await db
    .prepare("SELECT id, name, staff_id, marketer_id FROM users WHERE staff_id = ? AND role = 'affiliate'")
    .get<{ id: number; name: string; staff_id: string; marketer_id: number | null }>(staffId);
  if (!aff)
    return NextResponse.json({ error: `Tiada affiliate dengan ID ${staffId}.` }, { status: 404 });

  const already = await db
    .prepare("SELECT 1 AS ok FROM affiliate_marketers WHERE marketer_id = ? AND affiliate_id = ?")
    .get(user.id, aff.id);
  if (already)
    return NextResponse.json({ error: `${aff.name} sudah dalam senarai anda.` }, { status: 409 });

  await db
    .prepare("INSERT INTO affiliate_marketers (marketer_id, affiliate_id) VALUES (?, ?) ON CONFLICT DO NOTHING")
    .run(user.id, aff.id);

  // If the affiliate had no primary marketer yet (was pending), the requester
  // becomes it and the account is opened — so "Done Register" stays truthful.
  if (aff.marketer_id == null) {
    await db.prepare("UPDATE users SET marketer_id = ?, activated = true WHERE id = ?").run(user.id, aff.id);
  }

  return NextResponse.json({ ok: true, affiliate: { name: aff.name, staff_id: aff.staff_id } });
}
