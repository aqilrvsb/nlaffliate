import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { current_password, new_password } = await req.json();
  if (!current_password || !new_password) {
    return NextResponse.json(
      { error: "Current and new password are required." },
      { status: 400 }
    );
  }
  if (String(new_password).length < 6) {
    return NextResponse.json(
      { error: "New password must be at least 6 characters." },
      { status: 400 }
    );
  }

  const row = await db.prepare("SELECT password_hash FROM users WHERE id = ?")
    .get(user.id) as any;
  if (!row || !bcrypt.compareSync(String(current_password), row.password_hash)) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  const hash = bcrypt.hashSync(String(new_password), 10);
  await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, user.id);

  return NextResponse.json({ ok: true });
}
