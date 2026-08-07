import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { getPillar, PILLAR_COLUMNS, TOTAL_PILLAR_ITEMS } from "@/lib/pillars";
import { sendTelegram } from "@/lib/telegram";
import { fmtDate } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLS = ["problem", "solution", "planning", "execution"] as const;
const CUSTOM_NO = 17;

/**
 * Save MANY pillar levels for one brand + date in a single submit, then post ONE
 * full report to the Telegram group. This is what lets a marketer fill several
 * levels — switching between them without losing drafts — and submit them all at
 * once, so the group gets the complete picture rather than a message per level.
 *
 * Body: { date, brand_id, levels: { [level]: { rows: {item_no: {..}}, custom_name } } }
 */
export async function POST(req: Request) {
  const user = await getSession();
  if (!user || (user.role !== "marketer" && user.role !== "leader"))
    return NextResponse.json({ error: "Marketers only." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const date = String(body.date || "");
  const brandRaw = String(body.brand_id ?? "").trim();
  const brandId = Number(brandRaw);
  const levels = (body.levels || {}) as Record<string, { rows?: Record<string, any>; custom_name?: string }>;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return NextResponse.json({ error: "A valid date is required." }, { status: 400 });
  if (!brandRaw || !Number.isFinite(brandId))
    return NextResponse.json({ error: "Pick a brand." }, { status: 400 });

  const brand = await db
    .prepare("SELECT id, name FROM brands WHERE id = ? AND marketer_id = ?")
    .get<{ id: number; name: string }>(brandId, user.id);
  if (!brand)
    return NextResponse.json({ error: "That brand is not yours." }, { status: 403 });

  let saved = 0, cleared = 0;
  const touched: number[] = [];

  for (const [lvlKey, payload] of Object.entries(levels)) {
    const level = Number(lvlKey);
    const pillar = getPillar(level);
    if (!pillar) continue;
    const valid = new Set(pillar.items.map((i) => i.no));
    const rows = payload?.rows || {};
    const customName = String(payload?.custom_name ?? "").trim() || null;
    let levelSaved = 0;

    for (const [key, raw] of Object.entries(rows)) {
      const no = Number(key);
      if (!valid.has(no) && no !== CUSTOM_NO) continue;
      const v = (raw || {}) as Record<string, unknown>;
      const vals = COLS.map((c) => (String(v[c] ?? "").trim() || null));
      const name = no === CUSTOM_NO ? customName : null;
      const empty = vals.every((x) => x === null) && (no !== CUSTOM_NO || !name);

      if (empty) {
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
             (marketer_id, brand_id, level, item_no, entry_date, item_name, problem, solution, planning, execution)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (marketer_id, brand_id, level, item_no, entry_date) DO UPDATE
             SET item_name = EXCLUDED.item_name, problem = EXCLUDED.problem,
                 solution = EXCLUDED.solution, planning = EXCLUDED.planning,
                 execution = EXCLUDED.execution, updated_at = now()`
        )
        .run(user.id, brandId, level, no, date, name, ...vals);
      saved += 1; levelSaved += 1;
    }
    if (levelSaved > 0) touched.push(level);
  }

  // One full report to the group — named, with the ACTUAL text filled for each
  // item (Problem / Solution / Planning / Execution), plus overall coverage.
  // Best-effort; split into <4096-char chunks so Telegram never rejects it.
  if (saved > 0) {
    try {
      const esc = (s: unknown) =>
        String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      // Detail from what was just submitted (the payload carries the text).
      const detail: string[] = [];
      for (const lvl of [...touched].sort((a, b) => a - b)) {
        const pillar = getPillar(lvl);
        if (!pillar) continue;
        const payload = levels[String(lvl)];
        const rows = payload?.rows || {};
        const lines: string[] = [];
        // Keep catalogue order, custom row last.
        const nos = Object.keys(rows).map(Number).sort((a, b) => a - b);
        for (const no of nos) {
          const v = (rows[no] || {}) as Record<string, unknown>;
          const cols = PILLAR_COLUMNS
            .filter((c) => String(v[c.key] ?? "").trim())
            .map((c) => `   ${c.emoji} <b>${c.label}:</b> ${esc(String(v[c.key]).trim())}`);
          if (!cols.length) continue;
          const itemName = no === CUSTOM_NO
            ? (payload?.custom_name || "Item tambahan")
            : (pillar.items.find((i) => i.no === no)?.name || `#${no}`);
          lines.push(`▸ <b>${esc(itemName)}</b>\n${cols.join("\n")}`);
        }
        if (lines.length) detail.push(`\n📌 <b>Level ${lvl} — ${esc(pillar.title)}</b>\n${lines.join("\n")}`);
      }

      // Overall coverage across the whole pillar.
      const all = await db
        .prepare(
          `SELECT DISTINCT ON (level, item_no) level, item_no, problem, solution, planning, execution
             FROM pillar_entries WHERE marketer_id = ?
            ORDER BY level, item_no, updated_at DESC`
        )
        .all<{ level: number; item_no: number; problem: string | null; solution: string | null; planning: string | null; execution: string | null }>(user.id);
      const catalogue = all.filter((r) => getPillar(r.level)?.items.some((i) => i.no === r.item_no));
      const covered = catalogue.length;
      const pct = Math.round((covered / TOTAL_PILLAR_ITEMS) * 100);

      const header =
        `📊 <b>Pillar Update</b>\n` +
        `👤 <b>${esc(user.name)}</b> (${esc(user.staff_id || "—")})\n` +
        `🏷️ Brand: ${esc(brand.name)}  ·  📅 ${esc(fmtDate(date))}\n` +
        `📌 <b>${saved}</b> item dikemas kini  ·  📈 Liputan: <b>${covered}/${TOTAL_PILLAR_ITEMS} (${pct}%)</b>\n`;

      // Chunk to Telegram's 4096-char limit, breaking between items.
      const LIMIT = 3900;
      const chunks: string[] = [];
      let buf = header;
      for (const block of detail) {
        if ((buf + block).length > LIMIT) {
          chunks.push(buf);
          buf = block.replace(/^\n/, "");
        } else {
          buf += block;
        }
      }
      chunks.push(buf);
      for (const c of chunks) await sendTelegram(c);
    } catch { /* best-effort */ }
  }

  return NextResponse.json({ ok: true, saved, cleared, levels: touched });
}
