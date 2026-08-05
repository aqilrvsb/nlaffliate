import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A marketer grabs an unassigned ("pending") affiliate — one nobody manages
 * yet — making it their own. First come, first served: the UPDATE only touches
 * a still-unassigned row, so two marketers grabbing at once can't both win.
 * Grabbing also activates the affiliate so they can log in.
 */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user || (user.role !== "marketer" && user.role !== "leader")) {
    return NextResponse.json({ error: "Marketers only." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const affiliateId = Number(body.affiliate_id);
  if (!Number.isFinite(affiliateId)) {
    return NextResponse.json({ error: "Affiliate tidak sah." }, { status: 400 });
  }

  const aff = await db
    .prepare("SELECT id, name, marketer_id FROM users WHERE id = ? AND role = 'affiliate'")
    .get<{ id: number; name: string; marketer_id: number | null }>(affiliateId);
  if (!aff) {
    return NextResponse.json({ error: "Affiliate tidak wujud." }, { status: 404 });
  }
  if (aff.marketer_id != null) {
    return NextResponse.json(
      { error: "Affiliate ini sudah diambil oleh marketer lain." },
      { status: 409 }
    );
  }

  // Atomic claim — only wins if it is still unassigned.
  const res = await db
    .prepare("UPDATE users SET marketer_id = ?, activated = true WHERE id = ? AND marketer_id IS NULL")
    .run(user.id, affiliateId);
  if (!res.changes) {
    return NextResponse.json(
      { error: "Terlambat — affiliate ini baru sahaja diambil." },
      { status: 409 }
    );
  }

  // Keep membership in step with the marketer_id just claimed.
  await db.prepare("INSERT INTO affiliate_marketers (marketer_id, affiliate_id) VALUES (?, ?) ON CONFLICT DO NOTHING")
    .run(user.id, affiliateId);

  return NextResponse.json({ ok: true, id: aff.id, name: aff.name });
}
