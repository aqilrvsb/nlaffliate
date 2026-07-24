import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Bulk-delete creative rows (feeds both the Product and Card pages).
 *   DELETE  body: { ids: number[] }
 * Scoped to this marketer. The ids come from whichever page the marketer is
 * on, so Product deletes Video rows and Card deletes Product-card rows.
 */
export async function DELETE(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "marketer")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids)
    ? body.ids.map(Number).filter((n: number) => Number.isFinite(n))
    : [];
  if (ids.length === 0)
    return NextResponse.json({ error: "No rows selected." }, { status: 400 });

  const ph = ids.map(() => "?").join(", ");
  const res = await db
    .prepare(`DELETE FROM sales_creative WHERE marketer_id = ? AND id IN (${ph})`)
    .run(user.id, ...ids);

  return NextResponse.json({ ok: true, deleted: res.changes });
}
