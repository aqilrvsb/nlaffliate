import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { normalisePhone, sendWhatsApp, welcomeMessage } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Affiliates are a shared pool — any marketer may edit/activate any of them. */
async function mine(id: number) {
  const user = await getSession();
  if (!user || user.role !== "marketer" && user.role !== "leader") return null;
  const row = await db
    .prepare("SELECT id, name, phone, staff_id, activated FROM users WHERE id = ? AND role = 'affiliate'")
    .get<{ id: number; name: string; phone: string | null; staff_id: string | null; activated: boolean }>(id);
  return row ? { user, row } : null;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const hit = await mine(id);
  if (!hit) return NextResponse.json({ error: "Affiliate not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  /**
   * Activate — the one-time button. The affiliate already has their login
   * (WhatsApp #1, sent at create); this opens their frozen dashboard and sends
   * the "system ready, you can log in now" WhatsApp #2. Idempotent: activating
   * an already-active account is a no-op, not a second notification.
   */
  if (body.activate === true) {
    if (hit.row.activated) {
      return NextResponse.json({ ok: true, already: true });
    }
    await db.prepare("UPDATE users SET activated = true WHERE id = ?").run(id);
    const wa = await sendWhatsApp(hit.row.phone, welcomeMessage(hit.row.name));
    return NextResponse.json({
      ok: true,
      activated: true,
      notified: wa.ok,
      notify_note: wa.skipped || wa.error || null,
    });
  }

  const sets: string[] = [];
  const args: any[] = [];

  for (const k of ["name", "phone", "address"] as const) {
    if (k in body) {
      // Phone is stored canonically (60XXXXXXXXX) so notifications always
      // reach the same number whatever shape it was typed in.
      const v = k === "phone"
        ? normalisePhone(body[k])
        : String(body[k] ?? "").trim();
      if (!v) return NextResponse.json({ error: `${k} cannot be empty.` }, { status: 400 });
      sets.push(`${k} = ?`);
      args.push(v);
    }
  }

  // Password is optional — blank means "leave it alone", so a marketer can fix
  // a phone number without being forced to reset the affiliate's login.
  if (body.password) {
    if (String(body.password).length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }
    sets.push("password_hash = ?");
    args.push(bcrypt.hashSync(String(body.password), 10));
  }

  if (sets.length === 0)
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  args.push(id);
  await db.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(...args);
  return NextResponse.json({ ok: true });
}

/**
 * A marketer "removing" a shared affiliate only unmanages them for that
 * marketer (and frees their own schedules) — it never deletes the account,
 * which other marketers may still work. Deleting the account is admin-only.
 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const hit = await mine(id);
  if (!hit) return NextResponse.json({ error: "Affiliate not found." }, { status: 404 });
  const { user, row } = hit;

  await db.prepare("DELETE FROM affiliate_marketers WHERE affiliate_id = ? AND marketer_id = ?").run(id, user.id);
  await db.prepare("UPDATE bookings SET marketer_id = NULL WHERE user_id = ? AND marketer_id = ?").run(id, user.id);
  return NextResponse.json({ ok: true, removed_membership: true, name: row.name });
}
