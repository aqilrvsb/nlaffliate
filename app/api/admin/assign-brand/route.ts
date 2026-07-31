import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin shares one catalogue brand with many marketers (1 → many).
 *
 * A catalogue brand (marketer_id IS NULL) is the single master record; every
 * marketer who "has" it holds a light copy row (marketer_id set, catalogue_id
 * pointing back). All copies resolve to the same catalogue row, so its products
 * and data are shared, never duplicated — assigning the brand is what gives a
 * marketer its products too.
 *
 * Leaders carry their own marketer workspace, so they're assignable here just
 * like marketers.
 */

async function requireAdmin() {
  const user = await getSession();
  return user && user.role === "admin" ? user : null;
}

/** GET ?catalogue_id=X → every marketer/leader with an `assigned` flag. */
export async function GET(req: Request) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const catalogueId = Number(new URL(req.url).searchParams.get("catalogue_id"));
  if (!Number.isFinite(catalogueId))
    return NextResponse.json({ error: "catalogue_id required" }, { status: 400 });

  const rows = await db
    .prepare(
      `SELECT u.id, u.name, u.staff_id, u.role, b.id AS brand_id
         FROM users u
         LEFT JOIN brands b ON b.marketer_id = u.id AND b.catalogue_id = ?
        WHERE u.role IN ('marketer', 'leader')
        ORDER BY u.role, u.staff_id NULLS LAST, u.name`
    )
    .all<{ id: number; name: string; staff_id: string | null; role: string; brand_id: number | null }>(catalogueId);

  return NextResponse.json({
    marketers: rows.map((m) => ({
      id: m.id, name: m.name, staff_id: m.staff_id, role: m.role,
      assigned: m.brand_id != null,
    })),
  });
}

/**
 * POST { catalogue_id, marketer_ids: number[], force? } — set exactly which
 * marketers hold this brand. Adds are silent; removals delete a marketer's
 * copy and cascade its Overall/Pillar data, so they're refused (needsConfirm)
 * until `force` unless nothing would be lost.
 */
export async function POST(req: Request) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const catalogueId = Number(body.catalogue_id);
  const force = body.force === true;
  const desiredRaw: number[] = Array.isArray(body.marketer_ids)
    ? body.marketer_ids.map(Number).filter(Number.isFinite)
    : [];
  if (!Number.isFinite(catalogueId))
    return NextResponse.json({ error: "catalogue_id required" }, { status: 400 });

  const cat = await db
    .prepare("SELECT id, name FROM brands WHERE id = ? AND marketer_id IS NULL")
    .get<{ id: number; name: string }>(catalogueId);
  if (!cat) return NextResponse.json({ error: "Catalogue brand not found." }, { status: 404 });

  // Keep only ids that are really marketers/leaders.
  const valid = await db
    .prepare("SELECT id FROM users WHERE role IN ('marketer', 'leader')")
    .all<{ id: number }>();
  const validSet = new Set(valid.map((v) => Number(v.id)));
  const desired = new Set(desiredRaw.filter((id) => validSet.has(id)));

  // Who holds a copy of this catalogue brand right now.
  const current = await db
    .prepare("SELECT id, marketer_id FROM brands WHERE catalogue_id = ? AND marketer_id IS NOT NULL")
    .all<{ id: number; marketer_id: number }>(catalogueId);
  const currentMk = new Set(current.map((c) => Number(c.marketer_id)));

  const toAdd = [...desired].filter((mk) => !currentMk.has(mk));
  const toRemove = current.filter((c) => !desired.has(Number(c.marketer_id)));

  // Removing a marketer's brand deletes their reports for it — warn first.
  if (toRemove.length && !force) {
    const ids = toRemove.map((r) => Number(r.id)).join(",");
    const impact = await db
      .prepare(
        `SELECT
           (SELECT COUNT(*)::int FROM overall_reports WHERE brand_id IN (${ids})) AS overall,
           (SELECT COUNT(*)::int FROM pillar_entries  WHERE brand_id IN (${ids})) AS pillars,
           (SELECT COUNT(*)::int FROM bookings        WHERE brand_id IN (${ids})) AS lives`
      )
      .get<{ overall: number; pillars: number; lives: number }>();
    const overall = impact?.overall ?? 0;
    const pillars = impact?.pillars ?? 0;
    const lives = impact?.lives ?? 0;
    if (overall + pillars > 0) {
      return NextResponse.json(
        {
          error: `Membuang brand ini daripada ${toRemove.length} marketer akan memadam ${overall} Overall report dan ${pillars} Pillar entry.${lives > 0 ? ` ${lives} live kekal tetapi hilang tag brand.` : ""}`,
          needsConfirm: true, overall, pillars, lives,
        },
        { status: 409 }
      );
    }
  }

  // Apply — sequential, so we never pipeline past the pool (see lib/db POOL_MAX).
  for (const mk of toAdd) {
    // A legacy free-typed brand of the same name: link it to the catalogue
    // instead of creating a duplicate row.
    const dupe = await db
      .prepare("SELECT id FROM brands WHERE marketer_id = ? AND lower(name) = lower(?)")
      .get<{ id: number }>(mk, cat.name);
    if (dupe) {
      await db.prepare("UPDATE brands SET catalogue_id = ? WHERE id = ?").run(cat.id, dupe.id);
      continue;
    }
    await db
      .prepare("INSERT INTO brands (marketer_id, name, catalogue_id) VALUES (?, ?, ?)")
      .run(mk, cat.name, cat.id);
  }
  for (const r of toRemove) {
    await db.prepare("DELETE FROM brands WHERE id = ?").run(Number(r.id));
  }

  return NextResponse.json({ ok: true, added: toAdd.length, removed: toRemove.length });
}
