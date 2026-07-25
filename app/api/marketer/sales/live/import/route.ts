import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

const num = (v: any) => {
  if (v === "" || v == null) return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const str = (v: any) => (v != null && String(v).trim() !== "" ? String(v).trim() : null);

/**
 * Import a TikTok "Live campaign data" xlsx (the Live tab).
 *   form: file (xlsx) + report_date (YYYY-MM-DD) + brand_id
 * One row per LIVE campaign. Columns: Campaign ID, Campaign name, ROI protection,
 * Net Cost, Cost, Gross revenue, ROI, SKU orders, Cost per order, LIVE views,
 * Target ROI cost, Viewer boost cost, Creative boost cost, Active upgrades,
 * Current budget, Currency.
 * Rows whose first column (Campaign name) is null or "-" are the total/spacer
 * row and are skipped. Re-importing the same brand + date replaces that day.
 */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "marketer" && user.role !== "leader")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const reportDate = String(form.get("report_date") || "").trim();
  const brandRaw = String(form.get("brand_id") ?? "").trim();
  const brandId = Number(brandRaw);

  if (!file) return NextResponse.json({ error: "Attach an .xlsx file." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate))
    return NextResponse.json({ error: "Pick a valid report date." }, { status: 400 });
  if (!brandRaw || !Number.isFinite(brandId))
    return NextResponse.json({ error: "Pick a brand." }, { status: 400 });

  const brand = await db
    .prepare("SELECT id FROM brands WHERE id = ? AND marketer_id = ?")
    .get(brandId, user.id);
  if (!brand)
    return NextResponse.json({ error: "That brand is not yours." }, { status: 403 });

  let rows: any[];
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(ws);
  } catch {
    return NextResponse.json({ error: "Could not read that .xlsx file." }, { status: 400 });
  }

  // Replace this brand+date in both the daily aggregate and the campaign detail.
  await db.prepare("DELETE FROM sales_live WHERE marketer_id = ? AND brand_id = ? AND report_date = ?")
    .run(user.id, brandId, reportDate);
  await db.prepare("DELETE FROM sales_live_campaign WHERE marketer_id = ? AND brand_id = ? AND report_date = ?")
    .run(user.id, brandId, reportDate);

  const insertCampaign = db.prepare(
    `INSERT INTO sales_live_campaign
       (marketer_id, brand_id, report_date, campaign_id, campaign_name, cost, net_cost,
        gross_revenue, roi, sku_orders, cost_per_order, live_views, current_budget)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  // Sum every LIVE campaign into a daily total AND keep each campaign's row.
  let cost = 0, netCost = 0, gross = 0, orders = 0, views = 0, budget = 0;
  let counted = 0, skipped = 0;
  for (const r of rows) {
    // First column is Campaign name; null or "-" is the total/spacer row.
    const name = str(r["Campaign name"]);
    if (!name || name === "-") { skipped++; continue; }
    const rCost = num(r["Cost"]), rGross = num(r["Gross revenue"]), rOrders = num(r["SKU orders"]);
    // Skip dead campaigns: no cost and no revenue.
    if ((rCost || 0) === 0 && (rGross || 0) === 0) { skipped++; continue; }
    cost += rCost || 0;
    netCost += num(r["Net Cost"]) || 0;
    gross += rGross || 0;
    orders += rOrders || 0;
    views += num(r["LIVE views"]) || 0;
    budget += num(r["Current budget"]) || 0;
    counted++;
    await insertCampaign.run(
      user.id, brandId, reportDate, str(r["Campaign ID"]), name,
      rCost, num(r["Net Cost"]), rGross, num(r["ROI"]), rOrders,
      num(r["Cost per order"]), num(r["LIVE views"]), num(r["Current budget"])
    );
  }
  const cpo = orders > 0 ? Math.round((cost / orders) * 100) / 100 : null;
  const roi = cost > 0 ? Math.round((gross / cost) * 100) / 100 : null;

  await db.prepare(
    `INSERT INTO sales_live
       (marketer_id, brand_id, report_date, cost, net_cost, gross_revenue, roi,
        sku_orders, cost_per_order, live_views, current_budget)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(user.id, brandId, reportDate, cost, netCost, gross, roi, orders, cpo, views, budget);

  return NextResponse.json({ ok: true, imported: counted, skipped, total: rows.length, report_date: reportDate });
}
