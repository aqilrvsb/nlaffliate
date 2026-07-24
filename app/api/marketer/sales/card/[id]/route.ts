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

async function mine(id: number) {
  const user = await getSession();
  if (!user || user.role !== "marketer") return null;
  const row = await db.prepare("SELECT id FROM sales_card WHERE id = ? AND marketer_id = ?")
    .get(id, user.id);
  return row ? user : null;
}

/** Update one card row (ROI re-calculated from Gross Revenue / Cost). */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const user = await mine(id);
  if (!user) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const reportDate = String(body.report_date ?? "").trim();
  const brandId = Number(String(body.brand_id ?? "").trim());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate))
    return NextResponse.json({ error: "Tarikh tidak sah." }, { status: 400 });
  if (!Number.isFinite(brandId))
    return NextResponse.json({ error: "Pilih brand." }, { status: 400 });
  const brand = await db.prepare("SELECT id FROM brands WHERE id = ? AND marketer_id = ?")
    .get(brandId, user.id);
  if (!brand) return NextResponse.json({ error: "That brand is not yours." }, { status: 403 });

  const cost = num(body.cost);
  const skuOrders = intOrNull(body.sku_orders);
  const costPerOrder = num(body.cost_per_order);
  const grossRevenue = num(body.gross_revenue);
  const roi = cost && cost > 0 && grossRevenue != null
    ? Math.round((grossRevenue / cost) * 100) / 100
    : null;

  await db.prepare(
      `UPDATE sales_card
          SET brand_id = ?, report_date = ?, cost = ?, sku_orders = ?,
              cost_per_order = ?, gross_revenue = ?, roi = ?
        WHERE id = ?`
    ).run(brandId, reportDate, cost, skuOrders, costPerOrder, grossRevenue, roi, id);
  return NextResponse.json({ ok: true, roi });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!(await mine(id))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  await db.prepare("DELETE FROM sales_card WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
