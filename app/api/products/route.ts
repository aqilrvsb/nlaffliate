import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { uploadImage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Readable by any signed-in user; admin and marketers can change it. */

/**
 * Products hang off the brand itself — the admin catalogue row — not one
 * marketer's copy of it. Two marketers working the same brand sell the same
 * products, so filing them per-marketer would fork the list for no reason.
 */
async function assignableBrand(raw: string): Promise<number | null | "bad"> {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return "bad";
  const ok = await db
    .prepare("SELECT id FROM brands WHERE id = ? AND marketer_id IS NULL")
    .get(n);
  return ok ? n : "bad";
}

export async function GET(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const brand = url.searchParams.get("brand");

  // Affiliates browse the catalogue by brand when requesting a sample, so the
  // filter lives here rather than being done client-side over everything.
  const products = brand
    ? await db.prepare(
        `SELECT p.id, p.name, p.sku, p.product_url, p.info, p.document_url,
                  p.image_url, p.brand_id, b.name AS brand_name, p.created_at
           FROM products p LEFT JOIN brands b ON b.id = p.brand_id
          -- The caller may pass a marketer's copy of a brand; products live
          -- on the catalogue row, so resolve through catalogue_id.
          WHERE p.brand_id = (
            SELECT COALESCE(c.catalogue_id, c.id) FROM brands c WHERE c.id = ?
          )
          ORDER BY p.name`
      ).all(Number(brand))
    : await db.prepare(
        `SELECT p.id, p.name, p.sku, p.product_url, p.info, p.document_url,
                  p.image_url, p.brand_id, b.name AS brand_name, p.created_at
           FROM products p LEFT JOIN brands b ON b.id = p.brand_id
          ORDER BY b.name NULLS LAST, p.name`
      ).all();

  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  const user = await getSession();
  // The catalogue is shared: a marketer filling it in when admin is busy is
  // the point, not an exception. Affiliates stay read-only.
  if (!user || (user.role !== "admin" && user.role !== "marketer")) {
    return NextResponse.json(
      { error: "Only admin or a marketer can edit products." },
      { status: 403 }
    );
  }

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

  const info = await db
    .prepare(
      "INSERT INTO products (name, sku, product_url, info, brand_id, image_url) VALUES (?, ?, ?, ?, ?, NULL) RETURNING id"
    )
    .run(name, sku, productUrl, String(form.get("info") ?? "").trim() || null, brandId);
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

  return NextResponse.json({ ok: true, id });
}
