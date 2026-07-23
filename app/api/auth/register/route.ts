import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { nextStaffId } from "@/lib/staff";
import { sendWhatsApp, accountCreatedMessage, normalisePhone } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Register a marketer or an affiliate.
 *
 * Accounts are provisioned, never self-configured: the Staff ID (MNL-/AFL-###)
 * and the first password (the Staff ID itself) are generated, handed back for
 * the page to display, and sent by WhatsApp. The staff member changes the
 * password after first login.
 *
 * Admin is never creatable here — this route used to trust `role` from the
 * body, so anyone could mint themselves an admin. There is one HQNL account,
 * provisioned out of band.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const phone = normalisePhone(body.phone);
  const address = String(body.address ?? "").trim();
  const role = String(body.role ?? "");

  if (role !== "marketer" && role !== "affiliate") {
    return NextResponse.json(
      { error: "Peranan mesti marketer atau affiliate." },
      { status: 400 }
    );
  }
  if (!name || !phone) {
    return NextResponse.json({ error: "Nama dan No WhatsApp diperlukan." }, { status: 400 });
  }

  // Staff ID and first password are generated, never chosen. The per-role
  // sequence keeps the ID collision-free even under concurrent creation.
  const staffId = await nextStaffId(role);
  const hash = bcrypt.hashSync(staffId, 10);

  // A marketer is usable at once. An affiliate stays frozen until their
  // marketer presses Activate, so it is created inactive and the login details
  // are NOT sent yet — that WhatsApp is the activation signal.
  const activated = role === "marketer";

  const info = await db.prepare(
      `INSERT INTO users (name, phone, address, password_hash, role, staff_id, activated)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`
    )
    .run(name, phone, address || null, hash, role, staffId, activated);

  // Only the marketer gets their login now. Best-effort: a failed message must
  // not undo a created account.
  const wa = activated
    ? await sendWhatsApp(phone, accountCreatedMessage({ name, staffId, password: staffId }))
    : { ok: false, skipped: null, error: null };

  return NextResponse.json({
    ok: true,
    id: Number(info.lastInsertRowid),
    staff_id: staffId,
    activated,
    notified: wa.ok,
    notify_note: wa.skipped || wa.error || null,
  });
}
