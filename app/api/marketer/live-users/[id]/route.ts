import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { normalisePhone } from "@/lib/whatsapp";
import { LIVE_USER_TYPES } from "@/lib/live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A marketer may only touch their own live users. */
async function mine(id: number) {
  const user = await getSession();
  if (!user || user.role !== "marketer") return null;
  const row = await db
    .prepare("SELECT id FROM live_users WHERE id = ? AND marketer_id = ?")
    .get(id, user.id);
  return row ? user : null;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!(await mine(id))) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const type = String(body.user_type ?? "").trim();
  const phone = body.phone ? normalisePhone(body.phone) : null;
  if (!name) return NextResponse.json({ error: "Nama diperlukan." }, { status: 400 });
  if (!LIVE_USER_TYPES.includes(type as any))
    return NextResponse.json({ error: "Pilih jenis yang sah." }, { status: 400 });

  await db.prepare("UPDATE live_users SET name = ?, user_type = ?, phone = ? WHERE id = ?")
    .run(name, type, phone, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!(await mine(id))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  // live_sessions cascade on live_user delete.
  await db.prepare("DELETE FROM live_users WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
