import { NextResponse } from "next/server";
import db from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Config + connectivity check. Reports only booleans — never the values —
 * so it's safe to hit from anywhere while debugging a deploy.
 */
export async function GET() {
  const configured = {
    database_url: !!process.env.DATABASE_URL,
    supabase_url: !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabase_service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    jwt_secret: !!process.env.JWT_SECRET,
    grsai_key: !!process.env.GRSAI_API_KEY,
    ingest_key: !!process.env.INGEST_API_KEY,
  };

  let database: { ok: boolean; users?: number; error?: string } = { ok: false };
  try {
    const row = await db
      .prepare("SELECT COUNT(*)::int AS n FROM users")
      .get<{ n: number }>();
    database = { ok: true, users: row?.n ?? 0 };
  } catch (e: any) {
    database = { ok: false, error: String(e?.message || e).slice(0, 200) };
  }

  return NextResponse.json(
    { ok: configured.database_url && database.ok, configured, database },
    { status: database.ok ? 200 : 503 }
  );
}
