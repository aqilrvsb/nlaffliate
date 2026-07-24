import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const num = (v: any) => {
  if (v === "" || v == null) return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const intOrNull = (v: any) => {
  const n = num(v);
  return n == null ? null : Math.round(n);
};

async function mine(id: number) {
  const user = await getSession();
  if (!user || user.role !== "marketer") return null;
  const row = await db.prepare("SELECT id FROM live_sessions WHERE id = ? AND marketer_id = ?")
    .get(id, user.id);
  return row ? user : null;
}

/**
 * Update a live session. Editing the schedule fields, entering results, and
 * marking it complete all go through here.
 *   { schedule fields } and/or { complete: true, result fields }
 */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const user = await mine(id);
  if (!user) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const sets: string[] = [];
  const args: any[] = [];

  const push = (col: string, val: any) => { sets.push(`${col} = ?`); args.push(val); };

  if ("live_date" in body) {
    const d = String(body.live_date ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d))
      return NextResponse.json({ error: "Tarikh tidak sah." }, { status: 400 });
    push("live_date", d);
  }
  if ("start_time" in body) push("start_time", String(body.start_time ?? "").trim() || null);
  if ("end_time" in body) push("end_time", String(body.end_time ?? "").trim() || null);
  if ("note" in body) push("note", String(body.note ?? "").trim() || null);
  if ("brand_id" in body) {
    const bRaw = String(body.brand_id ?? "").trim();
    const bId = bRaw ? Number(bRaw) : null;
    if (bId != null) {
      const b = await db.prepare("SELECT id FROM brands WHERE id = ? AND marketer_id = ?")
        .get(bId, user.id);
      if (!b) return NextResponse.json({ error: "That brand is not yours." }, { status: 403 });
    }
    push("brand_id", bId);
  }

  // Result fields — present when entering/editing results.
  for (const [key, col, cast] of [
    ["ads_budget", "ads_budget", num], ["ad_spend", "ad_spend", num],
    ["gross_revenue", "gross_revenue", num], ["roi", "roi", num], ["gmv", "gmv", num],
    ["viewers", "viewers", intOrNull], ["items_sold", "items_sold", intOrNull],
    ["duration_live", "duration_live", (v: any) => String(v ?? "").trim() || null],
  ] as const) {
    if (key in body) push(col, (cast as any)(body[key]));
  }

  // complete:true finishes it; complete:false reopens it.
  if ("complete" in body) push("status", body.complete ? "completed" : "pending");

  if (sets.length === 0)
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  args.push(id);
  await db.prepare(`UPDATE live_sessions SET ${sets.join(", ")} WHERE id = ?`).run(...args);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!(await mine(id))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  await db.prepare("DELETE FROM live_sessions WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
