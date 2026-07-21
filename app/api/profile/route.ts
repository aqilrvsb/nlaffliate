import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await db.prepare("SELECT id, name, email, phone, address, role FROM users WHERE id = ?")
    .get(user.id) as any;
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ profile: { ...row } });
}

export async function PUT(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, phone, address } = await req.json();
  if (!name || !phone || !address) {
    return NextResponse.json(
      { error: "Name, WhatsApp number and address are required." },
      { status: 400 }
    );
  }

  await db.prepare("UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?")
    .run(name, phone, address, user.id);

  return NextResponse.json({ ok: true });
}
