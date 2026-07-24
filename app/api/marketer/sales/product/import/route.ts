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
 * Import a TikTok "Product campaign data" xlsx.
 *   form: file (xlsx) + report_date (YYYY-MM-DD) + brand_id
 * One row per product campaign. Columns: Campaign ID, Campaign name, Cost,
 * ROI protection, Active upgrades, Net Cost, Current budget, SKU orders,
 * Cost per order, Gross revenue, ROI, Currency.
 * Rows whose Campaign name is null or "-" are the total/spacer row and skipped.
 * Re-importing the same brand + date replaces that day.
 */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "marketer")
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

  await db.prepare(
      "DELETE FROM sales_product WHERE marketer_id = ? AND brand_id = ? AND report_date = ?"
    ).run(user.id, brandId, reportDate);

  const insert = db.prepare(
    `INSERT INTO sales_product
       (marketer_id, brand_id, report_date, campaign_id, campaign_name, roi_protection,
        active_upgrades, cost, net_cost, current_budget, sku_orders, cost_per_order,
        gross_revenue, roi, currency)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let imported = 0;
  let skipped = 0;
  for (const r of rows) {
    const name = str(r["Campaign name"]);
    if (!name || name === "-") { skipped++; continue; }
    await insert.run(
      user.id, brandId, reportDate,
      str(r["Campaign ID"]),
      name,
      str(r["ROI protection"]),
      str(r["Active upgrades"]),
      num(r["Cost"]),
      num(r["Net Cost"]),
      num(r["Current budget"]),
      num(r["SKU orders"]),
      num(r["Cost per order"]),
      num(r["Gross revenue"]),
      num(r["ROI"]),
      str(r["Currency"])
    );
    imported++;
  }

  return NextResponse.json({ ok: true, imported, skipped, total: rows.length, report_date: reportDate });
}
