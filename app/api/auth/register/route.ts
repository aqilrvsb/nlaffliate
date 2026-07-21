import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { createSession } from "@/lib/session";

export async function POST(req: Request) {
  const { name, email, phone, address, password, role } = await req.json();

  if (!name || !email || !phone || !address || !password || !role) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (!["marketer", "affiliate", "admin"].includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }
  if (String(password).length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return NextResponse.json({ error: "Email already registered." }, { status: 409 });
  }

  const hash = bcrypt.hashSync(String(password), 10);
  const info = db
    .prepare(
      "INSERT INTO users (name, email, phone, address, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(name, email, phone, address, hash, role);

  const user = {
    id: Number(info.lastInsertRowid),
    name,
    email,
    role,
  };
  await createSession(user);
  return NextResponse.json({ ok: true, role });
}
