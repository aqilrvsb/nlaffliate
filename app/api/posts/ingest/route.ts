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
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ingestKey() {
  return (await getSetting("ingest_key")) || process.env.INGEST_API_KEY || "";
}

function bearer(req: Request) {
  return (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

/**
 * GET /api/posts/ingest
 *
 * Without a key: returns the contract, so PeningLab can self-serve the spec.
 * With a valid key: also returns the affiliate roster (id + email + name) so
 * PeningLab can map a video to the right account before pushing it.
 */
export async function GET(req: Request) {
  const spec = {
    endpoint: "POST /api/posts/ingest",
    auth: "Authorization: Bearer <INGEST_API_KEY>",
    content_type: "application/json",
    body: {
      email: "affiliate@example.com  (required — or affiliate_id)",
      output_url: "https://.../video.mp4  (required)",
      caption: "TikTok caption (optional)",
      metadata: {
        cover_title: "RAMAI BELI? (optional)",
        cover_subtitle: "PATUTLAH RAMBUT DAH TAK GUGUR (optional)",
        cover_thumbnail_url: "https://.../cover.png (optional)",
      },
      date: "YYYY-MM-DD (optional, defaults to today in Asia/Kuala_Lumpur)",
      source_id: "peninglab history id (optional but recommended — makes retries idempotent)",
    },
    responses: {
      "200": '{ "ok": true, "id": 123 }  — or { "ok": true, "id": 123, "duplicate": true }',
      "400": "video link missing",
      "401": "bad ingest key",
      "404": "affiliate not found for that email/id",
      "503": "ingest key not configured",
    },
    notes: [
      "The post lands in the affiliate's Pending Post tab with status 'pending'.",
      "Once the affiliate pastes the TikTok link, it moves itself to Done Post.",
      "Send source_id so a network retry cannot create a duplicate post.",
    ],
  };

  const key = await ingestKey();
  if (!key || bearer(req) !== key) {
    return NextResponse.json({ ok: true, spec });
  }

  const affiliates = await db
    .prepare("SELECT id, name, email FROM users WHERE role = 'affiliate' ORDER BY name")
    .all();

  return NextResponse.json({ ok: true, spec, affiliates });
}

export async function POST(req: Request) {
  const key = await ingestKey();
  if (!key) {
    return NextResponse.json(
      { error: "Ingest key not configured. Set it in Admin → Integrations." },
      { status: 503 }
    );
  }

  if (bearer(req) !== key) {
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
    ? await db.prepare("SELECT id FROM users WHERE id = ? AND role = 'affiliate'").get(affiliate_id)
    : affiliate_email
      ? await db.prepare("SELECT id FROM users WHERE email = ? AND role = 'affiliate'").get(affiliate_email)
      : null;

  if (!affiliate) {
    return NextResponse.json(
      { error: "Affiliate not found (pass affiliate_email or affiliate_id)." },
      { status: 404 }
    );
  }

  // Idempotent on source_id so a retry from PeningLab can't double-post.
  if (source_id) {
    const dupe = await db.prepare("SELECT id FROM posts WHERE source_id = ?")
      .get(source_id) as any;
    if (dupe) {
      return NextResponse.json({ ok: true, id: dupe.id, duplicate: true });
    }
  }

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());

  const info = await db.prepare(
      `INSERT INTO posts
         (user_id, post_date, video_url, caption, cover_title, cover_subtitle,
          cover_thumbnail_url, tiktok_url, status, source_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'pending', ?) RETURNING id`
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
