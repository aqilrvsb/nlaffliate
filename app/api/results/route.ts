import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { readLiveScreenshot } from "@/lib/grsai";
import { demoteIfIncomplete } from "@/lib/status";
import { uploadImage } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const bookingId = form.get("booking_id");
  const file = form.get("screenshot") as File | null;

  if (!bookingId || !file) {
    return NextResponse.json(
      { error: "booking_id and screenshot are required." },
      { status: 400 }
    );
  }

  // Backstop for the client-side compression — never trust the browser.
  const MAX_BYTES = 10 * 1024 * 1024;
  if (!/^image\//i.test(file.type || "")) {
    return NextResponse.json(
      { error: "Please upload an image file (PNG or JPG)." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Image too large (${(file.size / 1048576).toFixed(1)} MB). Max 10 MB.` },
      { status: 413 }
    );
  }

  // verify booking ownership
  const booking = await db.prepare("SELECT id FROM bookings WHERE id = ? AND user_id = ?")
    .get(bookingId, user.id);
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  // store the screenshot in Supabase Storage (Vercel's fs is ephemeral)
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "image/png";
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  let publicPath: string;
  try {
    publicPath = await uploadImage(`live_${user.id}_${bookingId}.${ext}`, bytes, mime);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Could not store the screenshot." },
      { status: 502 }
    );
  }

  // run AI extraction (Gemini 2.5 Flash via GRSAI)
  const dataUrl = `data:${mime};base64,${bytes.toString("base64")}`;

  let stats;
  let aiError: string | null = null;
  try {
    stats = await readLiveScreenshot(dataUrl);
  } catch (e: any) {
    aiError = e?.message || "AI extraction failed";
    stats = { gmv: null, viewers: null, items_sold: null, duration_live: null, raw: aiError };
  }

  // upsert result for this booking
  const existing = await db.prepare("SELECT id FROM live_results WHERE booking_id = ?")
    .get(bookingId) as any;

  if (existing) {
    await db.prepare(
      `UPDATE live_results SET screenshot_path=?, live_title=?, gmv=?, viewers=?, items_sold=?, duration_live=?, ai_raw=? WHERE id=?`
    ).run(publicPath, stats.live_title, stats.gmv, stats.viewers, stats.items_sold, stats.duration_live, stats.raw, existing.id);
  } else {
    await db.prepare(
      `INSERT INTO live_results (booking_id, user_id, screenshot_path, live_title, gmv, viewers, items_sold, duration_live, ai_raw)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(bookingId, user.id, publicPath, stats.live_title, stats.gmv, stats.viewers, stats.items_sold, stats.duration_live, stats.raw);
  }

  // Uploading a screenshot never auto-completes a live — the affiliate must
  // add the post link and press "transfer to Done Post" explicitly.
  const status = await demoteIfIncomplete(bookingId as string);

  return NextResponse.json({
    ok: true,
    screenshot_path: publicPath,
    stats,
    aiError,
    status,
  });
}

// manual correction of extracted numbers
export async function PUT(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { booking_id, gmv, viewers, items_sold, duration_live } = await req.json();
  const info = await db.prepare(
      `UPDATE live_results SET gmv=?, viewers=?, items_sold=?, duration_live=?
       WHERE booking_id=? AND user_id=?`
    )
    .run(gmv, viewers, items_sold, duration_live, booking_id, user.id);
  if (info.changes === 0)
    return NextResponse.json({ error: "Result not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
