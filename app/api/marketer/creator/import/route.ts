import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { readImageJson } from "@/lib/grsai";
import { uploadImage } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Beg Kuning + Creator — two TikTok screenshots read by vision, same shape as
 * the Overall importer. Image 1 = the "Posts" tab, Image 2 = the "Creators" tab.
 */
const POST_PROMPT = `You read a TikTok shop "Posts" analytics panel with stat tiles. Return ONLY JSON:
{"gross_revenue": number, "posts_with_links": number, "total_authorized_posts": number, "creators_mass_authorization": number}
"gross_revenue" is the "Gross revenue (Current shop)" tile. "creators_mass_authorization" is the "Creators with mass authorization" tile.
Strip "MYR"/"RM"/commas (2,964.50 MYR -> 2964.50). Expand K/M suffixes. Use null if a value is missing. No prose, no fences.`;

const CREATIVE_PROMPT = `You read a TikTok shop "Creators" analytics panel with stat tiles. Return ONLY JSON:
{"gross_revenue": number, "total_authorized_posts": number, "total_creators": number, "creators_mass_authorization": number}
"gross_revenue" is the "Gross revenue (Current shop)" tile. "creators_mass_authorization" is the "Creators with mass authorization" tile.
Strip "MYR"/"RM"/commas. Expand K/M suffixes. Use null if a value is missing. No prose, no fences.`;

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
  const brandRaw = String(form.get("brand_id") ?? "").trim();
  const brandId = Number(brandRaw);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate))
    return NextResponse.json({ error: "Pick a valid report date." }, { status: 400 });
  if (!img1 || !img2)
    return NextResponse.json(
      { error: "Attach both Image 1 (Post) and Image 2 (Creative)." },
      { status: 400 }
    );
  if (!brandRaw || !Number.isFinite(brandId))
    return NextResponse.json({ error: "Pick a brand." }, { status: 400 });

  const brand = await db
    .prepare("SELECT id FROM brands WHERE id = ? AND marketer_id = ?")
    .get(brandId, user.id);
  if (!brand)
    return NextResponse.json({ error: "That brand is not yours." }, { status: 403 });

  let post: any = {}, creative: any = {};
  let img1Path: string | null = null, img2Path: string | null = null;
  try {
    const [p, c] = await Promise.all([
      (async () => {
        const s = await saveImg(img1, `creator_post_${user.id}_${brandId}_${reportDate}`);
        return { path: s.publicPath, data: await readImageJson(s.dataUrl, POST_PROMPT) };
      })(),
      (async () => {
        const s = await saveImg(img2, `creator_creative_${user.id}_${brandId}_${reportDate}`);
        return { path: s.publicPath, data: await readImageJson(s.dataUrl, CREATIVE_PROMPT) };
      })(),
    ]);
    img1Path = p.path; post = p.data;
    img2Path = c.path; creative = c.data;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not read the images." }, { status: 502 });
  }

  await db.prepare(
      "DELETE FROM creator_reports WHERE marketer_id = ? AND brand_id = ? AND report_date = ?"
    ).run(user.id, brandId, reportDate);

  await db.prepare(
    `INSERT INTO creator_reports
       (marketer_id, brand_id, report_date,
        post_gross_revenue, post_with_links, post_authorized, post_creators_mass_auth,
        creative_gross_revenue, creative_authorized, creative_total_creators, creative_creators_mass_auth,
        img1_path, img2_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    user.id, brandId, reportDate,
    num(post.gross_revenue), num(post.posts_with_links), num(post.total_authorized_posts), num(post.creators_mass_authorization),
    num(creative.gross_revenue), num(creative.total_authorized_posts), num(creative.total_creators), num(creative.creators_mass_authorization),
    img1Path, img2Path
  );

  return NextResponse.json({ ok: true, report_date: reportDate, post, creative });
}
