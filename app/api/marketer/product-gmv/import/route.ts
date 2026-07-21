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

/**
 * Import a TikTok "Product campaign data" xlsx.
 *   form: file (xlsx) + report_date (YYYY-MM-DD)
 * Columns: Campaign ID, Campaign name, Cost, SKU orders, Cost per order,
 *          Gross revenue, ROI.
 * Rows where Cost is 0/blank are skipped. Re-importing the same date
 * replaces that date's rows for this marketer.
 */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "marketer")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const reportDate = String(form.get("report_date") || "").trim();
  // Number(null) and Number("") are both 0, which would sail past a plain
  // isFinite check and fail later as a confusing "not yours" — so test the
  // raw value before coercing.
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

  // Replace this brand's rows for this date (idempotent re-import). Scoped by
  // brand so importing brand B does not wipe brand A's rows for the same day.
  await db.prepare(
      "DELETE FROM product_gmv WHERE marketer_id = ? AND brand_id = ? AND report_date = ?"
    ).run(user.id, brandId, reportDate);

  const insert = db.prepare(
    `INSERT INTO product_gmv
       (marketer_id, brand_id, report_date, campaign_id, campaign_name, spend, sku_orders,
        cost_per_order, gross_revenue, roi)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let imported = 0;
  let skipped = 0;
  for (const r of rows) {
    const spend = num(r["Cost"] ?? r["Spend"]);
    if (spend == null || spend === 0) { skipped++; continue; } // skip zero-cost rows
    // await: run() is async, and without it the inserts race the response —
    // on serverless the function can be frozen before they land.
    await insert.run(
      user.id, brandId, reportDate,
      r["Campaign ID"] != null ? String(r["Campaign ID"]) : null,
      r["Campaign name"] != null ? String(r["Campaign name"]) : null,
      spend,
      num(r["SKU orders"]),
      num(r["Cost per order"]),
      num(r["Gross revenue"]),
      num(r["ROI"])
    );
    imported++;
  }

  return NextResponse.json({ ok: true, imported, skipped, total: rows.length, report_date: reportDate });
}
