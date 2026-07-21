import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { readiness } from "@/lib/status";

/** Explicitly move a live from Pending Post to Done Post. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const owns = db
    .prepare("SELECT id FROM bookings WHERE id = ? AND user_id = ?")
    .get(params.id, user.id);
  if (!owns) return NextResponse.json({ error: "Live not found." }, { status: 404 });

  const { hasResult, hasLink, ready } = readiness(params.id);
  if (!ready) {
    const missing = [
      !hasResult ? "a screenshot" : null,
      !hasLink ? "the video post link" : null,
    ].filter(Boolean).join(" and ");
    return NextResponse.json(
      { error: `Add ${missing} before moving this to Done Post.` },
      { status: 400 }
    );
  }

  db.prepare("UPDATE bookings SET status = 'completed' WHERE id = ?").run(params.id);
  return NextResponse.json({ ok: true, status: "completed" });
}
