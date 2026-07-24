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
  const row = await db.prepare("SELECT id FROM sales_live WHERE id = ? AND marketer_id = ?").get(id, user.id);
  return row ? user : null;
}

/** Edit one daily Live total. Cost/Order and ROI re-derive from the totals. */
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
    `UPDATE sales_live SET cost = ?, net_cost = ?, gross_revenue = ?, roi = ?,
        sku_orders = ?, cost_per_order = ?, live_views = ?, current_budget = ? WHERE id = ?`
  ).run(cost, num(body.net_cost), gross, roi, orders, cpo, num(body.live_views), num(body.current_budget), id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!(await mine(id))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  await db.prepare("DELETE FROM sales_live WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
