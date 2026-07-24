import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { normalisePhone } from "@/lib/whatsapp";
import { LIVE_USER_TYPES } from "@/lib/live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Live users are people who run live sessions (KOL, Affiliate Special, Founder,
 * HQ) but have NO login account — the marketer keeps them as plain records.
 * No auth, no notification: pure CRUD.
 */
export async function GET() {
  const user = await getSession();
  if (!user || user.role !== "marketer")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await db
    .prepare("SELECT id, name, user_type, phone FROM live_users WHERE marketer_id = ? ORDER BY name")
    .all(user.id);
  return NextResponse.json({ live_users: rows });
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "marketer")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const type = String(body.user_type ?? "").trim();
  const phone = body.phone ? normalisePhone(body.phone) : null;

  if (!name) return NextResponse.json({ error: "Nama diperlukan." }, { status: 400 });
  if (!LIVE_USER_TYPES.includes(type as any))
    return NextResponse.json({ error: "Pilih jenis yang sah." }, { status: 400 });

  const info = await db.prepare(
      "INSERT INTO live_users (marketer_id, name, user_type, phone) VALUES (?, ?, ?, ?) RETURNING id"
    ).run(user.id, name, type, phone);
  return NextResponse.json({ ok: true, id: Number(info.lastInsertRowid) });
}
