import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { normalisePhone, sendWhatsApp, accountCreatedMessage } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A marketer may only reach affiliates assigned to them. */
async function mine(id: number) {
  const user = await getSession();
  if (!user || user.role !== "marketer") return null;
  const row = await db
    .prepare(
      "SELECT id, name, phone, staff_id, activated FROM users WHERE id = ? AND role = 'affiliate' AND marketer_id = ?"
    )
    .get<{ id: number; name: string; phone: string | null; staff_id: string | null; activated: boolean }>(id, user.id);
  return row ? { user, row } : null;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const hit = await mine(id);
  if (!hit) return NextResponse.json({ error: "Affiliate not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  /**
   * Activate — the one-time button. Opens the affiliate's frozen dashboard and
   * sends their login details (Staff ID + first password + link) by WhatsApp.
   * The first password is the Staff ID, so a failed message never locks anyone
   * out. Idempotent: activating an already-active account is a no-op, not a
   * second notification.
   */
  if (body.activate === true) {
    if (hit.row.activated) {
      return NextResponse.json({ ok: true, already: true });
    }
    await db.prepare("UPDATE users SET activated = true WHERE id = ?").run(id);
    const staffId = hit.row.staff_id ?? "";
    const wa = await sendWhatsApp(
      hit.row.phone,
      accountCreatedMessage({ name: hit.row.name, staffId, password: staffId })
    );
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
 * Two-step delete, same shape as the admin one: the first call refuses and
 * reports exactly what would be destroyed, and the marketer confirms against
 * that list rather than a generic "are you sure".
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const hit = await mine(id);
  if (!hit) return NextResponse.json({ error: "Affiliate not found." }, { status: 404 });
  const { row } = hit;

  const count = async (sql: string) =>
    (await db.prepare(sql).get<{ n: number }>(id))?.n ?? 0;

  const impact = {
    lives: await count("SELECT COUNT(*)::int AS n FROM bookings WHERE user_id = ?"),
    tiktok_links: await count("SELECT COUNT(*)::int AS n FROM tiktok_profiles WHERE user_id = ?"),
    posts: await count("SELECT COUNT(*)::int AS n FROM posts WHERE user_id = ?"),
    samples: await count("SELECT COUNT(*)::int AS n FROM sample_requests WHERE user_id = ?"),
  };

  if (new URL(req.url).searchParams.get("force") !== "1") {
    return NextResponse.json(
      {
        needsConfirm: true,
        name: row.name,
        staff_id: row.staff_id,
        impact,
        note: "All of this affiliate's history is deleted permanently.",
      },
      { status: 409 }
    );
  }

  await db.prepare("DELETE FROM users WHERE id = ?").run(id);
  return NextResponse.json({ ok: true, deleted: row.name, impact });
}
