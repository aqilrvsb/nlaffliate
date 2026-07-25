import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { normaliseStaffId } from "@/lib/staff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A leader's team membership.
 *
 * POST   { staff_id }     — COP a marketer into this leader's team.
 * DELETE { marketer_id }  — release one of this leader's marketers.
 *
 * A marketer belongs to exactly one leader: a COP is refused if the marketer
 * already sits under a different leader (only that leader, or an admin, can
 * let go first). A leader can only release marketers that are actually theirs.
 */

async function leader() {
  const user = await getSession();
  if (!user || user.role !== "leader") return null;
  return user;
}

export async function POST(req: Request) {
  const user = await leader();
  if (!user) return NextResponse.json({ error: "Leaders only." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const staffId = normaliseStaffId(body.staff_id);
  if (!staffId) {
    return NextResponse.json({ error: "Masukkan ID Staff marketer." }, { status: 400 });
  }

  const m = await db
    .prepare(
      `SELECT u.id, u.name, u.leader_id, l.staff_id AS leader_staff
         FROM users u
         LEFT JOIN users l ON l.id = u.leader_id
        WHERE u.role = 'marketer' AND upper(u.staff_id) = ?`
    )
    .get<{ id: number; name: string; leader_id: number | null; leader_staff: string | null }>(staffId);

  if (!m) {
    return NextResponse.json({ error: `Tiada marketer dengan ID ${staffId}.` }, { status: 404 });
  }
  if (m.leader_id != null && Number(m.leader_id) !== user.id) {
    return NextResponse.json(
      { error: `Marketer ini sudah bawah jagaan ${m.leader_staff || "leader lain"}.` },
      { status: 409 }
    );
  }
  if (m.leader_id != null && Number(m.leader_id) === user.id) {
    return NextResponse.json({ ok: true, name: m.name, already: true });
  }

  await db.prepare("UPDATE users SET leader_id = ? WHERE id = ?").run(user.id, m.id);
  return NextResponse.json({ ok: true, id: m.id, name: m.name });
}

export async function DELETE(req: Request) {
  const user = await leader();
  if (!user) return NextResponse.json({ error: "Leaders only." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const marketerId = Number(body.marketer_id);
  if (!Number.isFinite(marketerId)) {
    return NextResponse.json({ error: "Marketer tidak sah." }, { status: 400 });
  }

  // Only a marketer actually on this leader's team can be released by them.
  const res = await db
    .prepare("UPDATE users SET leader_id = NULL WHERE id = ? AND leader_id = ? AND role = 'marketer'")
    .run(marketerId, user.id);
  if (!res.changes) {
    return NextResponse.json({ error: "Marketer itu bukan dalam team anda." }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
