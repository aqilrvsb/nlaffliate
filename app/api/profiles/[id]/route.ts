import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

/**
 * A link is editable by its owner, or by an admin acting on their behalf.
 * Scoping the SQL by owner (rather than trusting the id alone) keeps one
 * affiliate from touching another's links.
 */
async function canEdit(profileId: string) {
  const user = await getSession();
  if (!user) return null;
  if (user.role === "admin") return { adminOverride: true, userId: null };

  const row = await db
    .prepare("SELECT user_id FROM tiktok_profiles WHERE id = ?")
    .get<{ user_id: number }>(profileId);
  if (!row || row.user_id !== user.id) return null;
  return { adminOverride: false, userId: user.id };
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const scope = await canEdit(params.id);
  if (!scope) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { label, url } = await req.json();
  if (!label || !url) {
    return NextResponse.json({ error: "Label and URL required." }, { status: 400 });
  }

  const info = scope.adminOverride
    ? await db.prepare("UPDATE tiktok_profiles SET label = ?, url = ? WHERE id = ?")
        .run(label, url, params.id)
    : await db.prepare("UPDATE tiktok_profiles SET label = ?, url = ? WHERE id = ? AND user_id = ?")
        .run(label, url, params.id, scope.userId);

  if (info.changes === 0)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const scope = await canEdit(params.id);
  if (!scope) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // A profile with lives booked against it is part of that history — removing
  // it would orphan them, so block it and say why.
  const used = await db
    .prepare("SELECT COUNT(*)::int AS n FROM bookings WHERE profile_id = ?")
    .get<{ n: number }>(params.id);
  if ((used?.n ?? 0) > 0) {
    return NextResponse.json(
      { error: `Cannot delete — ${used!.n} live(s) are booked on this profile.` },
      { status: 409 }
    );
  }

  const info = scope.adminOverride
    ? await db.prepare("DELETE FROM tiktok_profiles WHERE id = ?").run(params.id)
    : await db.prepare("DELETE FROM tiktok_profiles WHERE id = ? AND user_id = ?")
        .run(params.id, scope.userId);

  if (info.changes === 0)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
