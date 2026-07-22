import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BrandRow = { id: number; name: string; marketer_id: number | null };

/**
 * Admin owns the catalogue rows (marketer_id IS NULL); a marketer owns their
 * own adopted copies. Neither may touch the other's.
 */
async function reach(id: number) {
  const user = await getSession();
  if (!user) return null;
  const row = await db
    .prepare("SELECT id, name, marketer_id FROM brands WHERE id = ?")
    .get<BrandRow>(id);
  if (!row) return null;

  if (user.role === "admin" && row.marketer_id === null) return { user, row };
  if (user.role === "marketer" && row.marketer_id === user.id) return { user, row };
  return null;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const hit = await reach(id);
  if (!hit) return NextResponse.json({ error: "Brand not found." }, { status: 404 });
  const { user, row } = hit;

  const { name } = await req.json().catch(() => ({}));
  const clean = String(name || "").trim();
  if (!clean) {
    return NextResponse.json({ error: "Brand name is required." }, { status: 400 });
  }

  if (user.role === "admin") {
    const dupe = await db
      .prepare(
        "SELECT id FROM brands WHERE marketer_id IS NULL AND lower(name) = lower(?) AND id <> ?"
      )
      .get(clean, id);
    if (dupe) {
      return NextResponse.json(
        { error: "Another catalogue brand already uses that name." },
        { status: 409 }
      );
    }
    await db.prepare("UPDATE brands SET name = ? WHERE id = ?").run(clean, id);
    // Every marketer who adopted this brand is working the same brand, so the
    // rename has to follow them — otherwise the catalogue and the reports
    // drift apart and nobody can tell which name is current.
    const spread = await db
      .prepare("UPDATE brands SET name = ? WHERE catalogue_id = ?")
      .run(clean, id);
    return NextResponse.json({ ok: true, renamed: Number(spread.changes ?? 0) });
  }

  // A marketer may rename only a brand they typed themselves. Adopted brands
  // carry the admin's name, and letting each marketer reword it would break
  // the one thing the catalogue exists to guarantee.
  const linked = await db
    .prepare("SELECT catalogue_id FROM brands WHERE id = ?")
    .get<{ catalogue_id: number | null }>(id);
  if (linked?.catalogue_id) {
    return NextResponse.json(
      { error: `"${row.name}" comes from the admin catalogue — ask admin to rename it.` },
      { status: 409 }
    );
  }

  const dupe = await db
    .prepare(
      "SELECT id FROM brands WHERE marketer_id = ? AND lower(name) = lower(?) AND id <> ?"
    )
    .get(user.id, clean, id);
  if (dupe) {
    return NextResponse.json({ error: "You already have a brand with that name." }, { status: 409 });
  }

  await db.prepare("UPDATE brands SET name = ? WHERE id = ?").run(clean, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const hit = await reach(id);
  if (!hit) return NextResponse.json({ error: "Brand not found." }, { status: 404 });
  const { user } = hit;
  const force = new URL(_req.url).searchParams.get("force") === "1";

  const count = async (sql: string) =>
    (await db.prepare(sql).get<{ n: number }>(id))?.n ?? 0;

  /* ── Admin removing a catalogue entry ───────────────── */
  if (user.role === "admin") {
    // Marketers who adopted it keep their brand and all its data — they just
    // stop being linked to a catalogue row. Nothing of theirs is destroyed,
    // which is why this warns rather than cascades.
    const adopted = await count(
      "SELECT COUNT(*)::int AS n FROM brands WHERE catalogue_id = ?"
    );
    if (adopted > 0 && !force) {
      return NextResponse.json(
        {
          error: `${adopted} marketer(s) have adopted this brand. Removing it from the catalogue keeps their brand and their data — it just can't be adopted again.`,
          needsConfirm: true,
          adopted,
        },
        { status: 409 }
      );
    }
    await db.prepare("DELETE FROM brands WHERE id = ?").run(id);
    return NextResponse.json({ ok: true });
  }

  /* ── Marketer dropping their own copy ───────────────── */
  // Deleting a brand cascades away its Overall reports and Pillar entries, so
  // say what would be lost instead of doing it silently.
  const o = await count("SELECT COUNT(*)::int AS n FROM overall_reports WHERE brand_id = ?");
  const p = await count("SELECT COUNT(*)::int AS n FROM pillar_entries WHERE brand_id = ?");
  const g = await count("SELECT COUNT(*)::int AS n FROM product_gmv WHERE brand_id = ?");
  // Lives are the affiliate's own history, so they survive and simply lose
  // the brand tag (ON DELETE SET NULL) — worth saying, since it differs.
  const l = await count("SELECT COUNT(*)::int AS n FROM bookings WHERE brand_id = ?");

  if (o + p + g + l > 0 && !force) {
    const removed = [
      `${o} Overall report(s)`,
      `${g} Product GMV row(s)`,
      `${p} Pillar entr(ies)`,
    ].join(", ");
    const kept = l > 0 ? ` ${l} scheduled live(s) will be kept but lose their brand tag.` : "";
    return NextResponse.json(
      {
        error: `Deleting this brand removes ${removed}.${kept}`,
        needsConfirm: true,
        overall: o,
        products: g,
        pillars: p,
        lives: l,
      },
      { status: 409 }
    );
  }

  await db.prepare("DELETE FROM brands WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
