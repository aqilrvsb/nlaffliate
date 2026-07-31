import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { moneyScalerFromForm } from "@/lib/currency";

export const runtime = "nodejs";
export const maxDuration = 60;

const num = (v: any) => {
  if (v === "" || v == null) return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const str = (v: any) => (v != null && String(v).trim() !== "" ? String(v).trim() : null);

/**
 * Import a TikTok "creative data for product campaigns" xlsx, but keep ONLY the
 * rows where Creative type = "Product card". They are summed into a single
 * daily Card total for the brand + date. Re-importing replaces that day.
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

  const brand = await db.prepare("SELECT id FROM brands WHERE id = ? AND marketer_id = ?")
    .get(brandId, user.id);
  if (!brand) return NextResponse.json({ error: "That brand is not yours." }, { status: 403 });

  // IDR uploads are converted to MYR before storing; MYR is a no-op.
  const sc = moneyScalerFromForm(form.get("currency"), form.get("rate"));
  if (!sc.ok) return NextResponse.json({ error: sc.error }, { status: 400 });
  const money = (v: any) => sc.scaler.scale(num(v)) || 0;

  let rows: any[];
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(ws);
  } catch {
    return NextResponse.json({ error: "Could not read that .xlsx file." }, { status: 400 });
  }

  // Only Product-card rows, summed.
  let cost = 0, orders = 0, gross = 0;
  let counted = 0, skipped = 0;
  for (const r of rows) {
    const ctype = str(r["Creative type"]);
    if (!ctype || !/product\s*card/i.test(ctype)) { skipped++; continue; }
    const rCost = money(r["Cost"]), rGross = money(r["Gross revenue"]);
    if (rCost === 0 && rGross === 0) { skipped++; continue; }
    cost += rCost;
    orders += num(r["SKU orders"]) || 0;
    gross += rGross;
    counted++;
  }
  const cpo = orders > 0 ? Math.round((cost / orders) * 100) / 100 : null;
  const roi = cost > 0 ? Math.round((gross / cost) * 100) / 100 : null;

  await db.prepare(
      "DELETE FROM sales_card WHERE marketer_id = ? AND brand_id = ? AND report_date = ?"
    ).run(user.id, brandId, reportDate);

  await db.prepare(
      `INSERT INTO sales_card (marketer_id, brand_id, report_date, cost, sku_orders, cost_per_order, gross_revenue, roi)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(user.id, brandId, reportDate, cost, orders, cpo, gross, roi);

  return NextResponse.json({ ok: true, imported: counted, skipped, total: rows.length, report_date: reportDate });
}
