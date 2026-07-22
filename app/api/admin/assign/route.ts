import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { sendWhatsApp, welcomeMessage } from "@/lib/whatsapp";

export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { affiliate_id, marketer_id } = await req.json();
  if (!affiliate_id)
    return NextResponse.json({ error: "affiliate_id required" }, { status: 400 });

  // affiliate must be an affiliate
  const aff = await db.prepare("SELECT id FROM users WHERE id = ? AND role = 'affiliate'")
    .get(affiliate_id);
  if (!aff) return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });

  // marketer_id may be null (unassign) or must be a marketer
  let mid: number | null = null;
  if (marketer_id) {
    const mk = await db.prepare("SELECT id FROM users WHERE id = ? AND role = 'marketer'")
      .get(marketer_id);
    if (!mk) return NextResponse.json({ error: "Marketer not found" }, { status: 404 });
    mid = Number(marketer_id);
  }

  await db.prepare("UPDATE users SET marketer_id = ? WHERE id = ?").run(mid, affiliate_id);

  // Assignment is what unlocks the dashboard, so this is the moment the
  // affiliate can actually use the system — tell them. Best-effort: a failed
  // message must not fail the assignment. But it is reported back, because a
  // welcome that silently never sent looks exactly like one that did, and the
  // affiliate is left waiting for a link nobody knows didn't arrive.
  let notified: boolean | null = null;
  let notify_note: string | null = null;
  if (marketer_id) {
    const a = await db
      .prepare("SELECT name, phone FROM users WHERE id = ?")
      .get<{ name: string; phone: string | null }>(affiliate_id);
    if (a) {
      const wa = await sendWhatsApp(a.phone, welcomeMessage(a.name));
      notified = wa.ok;
      notify_note = wa.skipped || wa.error || null;
      if (!wa.ok) console.error("[whatsapp] welcome failed:", notify_note);
    }
  }

  return NextResponse.json({ ok: true, notified, notify_note });
}
