import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { readAnalyticsTable, type AnalyticsRow } from "@/lib/grsai";
import { durationToSeconds } from "@/lib/format";
import { completeIfReady } from "@/lib/status";

export const runtime = "nodejs";
export const maxDuration = 60;

const norm = (s: string | null) =>
  (s || "").toLowerCase().replace(/\s+/g, " ").trim();

const toMinutes = (t: string | null) => {
  if (!t) return null;
  const [h, m] = String(t).split(":").map(Number);
  return Number.isFinite(h) ? h * 60 + (m || 0) : null;
};

type Candidate = {
  booking_id: number;
  live_date: string;
  start_time: string;
  live_title: string | null;
  duration_live: string | null;
};

export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "marketer")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const files = form.getAll("images").filter((f): f is File => f instanceof File);
  if (files.length === 0)
    return NextResponse.json({ error: "Attach at least one analytics image." }, { status: 400 });

  // 1) Extract rows from every uploaded image.
  let rows: AnalyticsRow[] = [];
  try {
    for (const file of files) {
      const bytes = Buffer.from(await file.arrayBuffer());
      const dataUrl = `data:${file.type || "image/png"};base64,${bytes.toString("base64")}`;
      const part = await readAnalyticsTable(dataUrl);
      rows = rows.concat(part);
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not read the analytics image." }, { status: 502 });
  }

  // 2) Pending lives for this marketer's affiliates that have a captured
  //    live title (uploaded screenshot) to match against.
  const candidates = await db.prepare(
      `SELECT b.id AS booking_id, b.live_date, b.start_time,
              r.live_title, r.duration_live
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       JOIN live_results r ON r.booking_id = b.id
       WHERE u.marketer_id = ? AND b.status = 'pending'`
    )
    .all(user.id) as Candidate[];

  const used = new Set<number>();
  let matched = 0;
  const unknown: AnalyticsRow[] = [];

  // Fill the ad columns; completion is decided by completeIfReady (needs a
  // budget too), so a matched row without a budget stays pending with data.
  const updateStmt = await db.prepare(
    "UPDATE bookings SET ad_spend=?, gross_revenue=?, roi=? WHERE id=?"
  );
  const unknownStmt = await db.prepare(
    `INSERT INTO unknown_lives (marketer_id, live_name, live_date, live_time, duration, ad_spend, gross_revenue, roi)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const row of rows) {
    // Every row is processed — a matching schedule is updated even when
    // Spend is 0. Name + date must match exactly; duration close; time closest.
    const rowSecs = durationToSeconds(row.duration);
    const rowMin = toMinutes(row.time);

    let best: { id: number; score: number } | null = null;
    for (const c of candidates) {
      if (used.has(c.booking_id)) continue;
      if (norm(c.live_title) !== norm(row.name)) continue;
      if (c.live_date !== row.date) continue;

      // Duration closeness (tolerate ~10 min drift between the seller
      // dashboard and the affiliate's own recap screenshot).
      const durDiff = Math.abs(durationToSeconds(c.duration_live) - rowSecs);
      if (rowSecs > 0 && durDiff > 600) continue;

      const cMin = toMinutes(c.start_time);
      const timeDiff = rowMin != null && cMin != null ? Math.abs(rowMin - cMin) : 9999;
      const score = timeDiff + durDiff / 60;
      if (!best || score < best.score) best = { id: c.booking_id, score };
    }

    if (best) {
      used.add(best.id);
      updateStmt.run(row.ad_spend, row.gross_revenue, row.roi, best.id);
      completeIfReady(best.id); // -> Success only if a budget is also set
      matched++;
    } else {
      unknownStmt.run(
        user.id, row.name, row.date, row.time, row.duration,
        row.ad_spend, row.gross_revenue, row.roi
      );
      unknown.push(row);
    }
  }

  return NextResponse.json({
    ok: true,
    total: rows.length,
    matched,
    unknown: unknown.length,
    rows,
  });
}
