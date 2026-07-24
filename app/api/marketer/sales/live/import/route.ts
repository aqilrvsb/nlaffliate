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
 * Import a TikTok "Campaign overview data" xlsx (the Live tab).
 *   form: file (xlsx) + report_date (YYYY-MM-DD) + brand_id
 * Columns: Time, Cost, SKU orders (Current shop), Cost per order (Current shop),
 *          Gross revenue (Current shop), ROI (Current shop), Currency.
 * Every row is kept (it is an hourly breakdown). Re-importing the same brand +
 * date replaces that day's rows.
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
      "DELETE FROM sales_live WHERE marketer_id = ? AND brand_id = ? AND report_date = ?"
    ).run(user.id, brandId, reportDate);

  const insert = db.prepare(
    `INSERT INTO sales_live
       (marketer_id, brand_id, report_date, row_time, cost, sku_orders,
        cost_per_order, gross_revenue, roi, currency)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let imported = 0;
  let skipped = 0;
  for (const r of rows) {
    const time = str(r["Time"]);
    // The export ends with a blank/total spacer row now and then — a row with
    // no time and no cost is not a real hour.
    const cost = num(r["Cost"]);
    if (!time && cost == null) { skipped++; continue; }
    await insert.run(
      user.id, brandId, reportDate,
      time,
      cost,
      num(r["SKU orders (Current shop)"] ?? r["SKU orders"]),
      num(r["Cost per order (Current shop)"] ?? r["Cost per order"]),
      num(r["Gross revenue (Current shop)"] ?? r["Gross revenue"]),
      num(r["ROI (Current shop)"] ?? r["ROI"]),
      str(r["Currency"])
    );
    imported++;
  }

  return NextResponse.json({ ok: true, imported, skipped, total: rows.length, report_date: reportDate });
}
