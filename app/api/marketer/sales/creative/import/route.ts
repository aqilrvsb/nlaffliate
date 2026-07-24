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
 * Import a TikTok "creative data for product campaigns" xlsx.
 *   form: file (xlsx) + report_date (YYYY-MM-DD) + brand_id
 * One upload feeds BOTH the Product page (Creative type = Video) and the Card
 * page (Creative type = Product card) — the split is done at display time by
 * creative_type, so the whole sheet lands in one table.
 * Re-importing the same brand + date replaces that day's rows.
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
      "DELETE FROM sales_creative WHERE marketer_id = ? AND brand_id = ? AND report_date = ?"
    ).run(user.id, brandId, reportDate);

  const insert = db.prepare(
    `INSERT INTO sales_creative
       (marketer_id, brand_id, report_date, campaign_name, campaign_id, product_id,
        creative_type, video_title, video_id, tiktok_account, time_posted, status,
        authorization_type, cost, sku_orders, cost_per_order, gross_revenue, roi,
        impressions, clicks, click_rate, conversion_rate,
        view_2s, view_6s, view_25, view_50, view_75, view_100, currency)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let imported = 0;
  let video = 0;
  let card = 0;
  let skipped = 0;
  for (const r of rows) {
    // First column is Campaign name. A null or "-" there is a total/spacer row
    // at the bottom of the export — skip it.
    const campaignName = str(r["Campaign name"]);
    if (!campaignName || campaignName === "-") { skipped++; continue; }
    const ctype = str(r["Creative type"]);
    const campaignId = str(r["Campaign ID"]);
    await insert.run(
      user.id, brandId, reportDate,
      str(r["Campaign name"]),
      campaignId,
      str(r["Product ID"]),
      ctype,
      str(r["Video title"]),
      str(r["Video ID"]),
      str(r["TikTok account"]),
      str(r["Time posted"]),
      str(r["Status"]),
      str(r["Authorization type"]),
      num(r["Cost"]),
      num(r["SKU orders"]),
      num(r["Cost per order"]),
      num(r["Gross revenue"]),
      num(r["ROI"]),
      num(r["Product ad impressions"]),
      num(r["Product ad clicks"]),
      num(r["Product ad click rate"]),
      num(r["Ad conversion rate"]),
      num(r["2-second ad video view rate"]),
      num(r["6-second ad video view rate"]),
      num(r["25% ad video view rate"]),
      num(r["50% ad video view rate"]),
      num(r["75% ad video view rate"]),
      num(r["100% ad video view rate"]),
      str(r["Currency"])
    );
    imported++;
    if (ctype && /product\s*card/i.test(ctype)) card++;
    else video++;
  }

  return NextResponse.json({
    ok: true, imported, video, card, skipped, total: rows.length, report_date: reportDate,
  });
}
