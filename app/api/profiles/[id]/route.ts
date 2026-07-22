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

/**
 * PATCH — set the commission on one link.
 *
 * Commission is a commercial term, so it is set by the admin or by the
 * marketer who owns that affiliate — never by the affiliate themselves,
 * who would otherwise be able to set their own rate.
 *
 * Body: { commission_type: 'percent' | 'hour' | null, commission_value: number|null }
 * Percent -> a share of sales. Hour -> RM per hour.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owner = await db
    .prepare(
      `SELECT p.id, u.marketer_id
         FROM tiktok_profiles p JOIN users u ON u.id = p.user_id
        WHERE p.id = ?`
    )
    .get<{ id: number; marketer_id: number | null }>(params.id);
  if (!owner) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const allowed =
    user.role === "admin" ||
    (user.role === "marketer" && owner.marketer_id === user.id);
  if (!allowed) {
    return NextResponse.json(
      { error: "Only the admin or this affiliate's marketer can set commission." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const rawType = String(body.commission_type ?? "").trim();

  // Empty type clears the commission entirely.
  if (!rawType) {
    await db
      .prepare("UPDATE tiktok_profiles SET commission_type = NULL, commission_value = NULL WHERE id = ?")
      .run(params.id);
    return NextResponse.json({ ok: true, commission_type: null, commission_value: null });
  }

  if (rawType !== "percent" && rawType !== "hour") {
    return NextResponse.json(
      { error: "Commission type must be 'percent' or 'hour'." },
      { status: 400 }
    );
  }

  const n = Number(body.commission_value);
  if (!Number.isFinite(n) || n < 0) {
    return NextResponse.json(
      { error: "Enter a commission amount." },
      { status: 400 }
    );
  }
  if (rawType === "percent" && n > 100) {
    return NextResponse.json(
      { error: "Percentage cannot exceed 100." },
      { status: 400 }
    );
  }

  await db
    .prepare("UPDATE tiktok_profiles SET commission_type = ?, commission_value = ? WHERE id = ?")
    .run(rawType, n, params.id);

  return NextResponse.json({ ok: true, commission_type: rawType, commission_value: n });
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
