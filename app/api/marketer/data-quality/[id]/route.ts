import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const intOr0 = (v: any) => {
  const n = parseInt(String(v ?? "").replace(/[^0-9\-]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};

/** Update one data-quality row (brand + product + date + the three counts). */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user || user.role !== "marketer")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = Number(params.id);

  const own = await db.prepare("SELECT id FROM data_quality WHERE id = ? AND marketer_id = ?")
    .get(id, user.id);
  if (!own) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const reportDate = String(body.report_date ?? "").trim();
  const brandId = Number(String(body.brand_id ?? "").trim());
  const productId = body.product_id ? Number(body.product_id) : null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate))
    return NextResponse.json({ error: "Tarikh tidak sah." }, { status: 400 });
  if (!Number.isFinite(brandId))
    return NextResponse.json({ error: "Pilih brand." }, { status: 400 });
  if (productId == null || !Number.isFinite(productId))
    return NextResponse.json({ error: "Pilih product." }, { status: 400 });

  const brand = await db.prepare("SELECT id FROM brands WHERE id = ? AND marketer_id = ?")
    .get(brandId, user.id);
  if (!brand) return NextResponse.json({ error: "That brand is not yours." }, { status: 403 });
  const p = await db.prepare("SELECT id, name FROM products WHERE id = ?")
    .get<{ id: number; name: string }>(productId);
  if (!p) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  await db.prepare(
      `UPDATE data_quality
          SET brand_id = ?, product_id = ?, product_name = ?, report_date = ?,
              inque = ?, learning = ?, delivering = ?,
              exploring = ?, explored = ?, outstanding = ?, performing = ?
        WHERE id = ?`
    ).run(brandId, p.id, p.name, reportDate,
          intOr0(body.inque), intOr0(body.learning), intOr0(body.delivering),
          intOr0(body.exploring), intOr0(body.explored), intOr0(body.outstanding), intOr0(body.performing), id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user || user.role !== "marketer")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = Number(params.id);
  const res = await db
    .prepare("DELETE FROM data_quality WHERE id = ? AND marketer_id = ?")
    .run(id, user.id);
  return NextResponse.json({ ok: true, deleted: res.changes });
}
