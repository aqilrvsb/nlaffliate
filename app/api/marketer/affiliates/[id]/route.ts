import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A marketer may only reach affiliates assigned to them. */
async function mine(id: number) {
  const user = await getSession();
  if (!user || user.role !== "marketer") return null;
  const row = await db
    .prepare(
      "SELECT id, name, email FROM users WHERE id = ? AND role = 'affiliate' AND marketer_id = ?"
    )
    .get<{ id: number; name: string; email: string }>(id, user.id);
  return row ? { user, row } : null;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const hit = await mine(id);
  if (!hit) return NextResponse.json({ error: "Affiliate not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const sets: string[] = [];
  const args: any[] = [];

  for (const k of ["name", "phone", "address"] as const) {
    if (k in body) {
      const v = String(body[k] ?? "").trim();
      if (!v) return NextResponse.json({ error: `${k} cannot be empty.` }, { status: 400 });
      sets.push(`${k} = ?`);
      args.push(v);
    }
  }

  if ("email" in body) {
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "Email cannot be empty." }, { status: 400 });
    const clash = await db
      .prepare("SELECT id FROM users WHERE lower(email) = ? AND id <> ?")
      .get(email, id);
    if (clash) {
      return NextResponse.json({ error: "That email is already registered." }, { status: 409 });
    }
    sets.push("email = ?");
    args.push(email);
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
        email: row.email,
        impact,
        note: "All of this affiliate's history is deleted permanently.",
      },
      { status: 409 }
    );
  }

  await db.prepare("DELETE FROM users WHERE id = ?").run(id);
  return NextResponse.json({ ok: true, deleted: row.name, impact });
}
