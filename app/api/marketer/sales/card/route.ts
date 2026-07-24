import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const num = (v: any) => {
  if (v === "" || v == null) return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const intOrNull = (v: any) => {
  const n = num(v);
  return n == null ? null : Math.round(n);
};

/**
 * Card — manual per brand + date entry (the new Product export no longer
 * carries the product-card split, so this is keyed in by hand). ROI is
 * auto-calculated (Gross Revenue / Cost). Re-submitting the same brand + date
 * replaces that row.
 */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "marketer")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const reportDate = String(body.report_date ?? "").trim();
  const brandId = Number(String(body.brand_id ?? "").trim());
  const cost = num(body.cost);
  const skuOrders = intOrNull(body.sku_orders);
  const costPerOrder = num(body.cost_per_order);
  const grossRevenue = num(body.gross_revenue);
  const roi = cost && cost > 0 && grossRevenue != null
    ? Math.round((grossRevenue / cost) * 100) / 100
    : null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate))
    return NextResponse.json({ error: "Pilih tarikh yang sah." }, { status: 400 });
  if (!Number.isFinite(brandId))
    return NextResponse.json({ error: "Pilih brand." }, { status: 400 });

  const brand = await db.prepare("SELECT id FROM brands WHERE id = ? AND marketer_id = ?")
    .get(brandId, user.id);
  if (!brand) return NextResponse.json({ error: "That brand is not yours." }, { status: 403 });

  await db.prepare(
      "DELETE FROM sales_card WHERE marketer_id = ? AND brand_id = ? AND report_date = ?"
    ).run(user.id, brandId, reportDate);

  const info = await db.prepare(
      `INSERT INTO sales_card (marketer_id, brand_id, report_date, cost, sku_orders, cost_per_order, gross_revenue, roi)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
    ).run(user.id, brandId, reportDate, cost, skuOrders, costPerOrder, grossRevenue, roi);

  return NextResponse.json({ ok: true, id: Number(info.lastInsertRowid), roi });
}

export async function DELETE(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "marketer")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids)
    ? body.ids.map(Number).filter((n: number) => Number.isFinite(n))
    : [];
  if (ids.length === 0)
    return NextResponse.json({ error: "No rows selected." }, { status: 400 });
  const ph = ids.map(() => "?").join(", ");
  const res = await db
    .prepare(`DELETE FROM sales_card WHERE marketer_id = ? AND id IN (${ph})`)
    .run(user.id, ...ids);
  return NextResponse.json({ ok: true, deleted: res.changes });
}
