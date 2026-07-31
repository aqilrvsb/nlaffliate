import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

const str = (v: any) => (v != null && String(v).trim() !== "" ? String(v).trim() : null);

/**
 * Import a TikTok "creative data for product campaigns" xlsx into Data Quality.
 *
 * Each VIDEO row (Creative type ≠ Product card) is counted by its lifecycle
 * Status (In queue / Learning / Delivering / Exploring / Explored) and, for the
 * Explored ones, by the Exploration secondary status (Outstanding / Performing)
 * — exactly the seven manual fields. The counts are ADDED to the day's
 * brand-level Data Quality row (product = null), so several files accumulate;
 * fixing a mistake is done from the Data Quality table (edit or delete the row).
 */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user || (user.role !== "marketer" && user.role !== "leader"))
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

  let rows: any[];
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(ws);
  } catch {
    return NextResponse.json({ error: "Could not read that .xlsx file." }, { status: 400 });
  }

  const c = { inque: 0, learning: 0, delivering: 0, exploring: 0, explored: 0, outstanding: 0, performing: 0 };
  let videos = 0, skipped = 0;
  for (const r of rows) {
    const ctype = str(r["Creative type"]);
    // Only videos — a Product-card row is not a creator video.
    if (!ctype || /product\s*card/i.test(ctype)) { skipped++; continue; }
    videos++;

    const s = String(r["Status"] ?? "").trim().toLowerCase();
    if (/in\s*queue/.test(s)) c.inque++;
    else if (s === "learning") c.learning++;
    else if (s === "delivering") c.delivering++;
    else if (s === "exploring") c.exploring++;
    else if (s === "explored") c.explored++;

    // "Performing" vs "Underperforming": match the whole word only.
    const ss = String(r["Exploration secondary status"] ?? "").trim().toLowerCase();
    if (ss === "outstanding") c.outstanding++;
    else if (ss === "performing") c.performing++;
  }

  if (videos === 0)
    return NextResponse.json({ error: "Tiada baris video dalam fail ini." }, { status: 400 });

  // Accumulate onto the day's brand-level row (product = null).
  const existing = await db
    .prepare(
      `SELECT inque, learning, delivering, exploring, explored, outstanding, performing
         FROM data_quality
        WHERE marketer_id = ? AND brand_id = ? AND report_date = ? AND product_id IS NULL`
    )
    .get<Record<string, number>>(user.id, brandId, reportDate);

  const n = {
    inque: (existing?.inque || 0) + c.inque,
    learning: (existing?.learning || 0) + c.learning,
    delivering: (existing?.delivering || 0) + c.delivering,
    exploring: (existing?.exploring || 0) + c.exploring,
    explored: (existing?.explored || 0) + c.explored,
    outstanding: (existing?.outstanding || 0) + c.outstanding,
    performing: (existing?.performing || 0) + c.performing,
  };

  await db
    .prepare("DELETE FROM data_quality WHERE marketer_id = ? AND brand_id = ? AND report_date = ? AND product_id IS NULL")
    .run(user.id, brandId, reportDate);
  await db
    .prepare(
      `INSERT INTO data_quality
         (marketer_id, brand_id, report_date, product_id, product_name,
          inque, learning, delivering, exploring, explored, outstanding, performing)
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(user.id, brandId, reportDate, "Import — semua video",
      n.inque, n.learning, n.delivering, n.exploring, n.explored, n.outstanding, n.performing);

  return NextResponse.json({ ok: true, videos, skipped, total: rows.length, counted: c, report_date: reportDate });
}
