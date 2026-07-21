import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A marketer owns their brands; admin can see everyone's. */
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const brands = user.role === "admin"
    ? await db.prepare(
        `SELECT b.id, b.name, b.marketer_id, u.name AS marketer_name
           FROM brands b JOIN users u ON u.id = b.marketer_id
          ORDER BY b.name`
      ).all()
    : await db.prepare(
        "SELECT id, name, marketer_id FROM brands WHERE marketer_id = ? ORDER BY name"
      ).all(user.id);

  return NextResponse.json({ brands });
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "marketer") {
    return NextResponse.json({ error: "Marketers only." }, { status: 403 });
  }

  const { name } = await req.json().catch(() => ({}));
  const clean = String(name || "").trim();
  if (!clean) {
    return NextResponse.json({ error: "Brand name is required." }, { status: 400 });
  }

  const dupe = await db
    .prepare("SELECT id FROM brands WHERE marketer_id = ? AND lower(name) = lower(?)")
    .get(user.id, clean);
  if (dupe) {
    return NextResponse.json({ error: "You already have a brand with that name." }, { status: 409 });
  }

  const info = await db
    .prepare("INSERT INTO brands (marketer_id, name) VALUES (?, ?) RETURNING id")
    .run(user.id, clean);

  return NextResponse.json({ ok: true, id: Number(info.lastInsertRowid) });
}
