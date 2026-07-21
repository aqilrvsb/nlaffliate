import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { label, url } = await req.json();
  if (!label || !url) {
    return NextResponse.json({ error: "Label and URL required." }, { status: 400 });
  }
  const info = await db.prepare("UPDATE tiktok_profiles SET label = ?, url = ? WHERE id = ? AND user_id = ?")
    .run(label, url, params.id, user.id);
  if (info.changes === 0)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const info = await db.prepare("DELETE FROM tiktok_profiles WHERE id = ? AND user_id = ?")
    .run(params.id, user.id);
  if (info.changes === 0)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
