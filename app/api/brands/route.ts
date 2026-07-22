import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Brands come in two shapes, distinguished by marketer_id:
 *
 *   marketer_id IS NULL  -> the admin catalogue. One master list of every
 *                           brand the company works with.
 *   marketer_id = <id>   -> a marketer's own brand, adopted from the
 *                           catalogue. catalogue_id links it back so an admin
 *                           rename flows through to everyone who took it.
 *
 * Everything brand-scoped (Overall, Pillar, Product GMV, lives) hangs off the
 * marketer's copy, so a marketer only ever sees and reports on brands they
 * chose to work.
 */
export async function GET(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ?scope=catalogue is the admin master list — also what a marketer picks
  // from when adopting, so both roles may read it.
  const scope = new URL(req.url).searchParams.get("scope");
  if (scope === "catalogue") {
    const brands = await db.prepare(
        `SELECT b.id, b.name,
                (SELECT COUNT(*)::int FROM brands m WHERE m.catalogue_id = b.id) AS adopted
           FROM brands b
          WHERE b.marketer_id IS NULL
          ORDER BY b.name`
      ).all();
    return NextResponse.json({ brands });
  }

  /**
   * ?scope=assignable — brands that working data may point at. Only a
   * marketer's own copies qualify: a product filed against a catalogue row
   * would be invisible to every affiliate, since they browse by their own
   * marketer's brand.
   */
  if (scope === "assignable") {
    const brands = await db.prepare(
        `SELECT b.id, b.name, b.marketer_id, u.name AS marketer_name
           FROM brands b JOIN users u ON u.id = b.marketer_id
          ORDER BY b.name, u.name`
      ).all();
    return NextResponse.json({ brands });
  }

  let brands;
  if (user.role === "admin") {
    // Admin's working list is every brand in play, catalogue entries included,
    // so the product and report filters can reach anything.
    brands = await db.prepare(
        `SELECT b.id, b.name, b.marketer_id, u.name AS marketer_name
           FROM brands b LEFT JOIN users u ON u.id = b.marketer_id
          ORDER BY b.name, u.name`
      ).all();
  } else if (user.role === "marketer") {
    brands = await db.prepare(
        `SELECT id, name, marketer_id, catalogue_id, wa_group_url
           FROM brands WHERE marketer_id = ? ORDER BY name`
      ).all(user.id);
  } else {
    /**
     * An affiliate works the brands registered on their own TikTok links —
     * not everything their marketer happens to hold. Grouped, because one
     * brand can sit on several of their links.
     */
    brands = await db.prepare(
        `SELECT DISTINCT b.id, b.name, b.marketer_id, b.wa_group_url
           FROM tiktok_profile_brands pb
           JOIN tiktok_profiles p ON p.id = pb.profile_id
           JOIN brands b ON b.id = pb.brand_id
          WHERE p.user_id = ?
          ORDER BY b.name`
      ).all(user.id);
  }

  return NextResponse.json({ brands });
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user || (user.role !== "marketer" && user.role !== "admin")) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  /* ── Admin: add to the master catalogue ─────────────── */
  if (user.role === "admin") {
    const clean = String(body.name || "").trim();
    if (!clean) {
      return NextResponse.json({ error: "Brand name is required." }, { status: 400 });
    }
    const dupe = await db
      .prepare("SELECT id FROM brands WHERE marketer_id IS NULL AND lower(name) = lower(?)")
      .get(clean);
    if (dupe) {
      return NextResponse.json(
        { error: "That brand is already in the catalogue." },
        { status: 409 }
      );
    }
    const info = await db
      .prepare("INSERT INTO brands (marketer_id, name) VALUES (NULL, ?) RETURNING id")
      .run(clean);
    return NextResponse.json({ ok: true, id: Number(info.lastInsertRowid) });
  }

  /* ── Marketer: adopt from the catalogue, or add a new one ──
   *
   * Typing a name that isn't in the catalogue adds it there as well as to the
   * marketer. The catalogue is the company's shared list, so a brand one
   * marketer starts working is a brand the next one should be able to find —
   * admin doesn't have to have thought of it first.
   */
  const raw = String(body.catalogue_id ?? "").trim();
  const typed = String(body.name ?? "").trim();
  if (!raw && !typed) {
    return NextResponse.json(
      { error: "Pick a brand from the list, or type a new name." },
      { status: 400 }
    );
  }

  let cat: { id: number; name: string } | null | undefined;
  if (raw) {
    cat = await db
      .prepare("SELECT id, name FROM brands WHERE id = ? AND marketer_id IS NULL")
      .get<{ id: number; name: string }>(Number(raw));
    if (!cat) {
      return NextResponse.json({ error: "That brand is no longer available." }, { status: 404 });
    }
  } else {
    cat = await db
      .prepare("SELECT id, name FROM brands WHERE marketer_id IS NULL AND lower(name) = lower(?)")
      .get<{ id: number; name: string }>(typed);
    if (!cat) {
      const made = await db
        .prepare("INSERT INTO brands (marketer_id, name) VALUES (NULL, ?) RETURNING id")
        .run(typed);
      cat = { id: Number(made.lastInsertRowid), name: typed };
    }
  }

  const mine = await db
    .prepare("SELECT id FROM brands WHERE marketer_id = ? AND lower(name) = lower(?)")
    .get(user.id, cat.name);
  if (mine) {
    return NextResponse.json({ error: "You already have that brand." }, { status: 409 });
  }

  const info = await db
    .prepare(
      "INSERT INTO brands (marketer_id, name, catalogue_id) VALUES (?, ?, ?) RETURNING id"
    )
    .run(user.id, cat.name, cat.id);

  return NextResponse.json({ ok: true, id: Number(info.lastInsertRowid), name: cat.name });
}
