import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The marketer's Product Card upload batches — one row per uploaded Excel, so
 * the Excel Product Card tab can show how many files went into each day and
 * remove a wrong one. A leader's own workspace counts as a marketer here.
 */
export async function GET() {
  const user = await getSession();
  if (!user || (user.role !== "marketer" && user.role !== "leader"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const uploads = await db
    .prepare(
      `SELECT s.id, to_char(s.report_date, 'YYYY-MM-DD') AS report_date,
              s.brand_id, b.name AS brand_name,
              s.cost, s.sku_orders, s.gross_revenue, s.filename, s.rows_counted,
              s.created_at
         FROM sales_card_upload s
         LEFT JOIN brands b ON b.id = s.brand_id
        WHERE s.marketer_id = ?
        ORDER BY s.report_date DESC, s.created_at DESC`
    )
    .all(user.id);

  return NextResponse.json({ uploads });
}
