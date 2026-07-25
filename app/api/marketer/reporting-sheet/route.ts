import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const num = (v: any) => {
  if (v === "" || v == null) return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const str = (v: any) => (v != null && String(v).trim() !== "" ? String(v).trim() : null);

/**
 * Reporting Sheet — a whole day's per-time-slot live reporting for one brand.
 * Save replaces every row for (marketer, brand, date). Only slots that carry
 * at least one value are stored, so an empty grid saves nothing.
 *   POST { brand_id, report_date, rows: [{ ord, sesi, masa, c_viewers, r_target,
 *          g_revenue, cost, v_boost, cv_boost, d_time }] }
 */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "marketer" && user.role !== "leader")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const reportDate = String(body.report_date ?? "").trim();
  const brandId = Number(String(body.brand_id ?? "").trim());
  const rows: any[] = Array.isArray(body.rows) ? body.rows : [];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate))
    return NextResponse.json({ error: "Pilih tarikh yang sah." }, { status: 400 });
  if (!Number.isFinite(brandId))
    return NextResponse.json({ error: "Pilih brand." }, { status: 400 });

  const brand = await db.prepare("SELECT id FROM brands WHERE id = ? AND marketer_id = ?")
    .get(brandId, user.id);
  if (!brand) return NextResponse.json({ error: "That brand is not yours." }, { status: 403 });

  await db.prepare(
      "DELETE FROM reporting_sheet WHERE marketer_id = ? AND brand_id = ? AND report_date = ?"
    ).run(user.id, brandId, reportDate);

  const insert = db.prepare(
    `INSERT INTO reporting_sheet
       (marketer_id, brand_id, report_date, ord, sesi, masa,
        c_viewers, r_target, g_revenue, cost, v_boost, cv_boost, d_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let saved = 0;
  for (const r of rows) {
    const c_viewers = num(r.c_viewers), r_target = num(r.r_target), g_revenue = num(r.g_revenue);
    const cost = num(r.cost), v_boost = num(r.v_boost), cv_boost = num(r.cv_boost);
    const d_time = str(r.d_time);
    // Skip slots with no data at all.
    if (c_viewers == null && r_target == null && g_revenue == null && cost == null &&
        v_boost == null && cv_boost == null && d_time == null) continue;
    await insert.run(
      user.id, brandId, reportDate, Number(r.ord) || 0, str(r.sesi), str(r.masa),
      c_viewers, r_target, g_revenue, cost, v_boost, cv_boost, d_time
    );
    saved++;
  }

  return NextResponse.json({ ok: true, saved });
}

/** Delete a whole day's sheet for one brand.  DELETE { brand_id, report_date } */
export async function DELETE(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "marketer" && user.role !== "leader")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const reportDate = String(body.report_date ?? "").trim();
  const brandId = Number(String(body.brand_id ?? "").trim());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate) || !Number.isFinite(brandId))
    return NextResponse.json({ error: "brand_id + report_date required." }, { status: 400 });
  const res = await db.prepare(
      "DELETE FROM reporting_sheet WHERE marketer_id = ? AND brand_id = ? AND report_date = ?"
    ).run(user.id, brandId, reportDate);
  return NextResponse.json({ ok: true, deleted: res.changes });
}
