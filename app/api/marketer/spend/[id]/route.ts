import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user || user.role !== "marketer")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = Number(params.id);
  const res = await db
    .prepare("DELETE FROM spend_ttm WHERE id = ? AND marketer_id = ?")
    .run(id, user.id);
  return NextResponse.json({ ok: true, deleted: res.changes });
}
