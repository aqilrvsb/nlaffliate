import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import db from "@/lib/db";
import { getRealSession, ACT_AS } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Leader "manage as marketer" mode.
 *
 * POST { marketer_id }  — start managing one of the leader's own marketers.
 * DELETE                — stop managing, return to the leader's own view.
 *
 * Sets an httpOnly `act_as` cookie; getSession re-validates ownership on every
 * request, so this cookie alone can never reach a marketer the leader doesn't
 * own. Only the marketer's own leader may manage them.
 */
export async function POST(req: Request) {
  const real = await getRealSession();
  if (!real || real.role !== "leader") {
    return NextResponse.json({ error: "Leaders only." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const marketerId = Number(body.marketer_id);
  if (!Number.isFinite(marketerId)) {
    return NextResponse.json({ error: "Marketer tidak sah." }, { status: 400 });
  }

  const m = await db
    .prepare("SELECT id, name FROM users WHERE id = ? AND role = 'marketer' AND leader_id = ?")
    .get<{ id: number; name: string }>(marketerId, real.id);
  if (!m) {
    return NextResponse.json({ error: "Marketer itu bukan dalam team anda." }, { status: 403 });
  }

  cookies().set(ACT_AS, String(marketerId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // a working session; getSession re-validates anyway
  });
  return NextResponse.json({ ok: true, id: m.id, name: m.name });
}

export async function DELETE() {
  cookies().delete(ACT_AS);
  return NextResponse.json({ ok: true });
}
