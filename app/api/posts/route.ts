import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

/** Posts assigned to the signed-in affiliate, newest first. */
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = db
    .prepare(
      `SELECT id, post_date, video_url, caption, cover_title, cover_subtitle,
              cover_thumbnail_url, tiktok_url, status, created_at
       FROM posts
       WHERE user_id = ?
       ORDER BY post_date DESC, id DESC`
    )
    .all(user.id)
    .map((r: any) => ({ ...r }));

  return NextResponse.json({ posts: rows });
}
