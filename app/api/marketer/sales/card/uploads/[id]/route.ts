import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { recomputeSalesCard } from "@/lib/salesCard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Remove one Product Card upload batch and re-tally that day's total, so a
 * wrongly-uploaded file can be undone. Only the owner may delete their own.
 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user || (user.role !== "marketer" && user.role !== "leader"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = Number(params.id);
  if (!Number.isFinite(id))
    return NextResponse.json({ error: "Bad id." }, { status: 400 });

  const row = await db
    .prepare("SELECT id, brand_id, to_char(report_date, 'YYYY-MM-DD') AS report_date FROM sales_card_upload WHERE id = ? AND marketer_id = ?")
    .get<{ id: number; brand_id: number; report_date: string }>(id, user.id);
  if (!row) return NextResponse.json({ error: "Upload not found." }, { status: 404 });

  await db.prepare("DELETE FROM sales_card_upload WHERE id = ?").run(id);
  const { batches } = await recomputeSalesCard(user.id, row.brand_id, row.report_date);

  return NextResponse.json({ ok: true, batches });
}
