import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { uploadImage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const user = await getSession();
  // Shared catalogue — admin and marketers maintain it together.
  return user && (user.role === "admin" || user.role === "marketer") ? user : null;
}


/** Products hang off a marketer's brand — a catalogue row has no affiliates. */
async function assignableBrand(raw: string): Promise<number | null | "bad"> {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return "bad";
  const ok = await db
    .prepare("SELECT id FROM brands WHERE id = ? AND marketer_id IS NOT NULL")
    .get(n);
  return ok ? n : "bad";
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { error: "Only admin or a marketer can edit products." },
      { status: 403 }
    );
  }
  const id = Number(params.id);

  const form = await req.formData();
  const name = String(form.get("name") || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Product name is required." }, { status: 400 });
  }

  const brandRaw = String(form.get("brand_id") ?? "").trim();
  const brandId = await assignableBrand(brandRaw);
  if (brandId === "bad") {
    return NextResponse.json(
      { error: "Pick a brand that belongs to a marketer." },
      { status: 400 }
    );
  }
  const sku = String(form.get("sku") ?? "").trim() || null;
  const productUrl = String(form.get("product_url") ?? "").trim() || null;
  if (productUrl && !/^https?:\/\//i.test(productUrl))
    return NextResponse.json({ error: "Link must start with http:// or https://" }, { status: 400 });
  await db
    .prepare("UPDATE products SET name = ?, sku = ?, product_url = ?, info = ?, brand_id = ? WHERE id = ?")
    .run(name, sku, productUrl, String(form.get("info") ?? "").trim() || null,
         brandId, id);

  const file = form.get("image") as File | null;
  if (file && file.size > 0) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "image/png";
    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const url = await uploadImage(`product_${id}.${ext}`, bytes, mime);
    await db.prepare("UPDATE products SET image_url = ? WHERE id = ?").run(url, id);
  }

  // A second image slot for spec sheets / product info the affiliate reads.
  const att = form.get("attachment") as File | null;
  if (att && att.size > 0) {
    const bytes = Buffer.from(await att.arrayBuffer());
    const mime = att.type || "image/png";
    const ext = (att.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const url = await uploadImage(`product_att_${id}.${ext}`, bytes, mime);
    await db.prepare("UPDATE products SET attachment_url = ? WHERE id = ?").run(url, id);
  }

  // A downloadable document (PDF) — spec sheet, price list, brief.
  const doc = form.get("document") as File | null;
  if (doc && doc.size > 0) {
    const bytes = Buffer.from(await doc.arrayBuffer());
    const ext = (doc.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "");
    const url = await uploadImage(
      `product_doc_${id}.${ext}`,
      bytes,
      doc.type || "application/pdf"
    );
    await db.prepare("UPDATE products SET document_url = ? WHERE id = ?").run(url, id);
  }


  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) {
    return NextResponse.json(
      { error: "Only admin or a marketer can edit products." },
      { status: 403 }
    );
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
