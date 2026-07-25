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

/**
 * TTM spend — manual per brand + date entry (Cost + Gross Revenue). The Spend
 * page combines it with the Live/Product/Card GMV totals. Re-submitting the
 * same brand + date replaces that row.
 */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "marketer" && user.role !== "leader")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const reportDate = String(body.report_date ?? "").trim();
  const brandId = Number(String(body.brand_id ?? "").trim());
  const cost = num(body.ttm_cost);
  const gross = num(body.ttm_gross_revenue);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate))
    return NextResponse.json({ error: "Pilih tarikh yang sah." }, { status: 400 });
  if (!Number.isFinite(brandId))
    return NextResponse.json({ error: "Pilih brand." }, { status: 400 });

  const brand = await db.prepare("SELECT id FROM brands WHERE id = ? AND marketer_id = ?")
    .get(brandId, user.id);
  if (!brand) return NextResponse.json({ error: "That brand is not yours." }, { status: 403 });

  await db.prepare(
      "DELETE FROM spend_ttm WHERE marketer_id = ? AND brand_id = ? AND report_date = ?"
    ).run(user.id, brandId, reportDate);

  const info = await db.prepare(
      `INSERT INTO spend_ttm (marketer_id, brand_id, report_date, ttm_cost, ttm_gross_revenue)
       VALUES (?, ?, ?, ?, ?) RETURNING id`
    ).run(user.id, brandId, reportDate, cost, gross);
  return NextResponse.json({ ok: true, id: Number(info.lastInsertRowid) });
}
