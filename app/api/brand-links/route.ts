import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clean = (v: any) => String(v ?? "").trim();

/** Add a link under one of the marketer's brands. */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "marketer" && user.role !== "leader")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const brandId = Number(clean(body.brand_id));
  const name = clean(body.name);
  const urlRaw = clean(body.url);
  const type = body.link_type === "self" ? "self" : "affiliate";

  if (!Number.isFinite(brandId))
    return NextResponse.json({ error: "Pilih brand." }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Nama link diperlukan." }, { status: 400 });
  if (!urlRaw) return NextResponse.json({ error: "Link diperlukan." }, { status: 400 });
  const url = /^https?:\/\//i.test(urlRaw) ? urlRaw : `https://${urlRaw}`;

  const brand = await db.prepare("SELECT id FROM brands WHERE id = ? AND marketer_id = ?")
    .get(brandId, user.id);
  if (!brand) return NextResponse.json({ error: "That brand is not yours." }, { status: 403 });

  const info = await db.prepare(
      "INSERT INTO brand_links (brand_id, name, url, link_type) VALUES (?, ?, ?, ?) RETURNING id"
    ).run(brandId, name, url, type);
  return NextResponse.json({ ok: true, id: Number(info.lastInsertRowid) });
}
