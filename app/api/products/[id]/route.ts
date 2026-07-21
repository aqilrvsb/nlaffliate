import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { uploadImage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const user = await getSession();
  return user && user.role === "admin" ? user : null;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }
  const id = Number(params.id);

  const form = await req.formData();
  const name = String(form.get("name") || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Product name is required." }, { status: 400 });
  }

  await db.prepare("UPDATE products SET name = ? WHERE id = ?").run(name, id);

  const file = form.get("image") as File | null;
  if (file && file.size > 0) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "image/png";
    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const url = await uploadImage(`product_${id}.${ext}`, bytes, mime);
    await db.prepare("UPDATE products SET image_url = ? WHERE id = ?").run(url, id);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }
  const id = Number(params.id);

  // A product already granted on a sample request is part of that record —
  // deleting it would rewrite history, so block it instead.
  const used = await db
    .prepare("SELECT COUNT(*)::int AS n FROM sample_request_items WHERE product_id = ?")
    .get<{ n: number }>(id);
  if ((used?.n ?? 0) > 0) {
    return NextResponse.json(
      { error: `Cannot delete — this product is on ${used!.n} sample request(s).` },
      { status: 409 }
    );
  }

  await db.prepare("DELETE FROM products WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
