import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { getPillar } from "@/lib/pillars";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLS = ["problem", "solution", "planning", "execution"] as const;

/** Admin sees everyone's entries; a marketer sees only their own. */
async function scope() {
  const user = await getSession();
  if (!user) return null;
  if (user.role !== "marketer" && user.role !== "admin") return null;
  return user;
}

/**
 * GET /api/pillars?level=1&date=2026-07-22   → one level on one date (editing)
 * GET /api/pillars?from=…&to=…               → everything in range (reporting)
 */
export async function GET(req: Request) {
  const user = await scope();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const url = new URL(req.url);
  const level = url.searchParams.get("level");
  const date = url.searchParams.get("date");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const brand = url.searchParams.get("brand"); // omitted = all brands

  const where: string[] = [];
  const args: any[] = [];

  if (user.role === "marketer") {
    where.push("e.marketer_id = ?");
    args.push(user.id);
  }
  if (level) { where.push("e.level = ?"); args.push(Number(level)); }
  if (date)  { where.push("e.entry_date = ?"); args.push(date); }
  if (from)  { where.push("e.entry_date >= ?"); args.push(from); }
  if (to)    { where.push("e.entry_date <= ?"); args.push(to); }
  if (brand) { where.push("e.brand_id = ?"); args.push(Number(brand)); }

  const sql =
    `SELECT e.id, e.marketer_id, e.brand_id, b.name AS brand_name,
            e.level, e.item_no, e.entry_date,
            e.problem, e.solution, e.planning, e.execution, e.updated_at
       FROM pillar_entries e
       LEFT JOIN brands b ON b.id = e.brand_id
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY e.entry_date DESC, e.level, e.item_no`;

  const entries = await db.prepare(sql).all(...args);
  return NextResponse.json({ entries });
}

/**
 * POST /api/pillars — save one level for one date.
 *
 * Body: { level, date, rows: { [item_no]: {problem, solution, planning, execution} } }
 *
 * Every row is upserted; a row whose four columns are all blank is deleted, so
 * clearing a field actually removes it instead of leaving an empty record that
 * would inflate the "filled" count in reporting.
 */
export async function POST(req: Request) {
  const user = await scope();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  if (user.role !== "marketer") {
    return NextResponse.json({ error: "Marketers only." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const level = Number(body.level);
  const date = String(body.date || "");
  const brandId = Number(body.brand_id);
  const rows = body.rows || {};

  const pillar = getPillar(level);
  if (!pillar) return NextResponse.json({ error: "Unknown level." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "A valid date is required." }, { status: 400 });
  }
  if (!Number.isFinite(brandId)) {
    return NextResponse.json({ error: "Pick a brand." }, { status: 400 });
  }
  const brand = await db
    .prepare("SELECT id FROM brands WHERE id = ? AND marketer_id = ?")
    .get(brandId, user.id);
  if (!brand) {
    return NextResponse.json({ error: "That brand is not yours." }, { status: 403 });
  }

  const valid = new Set(pillar.items.map((i) => i.no));
  let saved = 0;
  let cleared = 0;

  for (const [key, raw] of Object.entries(rows)) {
    const no = Number(key);
    if (!valid.has(no)) continue; // ignore anything not in the catalogue

    const v = (raw || {}) as Record<string, unknown>;
    const vals = COLS.map((c) => {
      const s = String(v[c] ?? "").trim();
      return s || null;
    });

    if (vals.every((x) => x === null)) {
      const res = await db
        .prepare(
          `DELETE FROM pillar_entries
            WHERE marketer_id = ? AND brand_id = ? AND level = ? AND item_no = ? AND entry_date = ?`
        )
        .run(user.id, brandId, level, no, date);
      cleared += res.changes || 0;
      continue;
    }

    await db
      .prepare(
        `INSERT INTO pillar_entries
           (marketer_id, brand_id, level, item_no, entry_date, problem, solution, planning, execution)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (marketer_id, brand_id, level, item_no, entry_date) DO UPDATE
           SET problem = EXCLUDED.problem,
               solution = EXCLUDED.solution,
               planning = EXCLUDED.planning,
               execution = EXCLUDED.execution,
               updated_at = now()`
      )
      .run(user.id, brandId, level, no, date, ...vals);
    saved += 1;
  }

  return NextResponse.json({ ok: true, saved, cleared });
}
