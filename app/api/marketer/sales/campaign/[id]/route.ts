import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Delete one imported campaign row (Live or Product) and re-tally the day's
 * total from what's left, so the daily Sales · Live / Product figure stays in
 * sync with its campaign detail. Removing the last campaign for a brand+date
 * clears the daily row too.
 *
 * DELETE /api/marketer/sales/campaign/:id?kind=live|product
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user || (user.role !== "marketer" && user.role !== "leader"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = Number(params.id);
  if (!Number.isFinite(id))
    return NextResponse.json({ error: "Bad id." }, { status: 400 });

  const kind = new URL(req.url).searchParams.get("kind");
  if (kind !== "live" && kind !== "product")
    return NextResponse.json({ error: "kind must be live or product." }, { status: 400 });

  const campTable = kind === "live" ? "sales_live_campaign" : "sales_product_campaign";
  const dailyTable = kind === "live" ? "sales_live" : "sales_product";

  // Must be the caller's own campaign row.
  const row = await db
    .prepare(`SELECT id, brand_id, to_char(report_date,'YYYY-MM-DD') AS report_date FROM ${campTable} WHERE id = ? AND marketer_id = ?`)
    .get<{ id: number; brand_id: number; report_date: string }>(id, user.id);
  if (!row) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  await db.prepare(`DELETE FROM ${campTable} WHERE id = ?`).run(id);

  // Re-tally the day from the remaining campaigns.
  const viewsSel = kind === "live" ? "COALESCE(SUM(live_views),0) AS views," : "0 AS views,";
  const agg = await db
    .prepare(
      `SELECT COALESCE(SUM(cost),0) AS cost, COALESCE(SUM(net_cost),0) AS net_cost,
              COALESCE(SUM(gross_revenue),0) AS gross, COALESCE(SUM(sku_orders),0) AS orders,
              COALESCE(SUM(current_budget),0) AS budget, ${viewsSel}
              COUNT(*)::int AS n
         FROM ${campTable}
        WHERE marketer_id = ? AND brand_id = ? AND report_date = ?`
    )
    .get<{ cost: number; net_cost: number; gross: number; orders: number; budget: number; views: number; n: number }>(
      user.id, row.brand_id, row.report_date
    );

  await db
    .prepare(`DELETE FROM ${dailyTable} WHERE marketer_id = ? AND brand_id = ? AND report_date = ?`)
    .run(user.id, row.brand_id, row.report_date);

  if (agg && agg.n > 0) {
    const cost = Number(agg.cost) || 0;
    const orders = Number(agg.orders) || 0;
    const gross = Number(agg.gross) || 0;
    const cpo = orders > 0 ? Math.round((cost / orders) * 100) / 100 : null;
    const roi = cost > 0 ? Math.round((gross / cost) * 100) / 100 : null;
    if (kind === "live") {
      await db
        .prepare(
          `INSERT INTO sales_live (marketer_id, brand_id, report_date, cost, net_cost, gross_revenue, roi, sku_orders, cost_per_order, live_views, current_budget)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(user.id, row.brand_id, row.report_date, cost, Number(agg.net_cost) || 0, gross, roi, orders, cpo, Number(agg.views) || 0, Number(agg.budget) || 0);
    } else {
      await db
        .prepare(
          `INSERT INTO sales_product (marketer_id, brand_id, report_date, cost, net_cost, current_budget, sku_orders, cost_per_order, gross_revenue, roi)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(user.id, row.brand_id, row.report_date, cost, Number(agg.net_cost) || 0, Number(agg.budget) || 0, orders, cpo, gross, roi);
    }
  }

  return NextResponse.json({ ok: true, remaining: agg?.n ?? 0 });
}
