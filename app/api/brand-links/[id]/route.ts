import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clean = (v: any) => String(v ?? "").trim();

/** The marketer must own the brand the link hangs off. */
async function mine(id: number) {
  const user = await getSession();
  if (!user || user.role !== "marketer" && user.role !== "leader") return null;
  const row = await db.prepare(
      `SELECT l.id FROM brand_links l
         JOIN brands b ON b.id = l.brand_id
        WHERE l.id = ? AND b.marketer_id = ?`
    ).get(id, user.id);
  return row ? user : null;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!(await mine(id))) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const name = clean(body.name);
  const urlRaw = clean(body.url);
  const type = body.link_type === "self" ? "self" : "affiliate";
  if (!name) return NextResponse.json({ error: "Nama link diperlukan." }, { status: 400 });
  if (!urlRaw) return NextResponse.json({ error: "Link diperlukan." }, { status: 400 });
  const url = /^https?:\/\//i.test(urlRaw) ? urlRaw : `https://${urlRaw}`;

  await db.prepare("UPDATE brand_links SET name = ?, url = ?, link_type = ? WHERE id = ?")
    .run(name, url, type, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!(await mine(id))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  await db.prepare("DELETE FROM brand_links WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
