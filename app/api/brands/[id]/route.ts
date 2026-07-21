import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Only the owning marketer may touch a brand. */
async function own(id: number) {
  const user = await getSession();
  if (!user || user.role !== "marketer") return null;
  const row = await db
    .prepare("SELECT id FROM brands WHERE id = ? AND marketer_id = ?")
    .get(id, user.id);
  return row ? user : null;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const user = await own(id);
  if (!user) return NextResponse.json({ error: "Brand not found." }, { status: 404 });

  const { name } = await req.json().catch(() => ({}));
  const clean = String(name || "").trim();
  if (!clean) {
    return NextResponse.json({ error: "Brand name is required." }, { status: 400 });
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
  const user = await own(id);
  if (!user) return NextResponse.json({ error: "Brand not found." }, { status: 404 });

  // Deleting a brand would cascade away its Overall reports and Pillar
  // entries, so say what would be lost instead of doing it silently.
  const o = await db
    .prepare("SELECT COUNT(*)::int AS n FROM overall_reports WHERE brand_id = ?")
    .get<{ n: number }>(id);
  const p = await db
    .prepare("SELECT COUNT(*)::int AS n FROM pillar_entries WHERE brand_id = ?")
    .get<{ n: number }>(id);

  const g = await db
    .prepare("SELECT COUNT(*)::int AS n FROM product_gmv WHERE brand_id = ?")
    .get<{ n: number }>(id);
  // Lives are the affiliate's own history, so they survive and simply lose
  // the brand tag (ON DELETE SET NULL) — worth saying, since it differs.
  const l = await db
    .prepare("SELECT COUNT(*)::int AS n FROM bookings WHERE brand_id = ?")
    .get<{ n: number }>(id);

  const used = (o?.n ?? 0) + (p?.n ?? 0) + (g?.n ?? 0) + (l?.n ?? 0);
  const url = new URL(_req.url);
  if (used > 0 && url.searchParams.get("force") !== "1") {
    const removed = [
      `${o?.n ?? 0} Overall report(s)`,
      `${g?.n ?? 0} Product GMV row(s)`,
      `${p?.n ?? 0} Pillar entr(ies)`,
    ].join(", ");
    const kept = (l?.n ?? 0) > 0
      ? ` ${l!.n} scheduled live(s) will be kept but lose their brand tag.`
      : "";
    return NextResponse.json(
      {
        error: `Deleting this brand removes ${removed}.${kept}`,
        needsConfirm: true,
        overall: o?.n ?? 0,
        products: g?.n ?? 0,
        pillars: p?.n ?? 0,
        lives: l?.n ?? 0,
      },
      { status: 409 }
    );
  }

  await db.prepare("DELETE FROM brands WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
