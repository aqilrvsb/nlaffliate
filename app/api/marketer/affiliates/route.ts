import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { sendWhatsApp, welcomeMessage } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A marketer registers an affiliate directly under themselves.
 *
 * Self-registration leaves an affiliate locked until an admin assigns them a
 * marketer — that assignment is the approval. Here the marketer IS the one
 * approving, so marketer_id is set on creation and the account is usable
 * immediately. Either way the affiliate gets the same welcome message.
 */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "marketer")
    return NextResponse.json({ error: "Marketers only." }, { status: 403 });

  const { name, email, phone, address, password } = await req.json().catch(() => ({}));
  const clean = {
    name: String(name || "").trim(),
    email: String(email || "").trim().toLowerCase(),
    phone: String(phone || "").trim(),
    address: String(address || "").trim(),
  };

  if (!clean.name || !clean.email || !clean.phone || !clean.address) {
    return NextResponse.json({ error: "Name, email, phone and address are required." }, { status: 400 });
  }
  if (String(password || "").length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const existing = await db.prepare("SELECT id FROM users WHERE lower(email) = ?").get(clean.email);
  if (existing) {
    return NextResponse.json({ error: "That email is already registered." }, { status: 409 });
  }

  const hash = bcrypt.hashSync(String(password), 10);
  const info = await db.prepare(
      `INSERT INTO users (name, email, phone, address, password_hash, role, marketer_id)
       VALUES (?, ?, ?, ?, ?, 'affiliate', ?) RETURNING id`
    ).run(clean.name, clean.email, clean.phone, clean.address, hash, user.id);

  // Best-effort: a failed notification must not undo a created account.
  const wa = await sendWhatsApp(clean.phone, welcomeMessage(clean.name));

  return NextResponse.json({
    ok: true,
    id: Number(info.lastInsertRowid),
    notified: wa.ok,
    notify_note: wa.skipped || wa.error || null,
  });
}
