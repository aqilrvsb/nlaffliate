import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { completeIfReady } from "@/lib/status";

/**
 * Marketer updates a live belonging to one of their affiliates.
 *   - ads_budget: the ad budget for this live
 *   - allow_edit: toggle whether the affiliate may re-edit date/time
 *
 * Setting a budget without an explicit allow_edit locks affiliate edits
 * (the marketer has taken over), matching the described workflow.
 */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user || user.role !== "marketer")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Booking must belong to an affiliate assigned to this marketer.
  const owns = await db.prepare(
      `SELECT b.id FROM bookings b
       JOIN users u ON u.id = b.user_id
       WHERE b.id = ? AND u.marketer_id = ?`
    )
    .get(params.id, user.id);
  if (!owns) return NextResponse.json({ error: "Live not found." }, { status: 404 });

  const body = await req.json();
  const sets: string[] = [];
  const args: any[] = [];

  if ("ads_budget" in body) {
    const raw = body.ads_budget;
    const n = raw === "" || raw == null ? null : Number(raw);
    if (n != null && (!Number.isFinite(n) || n < 0)) {
      return NextResponse.json({ error: "Budget must be a positive number." }, { status: 400 });
    }
    sets.push("ads_budget = ?");
    args.push(n);
    // Updating the budget locks the affiliate unless they also pass allow_edit.
    if (!("allow_edit" in body)) {
      sets.push("affiliate_can_edit = 0");
    }
  }

  if ("allow_edit" in body) {
    sets.push("affiliate_can_edit = ?");
    args.push(body.allow_edit ? 1 : 0);
  }

  // Manually entered ad results.
  const num = (v: any) => (v === "" || v == null ? null : Number(v));
  for (const k of ["ad_spend", "gross_revenue", "roi"] as const) {
    if (k in body) {
      const n = num(body[k]);
      if (n != null && !Number.isFinite(n)) {
        return NextResponse.json({ error: `${k} must be a number.` }, { status: 400 });
      }
      sets.push(`${k} = ?`);
      args.push(n);
    }
  }

  if (sets.length === 0)
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  args.push(params.id);
  await db.prepare(`UPDATE bookings SET ${sets.join(", ")} WHERE id = ?`).run(...args);

  // A live auto-completes only when Budget + Spend + Gross + ROI are all set.
  const status = await completeIfReady(params.id);

  const row = await db.prepare("SELECT ads_budget, affiliate_can_edit FROM bookings WHERE id = ?")
    .get(params.id) as any;
  return NextResponse.json({
    ok: true,
    status,
    ads_budget: row.ads_budget,
    affiliate_can_edit: row.affiliate_can_edit,
  });
}
