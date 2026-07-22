import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession, type SessionUser } from "@/lib/session";

const MAX_PROFILES = 4;

/**
 * Which account's TikTok links are being read/written.
 *
 * An affiliate always works on their own. Admin may pass ?user_id= (GET) or
 * user_id in the body (POST) to manage any affiliate's links on their behalf —
 * affiliates often need help getting these right.
 */
async function targetUserId(
  user: SessionUser,
  requested: unknown
): Promise<number | null> {
  const asked = Number(String(requested ?? "").trim());
  if (!Number.isFinite(asked) || !asked) return user.id;
  if (asked === user.id) return user.id;
  if (user.role !== "admin") return null;

  const exists = await db
    .prepare("SELECT id FROM users WHERE id = ? AND role = 'affiliate'")
    .get(asked);
  return exists ? asked : null;
}

export async function GET(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const id = await targetUserId(user, url.searchParams.get("user_id"));
  if (!id) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const rows = await db
    .prepare(`SELECT id, label, url, commission_type, commission_value, created_at
       FROM tiktok_profiles WHERE user_id = ? ORDER BY id`)
    .all(id);
  return NextResponse.json({ profiles: rows });
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { label, url } = body;
  if (!label || !url) {
    return NextResponse.json({ error: "Label and TikTok URL are required." }, { status: 400 });
  }

  const id = await targetUserId(user, body.user_id);
  if (!id) return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const count = await db.prepare("SELECT COUNT(*) c FROM tiktok_profiles WHERE user_id = ?")
    .get(id) as any;
  if (count.c >= MAX_PROFILES) {
    return NextResponse.json(
      { error: `Maximum ${MAX_PROFILES} TikTok profile links allowed.` },
      { status: 400 }
    );
  }

  const info = await db.prepare("INSERT INTO tiktok_profiles (user_id, label, url) VALUES (?, ?, ?) RETURNING id")
    .run(id, label, url);
  return NextResponse.json({ id: Number(info.lastInsertRowid) });
}
