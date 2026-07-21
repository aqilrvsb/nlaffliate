import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { readImageJson } from "@/lib/grsai";
import { uploadImage } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

const OVERVIEW_PROMPT = `You read a TikTok GMV Max "Overview" panel. Return ONLY JSON:
{"cost": number, "sku_orders": number, "cost_per_order": number, "gross_revenue": number, "roi": number}
Strip "MYR"/"RM"/commas (1,339.16 MYR -> 1339.16). Use null if a value is missing. No prose, no fences.`;

const METRICS_PROMPT = `You read a TikTok "Key metrics" panel. Return ONLY JSON:
{"gmv": number, "visitors": number, "product_impressions": number, "product_clicks": number}
Expand K/M suffixes (RM21.8K -> 21800, 1.2M -> 1200000). Strip "RM"/commas. Ignore the green % change. null if missing. No prose, no fences.`;

const num = (v: any) => {
  if (v === "" || v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

async function saveImg(file: File, name: string) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "image/png";
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const publicPath = await uploadImage(`${name}.${ext}`, bytes, mime);
  return { publicPath, dataUrl: `data:${mime};base64,${bytes.toString("base64")}` };
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "marketer")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const img1 = form.get("image1") as File | null;
  const img2 = form.get("image2") as File | null;
  const reportDate = String(form.get("report_date") || "").trim();
  // Number(null) and Number("") are both 0, which would sail past a plain
  // isFinite check and fail later as a confusing "not yours" — so test the
  // raw value before coercing.
  const brandRaw = String(form.get("brand_id") ?? "").trim();
  const brandId = Number(brandRaw);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate))
    return NextResponse.json({ error: "Pick a valid report date." }, { status: 400 });
  if (!img1 && !img2)
    return NextResponse.json({ error: "Attach at least one screenshot." }, { status: 400 });

  if (!brandRaw || !Number.isFinite(brandId)) {
    return NextResponse.json({ error: "Pick a brand." }, { status: 400 });
  }
  const brand = await db
    .prepare("SELECT id FROM brands WHERE id = ? AND marketer_id = ?")
    .get(brandId, user.id);
  if (!brand) {
    return NextResponse.json({ error: "That brand is not yours." }, { status: 403 });
  }

  let overview: any = {}, metrics: any = {};
  let img1Path: string | null = null, img2Path: string | null = null;
  try {
    if (img1) {
      const s = await saveImg(img1, `overall_ov_${user.id}_${brandId}_${reportDate}`);
      img1Path = s.publicPath;
      overview = await readImageJson(s.dataUrl, OVERVIEW_PROMPT);
    }
    if (img2) {
      const s = await saveImg(img2, `overall_km_${user.id}_${brandId}_${reportDate}`);
      img2Path = s.publicPath;
      metrics = await readImageJson(s.dataUrl, METRICS_PROMPT);
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not read the images." }, { status: 502 });
  }

  // Replace this brand's report for this date — re-importing corrects it
  // rather than stacking a second row.
  await db.prepare(
      "DELETE FROM overall_reports WHERE marketer_id = ? AND brand_id = ? AND report_date = ?"
    ).run(user.id, brandId, reportDate);

  await db.prepare(
    `INSERT INTO overall_reports
       (marketer_id, brand_id, report_date, cost, sku_orders, cost_per_order, gross_revenue, roi,
        gmv, visitors, product_impressions, product_clicks, img1_path, img2_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    user.id, brandId, reportDate,
    num(overview.cost), num(overview.sku_orders), num(overview.cost_per_order),
    num(overview.gross_revenue), num(overview.roi),
    num(metrics.gmv), num(metrics.visitors), num(metrics.product_impressions),
    num(metrics.product_clicks), img1Path, img2Path
  );

  return NextResponse.json({ ok: true, report_date: reportDate, overview, metrics });
}
