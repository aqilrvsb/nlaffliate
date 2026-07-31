import db from "@/lib/db";

/**
 * A day's Product Card total is the SUM of its upload batches
 * (sales_card_upload). Recompute rebuilds the single sales_card row for a
 * brand + date from those batches, so uploads accumulate and deleting a
 * wrongly-uploaded file re-tallies the day. With no batches left, the daily row
 * is removed entirely. Cost/Order and ROI are derived from the summed totals.
 */
export async function recomputeSalesCard(
  marketerId: number,
  brandId: number,
  reportDate: string
): Promise<{ batches: number }> {
  const agg = await db
    .prepare(
      `SELECT COALESCE(SUM(cost), 0) AS cost,
              COALESCE(SUM(sku_orders), 0) AS orders,
              COALESCE(SUM(gross_revenue), 0) AS gross,
              COUNT(*)::int AS n
         FROM sales_card_upload
        WHERE marketer_id = ? AND brand_id = ? AND report_date = ?`
    )
    .get<{ cost: number; orders: number; gross: number; n: number }>(
      marketerId, brandId, reportDate
    );

  await db
    .prepare("DELETE FROM sales_card WHERE marketer_id = ? AND brand_id = ? AND report_date = ?")
    .run(marketerId, brandId, reportDate);

  const n = agg?.n ?? 0;
  if (n === 0) return { batches: 0 };

  const cost = Number(agg!.cost) || 0;
  const orders = Number(agg!.orders) || 0;
  const gross = Number(agg!.gross) || 0;
  const cpo = orders > 0 ? Math.round((cost / orders) * 100) / 100 : null;
  const roi = cost > 0 ? Math.round((gross / cost) * 100) / 100 : null;

  await db
    .prepare(
      `INSERT INTO sales_card (marketer_id, brand_id, report_date, cost, sku_orders, cost_per_order, gross_revenue, roi)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(marketerId, brandId, reportDate, cost, orders, cpo, gross, roi);

  return { batches: n };
}
