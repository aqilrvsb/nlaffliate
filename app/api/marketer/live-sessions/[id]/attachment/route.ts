import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { uploadImage } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

async function mine(id: number) {
  const user = await getSession();
  if (!user || user.role !== "marketer" && user.role !== "leader") return null;
  const row = await db.prepare("SELECT id FROM live_sessions WHERE id = ? AND marketer_id = ?")
    .get(id, user.id);
  return row ? user : null;
}

/** Attach (or replace) an image on a live session. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!(await mine(id))) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const form = await req.formData();
  const file = form.get("image") as File | null;
  if (!file || file.size === 0)
    return NextResponse.json({ error: "Attach an image." }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "image/png";
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const url = await uploadImage(`live_session_${id}.${ext}`, bytes, mime);
  await db.prepare("UPDATE live_sessions SET attachment_path = ? WHERE id = ?").run(url, id);
  return NextResponse.json({ ok: true, attachment_path: url });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!(await mine(id))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  await db.prepare("UPDATE live_sessions SET attachment_path = NULL WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
