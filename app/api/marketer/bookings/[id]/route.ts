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

  // Reschedule: the marketer sets ad budgets against a slot, so they need to
  // move it without going through the affiliate.
  if ("live_date" in body) {
    const d = String(body.live_date || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      return NextResponse.json({ error: "Pick a valid date." }, { status: 400 });
    }
    sets.push("live_date = ?");
    args.push(d);
  }
  for (const k of ["start_time", "end_time"] as const) {
    if (k in body) {
      const t = String(body[k] || "").trim();
      if (k === "start_time" && !t) {
        return NextResponse.json({ error: "Start time is required." }, { status: 400 });
      }
      if (t && !/^\d{2}:\d{2}$/.test(t)) {
        return NextResponse.json({ error: "Times must be HH:MM." }, { status: 400 });
      }
      sets.push(`${k} = ?`);
      args.push(t || null);
    }
  }

  // Re-tag the live against a different brand — must be one of the
  // marketer's own, so a live cannot be moved to someone else's brand.
  if ("brand_id" in body) {
    const raw = String(body.brand_id ?? "").trim();
    if (!raw) {
      sets.push("brand_id = ?");
      args.push(null);
    } else {
      const n = Number(raw);
      const owned = Number.isFinite(n)
        ? await db.prepare("SELECT id FROM brands WHERE id = ? AND marketer_id = ?")
            .get(n, user.id)
        : null;
      if (!owned) {
        return NextResponse.json({ error: "That brand is not yours." }, { status: 403 });
      }
      sets.push("brand_id = ?");
      args.push(n);
    }
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

  // Duration lives on live_results, not bookings — a live can have a duration
  // recorded before any screenshot exists, so upsert the row.
  if ("duration_live" in body) {
    const d = String(body.duration_live ?? "").trim() || null;
    const owner = await db
      .prepare("SELECT user_id FROM bookings WHERE id = ?")
      .get<{ user_id: number }>(params.id);
    const existing = await db
      .prepare("SELECT id FROM live_results WHERE booking_id = ?")
      .get(params.id);

    if (existing) {
      await db.prepare("UPDATE live_results SET duration_live = ? WHERE booking_id = ?")
        .run(d, params.id);
    } else if (d) {
      await db.prepare(
          "INSERT INTO live_results (booking_id, user_id, duration_live) VALUES (?, ?, ?)"
        ).run(params.id, owner!.user_id, d);
    }
  }

  if (sets.length === 0) {
    if ("duration_live" in body) {
      const status = await completeIfReady(params.id);
      return NextResponse.json({ ok: true, status });
    }
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

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

/**
 * Marketer removes a schedule belonging to one of their affiliates.
 *
 * Deleting takes the recorded result with it, so a completed live — one with
 * figures already reported — is refused. Those are history; the way to undo a
 * mistake there is to correct the numbers, not erase the record.
 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user || user.role !== "marketer")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const row = await db.prepare(
      `SELECT b.id, b.status
         FROM bookings b
         JOIN users u ON u.id = b.user_id
        WHERE b.id = ? AND u.marketer_id = ?`
    ).get<{ id: number; status: string }>(params.id, user.id);
  if (!row) return NextResponse.json({ error: "Live not found." }, { status: 404 });

  const url = new URL(_req.url);
  if (row.status === "completed" && url.searchParams.get("force") !== "1") {
    return NextResponse.json(
      {
        error: "This live is already completed — deleting it removes its recorded results too.",
        needsConfirm: true,
      },
      { status: 409 }
    );
  }

  await db.prepare("DELETE FROM bookings WHERE id = ?").run(params.id);
  return NextResponse.json({ ok: true });
}
