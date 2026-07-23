import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { createSession } from "@/lib/session";
import { normaliseStaffId } from "@/lib/staff";

/**
 * Login by Staff ID (MNL-/AFL-/HQNL). Every account has one, so this is the
 * only way in — there is no email fallback.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const staffId = normaliseStaffId(body.login ?? body.staff_id ?? "");
  const password = String(body.password ?? "");
  if (!staffId || !password) {
    return NextResponse.json({ error: "ID Staff dan password diperlukan." }, { status: 400 });
  }

  const row = await db
    .prepare("SELECT id, name, email, staff_id, password_hash, role FROM users WHERE staff_id = ?")
    .get<any>(staffId);

  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return NextResponse.json({ error: "ID Staff atau password salah." }, { status: 401 });
  }

  await createSession({
    id: row.id,
    name: row.name,
    email: row.email ?? "",
    staff_id: row.staff_id ?? "",
    role: row.role,
  });
  return NextResponse.json({ ok: true, role: row.role });
}
