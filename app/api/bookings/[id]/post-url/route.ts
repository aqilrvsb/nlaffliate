import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { readiness } from "@/lib/status";

/** Save / update the posted-video link for a live. */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { post_url } = await req.json();
  const url = typeof post_url === "string" ? post_url.trim() : "";

  if (url && !/^https?:\/\//i.test(url)) {
    return NextResponse.json(
      { error: "Enter a full link starting with https://" },
      { status: 400 }
    );
  }

  const info = db
    .prepare("UPDATE bookings SET post_url = ? WHERE id = ? AND user_id = ?")
    .run(url || null, params.id, user.id);

  if (info.changes === 0)
    return NextResponse.json({ error: "Live not found." }, { status: 404 });

  // Saving a link auto-transfers the live to Done Post, as long as the
  // screenshot (the results proof) is already there. Clearing the link
  // sends it back to Pending.
  const { hasResult, ready } = readiness(params.id);
  const status = ready ? "completed" : "pending";
  db.prepare("UPDATE bookings SET status = ? WHERE id = ?").run(status, params.id);

  return NextResponse.json({
    ok: true,
    status,
    post_url: url || null,
    // surfaced so the UI can explain why it didn't move
    needsScreenshot: !!url && !hasResult,
  });
}
