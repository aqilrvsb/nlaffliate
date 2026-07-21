import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSetting } from "@/lib/settings";

/**
 * Machine-to-machine ingest: PeningLab pushes a finished video here and
 * assigns it to an affiliate. Shows up in that affiliate's Pending Post.
 *
 *   POST /api/posts/ingest
 *   Authorization: Bearer <ingest_key>
 *
 * Accepts PeningLab's NATIVE shape:
 *   {
 *     "email": "ida@test.com",
 *     "output_url": "https://.../out.mp4",
 *     "caption": "…",
 *     "metadata": {
 *       "cover_title": "RAMAI BELI?",
 *       "cover_subtitle": "PATUTLAH RAMBUT DAH TAK GUGUR",
 *       "cover_thumbnail_url": "https://.../cover.png"
 *     },
 *     "date": "2026-07-21",              // optional, defaults to today (KL)
 *     "source_id": "peninglab-history-id" // optional, prevents duplicates
 *   }
 *
 * Flat aliases also work: affiliate_email/affiliate_id, video_url,
 * cover_title/cover_subtitle/cover_thumbnail_url, post_date.
 * tiktok_url starts NULL and status starts 'pending'.
 */
export async function POST(req: Request) {
  const key = getSetting("ingest_key") || process.env.INGEST_API_KEY || "";
  if (!key) {
    return NextResponse.json(
      { error: "Ingest key not configured. Set it in Admin → Integrations." },
      { status: 503 }
    );
  }

  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (token !== key) {
    return NextResponse.json({ error: "Invalid ingest key." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) || {};
  const meta = body.metadata || {};

  // Accept both PeningLab's native keys and our flat aliases.
  const affiliate_email = body.email || body.affiliate_email;
  const affiliate_id = body.affiliate_id;
  const video_url = body.output_url || body.video_url;
  const caption = body.caption;
  const cover_title = meta.cover_title ?? body.cover_title;
  const cover_subtitle = meta.cover_subtitle ?? body.cover_subtitle;
  const cover_thumbnail_url = meta.cover_thumbnail_url ?? body.cover_thumbnail_url;
  const post_date = body.date || body.post_date;
  const source_id = body.source_id;

  if (!video_url) {
    return NextResponse.json(
      { error: "Video link required (output_url / video_url)." },
      { status: 400 }
    );
  }

  // Resolve the affiliate.
  const affiliate = affiliate_id
    ? db.prepare("SELECT id FROM users WHERE id = ? AND role = 'affiliate'").get(affiliate_id)
    : affiliate_email
      ? db.prepare("SELECT id FROM users WHERE email = ? AND role = 'affiliate'").get(affiliate_email)
      : null;

  if (!affiliate) {
    return NextResponse.json(
      { error: "Affiliate not found (pass affiliate_email or affiliate_id)." },
      { status: 404 }
    );
  }

  // Idempotent on source_id so a retry from PeningLab can't double-post.
  if (source_id) {
    const dupe = db
      .prepare("SELECT id FROM posts WHERE source_id = ?")
      .get(source_id) as any;
    if (dupe) {
      return NextResponse.json({ ok: true, id: dupe.id, duplicate: true });
    }
  }

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());

  const info = db
    .prepare(
      `INSERT INTO posts
         (user_id, post_date, video_url, caption, cover_title, cover_subtitle,
          cover_thumbnail_url, tiktok_url, status, source_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'pending', ?)`
    )
    .run(
      (affiliate as any).id,
      post_date || today,
      video_url,
      caption || null,
      cover_title || null,
      cover_subtitle || null,
      cover_thumbnail_url || null,
      source_id || null
    );

  return NextResponse.json({ ok: true, id: Number(info.lastInsertRowid) });
}
