import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { nextStaffId } from "@/lib/staff";
import { sendWhatsApp, accountCreatedMessage, normalisePhone } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin provisions a Leader Marketer (LMNL-###). Leaders aren't self-service,
 * so this is admin-only — unlike /api/auth/register which is public and only
 * mints marketers/affiliates. Staff ID + first password (the Staff ID itself)
 * are generated and sent by WhatsApp; the leader is usable at once.
 */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const phone = normalisePhone(body.phone);
  const address = String(body.address ?? "").trim();
  if (!name || !phone) {
    return NextResponse.json({ error: "Nama dan No WhatsApp diperlukan." }, { status: 400 });
  }

  const staffId = await nextStaffId("leader");
  const hash = bcrypt.hashSync(staffId, 10);

  const info = await db
    .prepare(
      `INSERT INTO users (name, phone, address, password_hash, role, staff_id, activated)
       VALUES (?, ?, ?, ?, 'leader', ?, true) RETURNING id`
    )
    .run(name, phone, address || null, hash, staffId);

  const wa = await sendWhatsApp(phone, accountCreatedMessage({ name, staffId, password: staffId }));

  return NextResponse.json({
    ok: true,
    id: Number(info.lastInsertRowid),
    staff_id: staffId,
    notified: wa.ok,
    notify_note: wa.skipped || wa.error || null,
  });
}
