import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

/**
 * Record the TikTok link for a post. Saving a link moves the post to
 * Done Post; clearing it sends it back to Pending Post.
 */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tiktok_url } = await req.json();
  const url = typeof tiktok_url === "string" ? tiktok_url.trim() : "";

  if (url && !/^https?:\/\//i.test(url)) {
    return NextResponse.json(
      { error: "Enter a full link starting with https://" },
      { status: 400 }
    );
  }

  const status = url ? "done" : "pending";

  const info = db
    .prepare(
      "UPDATE posts SET tiktok_url = ?, status = ? WHERE id = ? AND user_id = ?"
    )
    .run(url || null, status, params.id, user.id);

  if (info.changes === 0)
    return NextResponse.json({ error: "Post not found." }, { status: 404 });

  return NextResponse.json({ ok: true, status, tiktok_url: url || null });
}
