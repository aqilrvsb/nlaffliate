import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { nextStaffId } from "@/lib/staff";
import { sendWhatsApp, accountCreatedMessage, normalisePhone } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A marketer registers an affiliate directly under themselves.
 *
 * The account is provisioned, not self-served: the Staff ID (AFL-###) and the
 * first password (the Staff ID itself) are generated and handed over by
 * WhatsApp. marketer_id is set on creation, so the affiliate can log in and
 * work straight away, then change the password.
 */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "marketer")
    return NextResponse.json({ error: "Marketers only." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const phone = normalisePhone(body.phone);
  const address = String(body.address ?? "").trim();

  if (!name || !phone) {
    return NextResponse.json({ error: "Nama dan No WhatsApp diperlukan." }, { status: 400 });
  }

  // Staff ID and first password are generated, never chosen. The sequence
  // keeps the ID collision-free even under concurrent creation.
  const staffId = await nextStaffId("affiliate");
  const hash = bcrypt.hashSync(staffId, 10);

  const info = await db.prepare(
      `INSERT INTO users (name, phone, address, password_hash, role, marketer_id, staff_id)
       VALUES (?, ?, ?, ?, 'affiliate', ?, ?) RETURNING id`
    ).run(name, phone, address || null, hash, user.id, staffId);

  // Hand over the login details. Best-effort: a failed message must not undo a
  // created account, but it is reported so nobody is left waiting.
  const wa = await sendWhatsApp(
    phone,
    accountCreatedMessage({ name, staffId, password: staffId })
  );

  return NextResponse.json({
    ok: true,
    id: Number(info.lastInsertRowid),
    staff_id: staffId,
    password: staffId,
    notified: wa.ok,
    notify_note: wa.skipped || wa.error || null,
  });
}
