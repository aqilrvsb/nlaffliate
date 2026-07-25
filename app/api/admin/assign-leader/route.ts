import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin assigns a marketer to a leader (or clears it).
 *
 * PATCH { marketer_id, leader_id | null }
 *
 * Authoritative over a leader's own COP: admin can move a marketer between
 * leaders freely. A marketer belongs to exactly one leader, so this just sets
 * the single `leader_id` column.
 */
export async function PATCH(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const marketerId = Number(body.marketer_id);
  const leaderRaw = body.leader_id;
  const leaderId = leaderRaw == null || leaderRaw === "" ? null : Number(leaderRaw);

  if (!Number.isFinite(marketerId)) {
    return NextResponse.json({ error: "Marketer tidak sah." }, { status: 400 });
  }
  if (leaderId !== null && !Number.isFinite(leaderId)) {
    return NextResponse.json({ error: "Leader tidak sah." }, { status: 400 });
  }

  const marketer = await db
    .prepare("SELECT id FROM users WHERE id = ? AND role = 'marketer'")
    .get(marketerId);
  if (!marketer) {
    return NextResponse.json({ error: "Marketer tidak wujud." }, { status: 404 });
  }
  if (leaderId !== null) {
    const leader = await db
      .prepare("SELECT id FROM users WHERE id = ? AND role = 'leader'")
      .get(leaderId);
    if (!leader) {
      return NextResponse.json({ error: "Leader tidak wujud." }, { status: 404 });
    }
  }

  await db.prepare("UPDATE users SET leader_id = ? WHERE id = ?").run(leaderId, marketerId);
  return NextResponse.json({ ok: true });
}
