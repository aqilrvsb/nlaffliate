import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { completeIfReady } from "@/lib/status";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Step 1 — Check Schedule.
 *
 * Reconciles a TikTok Creator Live Performance export against the schedules
 * this marketer's affiliates actually booked.
 *
 * The export has no creator column, so nothing in the file says whose lives
 * these are. Instead every row is matched against ALL of the marketer's
 * schedules by date and start time — the match itself identifies the
 * affiliate, which is why no picker is needed.
 *
 * A row that matches nothing means the live ran but nobody booked it here.
 * Those are filed under a per-marketer "Inhouse" account so the numbers are
 * still captured and the marketer can tag a brand on the card afterwards.
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
  const m = String(v).trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) return null;
  return {
    date: `${m[1]}-${m[2]}-${m[3]}`,
    time: `${m[4]}:${m[5]}`,
    mins: Number(m[4]) * 60 + Number(m[5]),
  };
}

/** "1h58m" -> "1h 58m 0s", matching how durations are stored elsewhere. */
function normDuration(v: any): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  const h = s.match(/(\d+)\s*h/i);
  const mm = s.match(/(\d+)\s*m/i);
  const ss = s.match(/(\d+)\s*s/i);
  if (!h && !mm && !ss) return null;
  return `${h ? Number(h[1]) : 0}h ${mm ? Number(mm[1]) : 0}m ${ss ? Number(ss[1]) : 0}s`;
}

/**
 * The marketer's Inhouse account, created on first use.
 *
 * It is a real affiliate row so its lives flow through every existing report,
 * but with an unusable password — it is a bucket, not a person who logs in.
 */
async function inhouseProfile(marketerId: number) {
  const email = `inhouse+${marketerId}@nlaffliatearmy.local`;

  let u = await db.prepare("SELECT id FROM users WHERE email = ?")
    .get<{ id: number }>(email);
  if (!u) {
    const created = await db.prepare(
        `INSERT INTO users (name, email, phone, address, password_hash, role, marketer_id)
         VALUES (?, ?, NULL, NULL, ?, 'affiliate', ?) RETURNING id`
      ).run("Inhouse", email, "!", marketerId);
    u = { id: Number(created.lastInsertRowid) };
  }

  let p = await db.prepare("SELECT id FROM tiktok_profiles WHERE user_id = ? ORDER BY id")
    .get<{ id: number }>(u.id);
  if (!p) {
    const created = await db.prepare(
        "INSERT INTO tiktok_profiles (user_id, label, url) VALUES (?, 'Inhouse', ?) RETURNING id"
      ).run(u.id, "https://www.tiktok.com/");
    p = { id: Number(created.lastInsertRowid) };
  }

  return { userId: u.id, profileId: p.id };
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "marketer")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Attach the .xlsx export." }, { status: 400 });

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

  // Every schedule belonging to this marketer's affiliates, excluding the
  // Inhouse bucket so a previous import cannot absorb this one's rows.
  const existing = (await db.prepare(
      `SELECT b.id, b.user_id, b.live_date, b.start_time, u.name AS affiliate
         FROM bookings b
         JOIN users u ON u.id = b.user_id
        WHERE u.marketer_id = ? AND b.source <> 'inhouse'`
    ).all(user.id)) as {
    id: number; user_id: number; live_date: string; start_time: string; affiliate: string;
  }[];

  const used = new Set<number>();
  const matchedList: { affiliate: string; date: string; time: string }[] = [];
  const inhouseList: { date: string; time: string }[] = [];
  let skipped = 0;
  let inhouse: { userId: number; profileId: number } | null = null;

  for (const r of rows) {
    const start = parseStamp(r["Start Time"]);
    if (!start) { skipped++; continue; }
    const end = parseStamp(r["End Time"]);

    const gmv = money(r["Attributed GMV"]);
    const items = int(r["Attributed items sold"]);
    const views = int(r["Views"]);
    const duration = normDuration(r["Duration"]);

    let best: { id: number; user_id: number; affiliate: string; diff: number } | null = null;
    for (const b of existing) {
      if (used.has(b.id) || b.live_date !== start.date) continue;
      const [bh, bm] = String(b.start_time || "00:00").split(":").map(Number);
      const diff = Math.abs(bh * 60 + bm - start.mins);
      if (diff <= MATCH_WINDOW_MIN && (!best || diff < best.diff)) {
        best = { id: b.id, user_id: b.user_id, affiliate: b.affiliate, diff };
      }
    }

    let bookingId: number;
    let ownerId: number;

    if (best) {
      bookingId = best.id;
      ownerId = best.user_id;
      used.add(best.id);
      matchedList.push({ affiliate: best.affiliate, date: start.date, time: start.time });
    } else {
      // Nobody scheduled this live — file it under Inhouse rather than lose it.
      if (!inhouse) inhouse = await inhouseProfile(user.id);
      const info = await db.prepare(
          `INSERT INTO bookings
             (user_id, profile_id, live_date, start_time, end_time, status, source, affiliate_can_edit)
           VALUES (?, ?, ?, ?, ?, 'pending', 'inhouse', 0) RETURNING id`
        ).run(inhouse.userId, inhouse.profileId, start.date, start.time, end ? end.time : null);
      bookingId = Number(info.lastInsertRowid);
      ownerId = inhouse.userId;
      inhouseList.push({ date: start.date, time: start.time });
    }

    const has = await db.prepare("SELECT id FROM live_results WHERE booking_id = ?").get(bookingId);
    if (has) {
      await db.prepare(
          `UPDATE live_results SET gmv = ?, viewers = ?, items_sold = ?, duration_live = ?
            WHERE booking_id = ?`
        ).run(gmv, views, items, duration, bookingId);
    } else {
      await db.prepare(
          `INSERT INTO live_results (booking_id, user_id, gmv, viewers, items_sold, duration_live)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).run(bookingId, ownerId, gmv, views, items, duration);
    }

    await completeIfReady(bookingId);
  }

  return NextResponse.json({
    ok: true,
    total: rows.length,
    matched: matchedList.length,
    inhouse: inhouseList.length,
    skipped,
    matchedList,
    inhouseList,
  });
}
