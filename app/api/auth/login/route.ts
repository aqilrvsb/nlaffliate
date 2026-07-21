import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { createSession } from "@/lib/session";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required." }, { status: 400 });
  }

  const row = await db.prepare("SELECT id, name, email, password_hash, role FROM users WHERE email = ?")
    .get(email) as any;

  if (!row || !bcrypt.compareSync(String(password), row.password_hash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await createSession({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
  });
  return NextResponse.json({ ok: true, role: row.role });
}
