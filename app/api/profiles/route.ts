import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

const MAX_PROFILES = 4;

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = db
    .prepare("SELECT id, label, url, created_at FROM tiktok_profiles WHERE user_id = ? ORDER BY id")
    .all(user.id);
  return NextResponse.json({ profiles: rows });
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { label, url } = await req.json();
  if (!label || !url) {
    return NextResponse.json({ error: "Label and TikTok URL are required." }, { status: 400 });
  }

  const count = db
    .prepare("SELECT COUNT(*) c FROM tiktok_profiles WHERE user_id = ?")
    .get(user.id) as any;
  if (count.c >= MAX_PROFILES) {
    return NextResponse.json(
      { error: `Maximum ${MAX_PROFILES} TikTok profile links allowed.` },
      { status: 400 }
    );
  }

  const info = db
    .prepare("INSERT INTO tiktok_profiles (user_id, label, url) VALUES (?, ?, ?)")
    .run(user.id, label, url);
  return NextResponse.json({ id: Number(info.lastInsertRowid) });
}
