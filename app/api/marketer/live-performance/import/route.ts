import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { completeIfReady } from "@/lib/status";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Step 1 — import a TikTok "Creator Live Performance" export.
 *
 * The export has no creator column (it is produced per creator), so the
 * marketer names the TikTok profile it belongs to; that profile also
 * identifies the affiliate.
 *
 * Each row is matched to one of that affiliate's existing schedules on the
 * same date, choosing the nearest start time within MATCH_WINDOW. A row with
 * no matching schedule becomes a booking marked source='inhouse' — the live
 * happened, it just was not scheduled here, and losing it would understate
 * the affiliate's numbers.
 */

const MATCH_WINDOW_MIN = 90; // a schedule is "the same live" within 90 minutes

const money = (v: any) => {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const int = (v: any) => {
  if (v == null) return null;
  const n = parseInt(String(v).replace(/[^0-9\-]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};

/** "2026-07-21 08:10:50" -> { date: "2026-07-21", time: "08:10", mins: 490 } */
function parseStamp(v: any): { date: string; time: string; mins: number } | null {
  if (v == null) return null;
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) return null;
  return {
    date: `${m[1]}-${m[2]}-${m[3]}`,
    time: `${m[4]}:${m[5]}`,
    mins: Number(m[4]) * 60 + Number(m[5]),
  };
}

/** "1h58m" / "3h 53m" -> "1h 58m 0s" so it matches the stored format. */
function normDuration(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  const h = s.match(/(\d+)\s*h/i);
  const mm = s.match(/(\d+)\s*m/i);
  const ss = s.match(/(\d+)\s*s/i);
  if (!h && !mm && !ss) return null;
  return `${h ? Number(h[1]) : 0}h ${mm ? Number(mm[1]) : 0}m ${ss ? Number(ss[1]) : 0}s`;
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "marketer")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const profileRaw = String(form.get("profile_id") ?? "").trim();
  const brandRaw = String(form.get("brand_id") ?? "").trim();

  if (!file) return NextResponse.json({ error: "Attach the .xlsx export." }, { status: 400 });
  if (!profileRaw)
    return NextResponse.json({ error: "Pick the TikTok profile this export belongs to." }, { status: 400 });

  // The profile must belong to one of this marketer's affiliates.
  const profile = await db.prepare(
      `SELECT p.id, p.user_id
         FROM tiktok_profiles p
         JOIN users u ON u.id = p.user_id
        WHERE p.id = ? AND u.marketer_id = ?`
    ).get<{ id: number; user_id: number }>(Number(profileRaw), user.id);
  if (!profile)
    return NextResponse.json({ error: "That profile is not one of your affiliates'." }, { status: 403 });

  let brandId: number | null = null;
  if (brandRaw) {
    const b = await db.prepare("SELECT id FROM brands WHERE id = ? AND marketer_id = ?")
      .get(Number(brandRaw), user.id);
    if (!b) return NextResponse.json({ error: "That brand is not yours." }, { status: 403 });
    brandId = Number(brandRaw);
  }

  let rows: any[];
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(ws, { defval: null });
  } catch {
    return NextResponse.json({ error: "Could not read that .xlsx file." }, { status: 400 });
  }

  if (rows.length === 0)
    return NextResponse.json({ error: "That sheet has no rows." }, { status: 400 });

  // This affiliate's existing schedules, so rows can be matched to them.
  const existing = (await db.prepare(
      `SELECT id, live_date, start_time FROM bookings WHERE user_id = ?`
    ).all(profile.user_id)) as { id: number; live_date: string; start_time: string }[];

  const used = new Set<number>();
  let matched = 0;
  let inhouse = 0;
  let skipped = 0;

  for (const r of rows) {
    const start = parseStamp(r["Start Time"]);
    if (!start) { skipped++; continue; }
    const end = parseStamp(r["End Time"]);

    const gmv = money(r["Attributed GMV"]);
    const items = int(r["Attributed items sold"]);
    const views = int(r["Views"]);
    const duration = normDuration(r["Duration"]);

    // Nearest unused schedule on the same date, within the window.
    let best: { id: number; diff: number } | null = null;
    for (const b of existing) {
      if (used.has(b.id) || b.live_date !== start.date) continue;
      const [bh, bm] = String(b.start_time || "00:00").split(":").map(Number);
      const diff = Math.abs(bh * 60 + bm - start.mins);
      if (diff <= MATCH_WINDOW_MIN && (!best || diff < best.diff)) best = { id: b.id, diff };
    }

    let bookingId: number;
    if (best) {
      bookingId = best.id;
      used.add(best.id);
      matched++;
      if (brandId) {
        await db.prepare("UPDATE bookings SET brand_id = COALESCE(brand_id, ?) WHERE id = ?")
          .run(brandId, bookingId);
      }
    } else {
      // The live happened but was never scheduled here — record it as inhouse
      // rather than dropping it.
      const info = await db.prepare(
          `INSERT INTO bookings
             (user_id, profile_id, brand_id, live_date, start_time, end_time,
              status, source, affiliate_can_edit)
           VALUES (?, ?, ?, ?, ?, ?, 'pending', 'inhouse', 0) RETURNING id`
        ).run(
          profile.user_id, profile.id, brandId,
          start.date, start.time, end ? end.time : null
        );
      bookingId = Number(info.lastInsertRowid);
      inhouse++;
    }

    // Upsert the figures onto that booking.
    const has = await db.prepare("SELECT id FROM live_results WHERE booking_id = ?").get(bookingId);
    if (has) {
      await db.prepare(
          `UPDATE live_results
              SET gmv = ?, viewers = ?, items_sold = ?, duration_live = ?
            WHERE booking_id = ?`
        ).run(gmv, views, items, duration, bookingId);
    } else {
      await db.prepare(
          `INSERT INTO live_results (booking_id, user_id, gmv, viewers, items_sold, duration_live)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).run(bookingId, profile.user_id, gmv, views, items, duration);
    }

    await completeIfReady(bookingId);
  }

  return NextResponse.json({
    ok: true, total: rows.length, matched, inhouse, skipped,
  });
}
