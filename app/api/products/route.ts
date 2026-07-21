import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { uploadImage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Catalogue is readable by any signed-in user; only admin can change it. */
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const products = await db
    .prepare("SELECT id, name, image_url, created_at FROM products ORDER BY name")
    .all();

  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const form = await req.formData();
  const name = String(form.get("name") || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Product name is required." }, { status: 400 });
  }

  const info = await db
    .prepare("INSERT INTO products (name, image_url) VALUES (?, NULL) RETURNING id")
    .run(name);
  const id = Number(info.lastInsertRowid);

  // Named after the row id so re-uploading a product image replaces the old one
  // rather than leaving an orphan behind.
  const file = form.get("image") as File | null;
  if (file && file.size > 0) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "image/png";
    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const url = await uploadImage(`product_${id}.${ext}`, bytes, mime);
    await db.prepare("UPDATE products SET image_url = ? WHERE id = ?").run(url, id);
  }

  return NextResponse.json({ ok: true, id });
}
