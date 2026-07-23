import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { normalisePhone } from "@/lib/whatsapp";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await db.prepare(
      "SELECT id, name, email, staff_id, phone, address, role, marketer_id, wa_group_url FROM users WHERE id = ?"
    ).get(user.id) as any;
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ profile: { ...row } });
}

export async function PUT(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, phone, address, wa_group_url } = await req.json();
  if (!name || !phone || !address) {
    return NextResponse.json(
      { error: "Name, WhatsApp number and address are required." },
      { status: 400 }
    );
  }

  await db.prepare("UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?")
    .run(name, normalisePhone(phone), address, user.id);

  // Only a marketer owns a group link; their affiliates read it off this row.
  if (user.role === "marketer") {
    const link = String(wa_group_url ?? "").trim();
    if (link && !/^https?:\/\//i.test(link)) {
      return NextResponse.json(
        { error: "WhatsApp group link must start with http:// or https://" },
        { status: 400 }
      );
    }
    await db.prepare("UPDATE users SET wa_group_url = ? WHERE id = ?")
      .run(link || null, user.id);
  }

  return NextResponse.json({ ok: true });
}
