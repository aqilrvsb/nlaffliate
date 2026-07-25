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

async function mine(id: number) {
  const user = await getSession();
  if (!user || user.role !== "marketer" && user.role !== "leader") return null;
  const row = await db.prepare("SELECT id FROM creator_reports WHERE id = ? AND marketer_id = ?")
    .get(id, user.id);
  return row ? user : null;
}

/** Edit the Post + Creative values of a Beg Kuning + Creator report. */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!(await mine(id))) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  await db.prepare(
    `UPDATE creator_reports SET
        post_gross_revenue = ?, post_with_links = ?, post_authorized = ?, post_creators_mass_auth = ?,
        creative_gross_revenue = ?, creative_authorized = ?, creative_total_creators = ?, creative_creators_mass_auth = ?
      WHERE id = ?`
  ).run(
    num(body.post_gross_revenue), num(body.post_with_links), num(body.post_authorized), num(body.post_creators_mass_auth),
    num(body.creative_gross_revenue), num(body.creative_authorized), num(body.creative_total_creators), num(body.creative_creators_mass_auth),
    id
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!(await mine(id))) return NextResponse.json({ error: "Not found." }, { status: 404 });
  await db.prepare("DELETE FROM creator_reports WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
