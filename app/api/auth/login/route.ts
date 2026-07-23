import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { createSession } from "@/lib/session";
import { normaliseStaffId } from "@/lib/staff";

/**
 * Login by Staff ID (MNL-/AFL-/ADM-).
 *
 * The field accepts either the new Staff ID or, as a safety net during the
 * switchover, an email — so no existing account is ever locked out. Staff ID
 * is tried first; anything containing "@" falls back to email lookup.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  // `login` is the new field; `email` is still accepted from older clients.
  const raw = String(body.login ?? body.staff_id ?? body.email ?? "").trim();
  const password = String(body.password ?? "");
  if (!raw || !password) {
    return NextResponse.json({ error: "ID Staff dan password diperlukan." }, { status: 400 });
  }

  let row: any;
  if (raw.includes("@")) {
    row = await db
      .prepare("SELECT id, name, email, staff_id, password_hash, role FROM users WHERE lower(email) = lower(?)")
      .get(raw);
  } else {
    row = await db
      .prepare("SELECT id, name, email, staff_id, password_hash, role FROM users WHERE staff_id = ?")
      .get(normaliseStaffId(raw));
  }

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
