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
const intOrNull = (v: any) => { const n = num(v); return n == null ? null : Math.round(n); };

async function mine(id: number) {
  const user = await getSession();
  if (!user || user.role !== "marketer") return null;
  const row = await db.prepare("SELECT id FROM sales_product WHERE id = ? AND marketer_id = ?").get(id, user.id);
  return row ? user : null;
}

/** Edit one daily Product total. Cost/Order and ROI re-derive from the totals. */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!(await mine(id))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const cost = num(body.cost);
  const orders = intOrNull(body.sku_orders);
  const gross = num(body.gross_revenue);
  const cpo = cost && cost > 0 && orders ? Math.round((cost / orders) * 100) / 100 : null;
  const roi = cost && cost > 0 && gross != null ? Math.round((gross / cost) * 100) / 100 : null;
  await db.prepare(
    `UPDATE sales_product SET cost = ?, net_cost = ?, current_budget = ?,
        sku_orders = ?, cost_per_order = ?, gross_revenue = ?, roi = ? WHERE id = ?`
  ).run(cost, num(body.net_cost), num(body.current_budget), orders, cpo, gross, roi, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const user = await mine(id);
  if (!user) return NextResponse.json({ error: "Not found." }, { status: 404 });
  // Cascade the per-campaign detail for the same brand + date.
  const row = await db.prepare(
      "SELECT brand_id, to_char(report_date, 'YYYY-MM-DD') AS report_date FROM sales_product WHERE id = ?"
    ).get<{ brand_id: number | null; report_date: string }>(id);
  await db.prepare("DELETE FROM sales_product WHERE id = ?").run(id);
  if (row) {
    await db.prepare(
        "DELETE FROM sales_product_campaign WHERE marketer_id = ? AND brand_id IS NOT DISTINCT FROM ? AND report_date = ?"
      ).run(user.id, row.brand_id, row.report_date);
  }
  return NextResponse.json({ ok: true });
}
