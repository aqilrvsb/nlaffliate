import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const intOr0 = (v: any) => {
  const n = parseInt(String(v ?? "").replace(/[^0-9\-]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Data quality — per brand + product + date, how many videos are In queue,
 * Learning, or Delivering. Re-submitting the same brand + product + date
 * replaces that row.
 */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "marketer")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const reportDate = String(body.report_date ?? "").trim();
  const brandId = Number(String(body.brand_id ?? "").trim());
  const productId = body.product_id ? Number(body.product_id) : null;
  const inque = intOr0(body.inque);
  const learning = intOr0(body.learning);
  const delivering = intOr0(body.delivering);
  const exploring = intOr0(body.exploring);
  const explored = intOr0(body.explored);
  const outstanding = intOr0(body.outstanding);
  const performing = intOr0(body.performing);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate))
    return NextResponse.json({ error: "Pilih tarikh yang sah." }, { status: 400 });
  if (!Number.isFinite(brandId))
    return NextResponse.json({ error: "Pilih brand." }, { status: 400 });
  if (productId == null || !Number.isFinite(productId))
    return NextResponse.json({ error: "Pilih product." }, { status: 400 });

  const brand = await db.prepare("SELECT id FROM brands WHERE id = ? AND marketer_id = ?")
    .get(brandId, user.id);
  if (!brand) return NextResponse.json({ error: "That brand is not yours." }, { status: 403 });

  // Resolve the product name (snapshot so history survives a product delete).
  const p = await db.prepare("SELECT id, name FROM products WHERE id = ?")
    .get<{ id: number; name: string }>(productId);
  if (!p) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  const pid = p.id;
  const productName = p.name;

  // Replace the same brand+product+date entry. product_id can be null, so match
  // on IS NOT DISTINCT FROM to treat two nulls as equal.
  await db.prepare(
      `DELETE FROM data_quality
        WHERE marketer_id = ? AND brand_id = ? AND report_date = ?
          AND product_id IS NOT DISTINCT FROM ?`
    ).run(user.id, brandId, reportDate, pid);

  const info = await db.prepare(
      `INSERT INTO data_quality
         (marketer_id, brand_id, product_id, product_name, report_date, inque, learning, delivering,
          exploring, explored, outstanding, performing)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
    ).run(user.id, brandId, pid, productName, reportDate, inque, learning, delivering,
          exploring, explored, outstanding, performing);

  return NextResponse.json({ ok: true, id: Number(info.lastInsertRowid) });
}
