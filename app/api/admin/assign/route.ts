import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { sendWhatsApp, affiliateAssignedMessage } from "@/lib/whatsapp";

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

  // The affiliate is told they can log in only when the marketer presses
  // Activate. But alert the MARKETER now, so they know a new affiliate landed
  // in their list and can go set it up. Best-effort.
  let notified: boolean | null = null;
  let notify_note: string | null = null;
  if (mid) {
    const info = await db
      .prepare(
        `SELECT m.phone AS marketer_phone, a.name AS aff_name, a.staff_id AS aff_staff
           FROM users m JOIN users a ON a.id = ?
          WHERE m.id = ?`
      )
      .get<{ marketer_phone: string | null; aff_name: string; aff_staff: string | null }>(affiliate_id, mid);
    if (info) {
      const wa = await sendWhatsApp(
        info.marketer_phone,
        affiliateAssignedMessage({ affiliateName: info.aff_name, affiliateStaffId: info.aff_staff })
      );
      notified = wa.ok;
      notify_note = wa.skipped || wa.error || null;
    }
  }

  return NextResponse.json({ ok: true, notified, notify_note });
}
