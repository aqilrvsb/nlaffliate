import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

/**
 * Posts for the signed-in affiliate, newest first.
 *
 * ?user_id= lets a marketer (or admin) read one of their affiliates' posts,
 * so they can watch what was handed over without logging in as them. Scoped
 * to their own affiliates — the id alone is never trusted.
 */
export async function GET(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const asked = Number(String(new URL(req.url).searchParams.get("user_id") ?? "").trim());
  let target = user.id;

  if (Number.isFinite(asked) && asked && asked !== user.id) {
    if (user.role === "admin") {
      const ok = await db
        .prepare("SELECT id FROM users WHERE id = ? AND role = 'affiliate'")
        .get(asked);
      if (!ok) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    } else if (user.role === "marketer") {
      const mine = await db
        .prepare("SELECT id FROM users WHERE id = ? AND role = 'affiliate' AND marketer_id = ?")
        .get(asked, user.id);
      if (!mine) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    } else {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }
    target = asked;
  }

  const rows = (
    await db
      .prepare(
        `SELECT id, post_date, video_url, caption, cover_title, cover_subtitle,
                cover_thumbnail_url, tiktok_url, status, created_at
         FROM posts
         WHERE user_id = ?
         ORDER BY post_date DESC, id DESC`
      )
      .all(target)
  ).map((r: any) => ({ ...r }));

  return NextResponse.json({ posts: rows });
}
