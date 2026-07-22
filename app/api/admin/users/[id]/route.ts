import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Delete an affiliate or marketer account.
 *
 * Deletion cascades widely, and the two roles lose very different things, so
 * the first call always refuses and reports exactly what would go. The caller
 * repeats with ?force=1 once the operator has seen the list.
 *
 * Marketers are the dangerous case: their affiliates survive (marketer_id is
 * SET NULL, so the accounts simply become unassigned) but every brand,
 * Overall report, Pillar entry and Product GMV row they own is destroyed.
 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const id = Number(params.id);
  if (!Number.isFinite(id))
    return NextResponse.json({ error: "Bad id." }, { status: 400 });

  if (id === user.id)
    return NextResponse.json(
      { error: "You cannot delete your own account." },
      { status: 409 }
    );

  const target = await db
    .prepare("SELECT id, name, email, role FROM users WHERE id = ?")
    .get<{ id: number; name: string; email: string; role: string }>(id);
  if (!target)
    return NextResponse.json({ error: "Account not found." }, { status: 404 });

  // Losing every admin would lock everyone out of assignment and settings.
  if (target.role === "admin") {
    const others = await db
      .prepare("SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin' AND id <> ?")
      .get<{ n: number }>(id);
    if ((others?.n ?? 0) === 0)
      return NextResponse.json(
        { error: "This is the only admin account — create another before deleting it." },
        { status: 409 }
      );
  }

  const count = async (sql: string) =>
    (await db.prepare(sql).get<{ n: number }>(id))?.n ?? 0;

  let impact: Record<string, number>;
  if (target.role === "marketer") {
    impact = {
      affiliates_unassigned: await count(
        "SELECT COUNT(*)::int AS n FROM users WHERE marketer_id = ?"
      ),
      brands: await count("SELECT COUNT(*)::int AS n FROM brands WHERE marketer_id = ?"),
      overall_reports: await count(
        "SELECT COUNT(*)::int AS n FROM overall_reports WHERE marketer_id = ?"
      ),
      product_gmv_rows: await count(
        "SELECT COUNT(*)::int AS n FROM product_gmv WHERE marketer_id = ?"
      ),
      pillar_entries: await count(
        "SELECT COUNT(*)::int AS n FROM pillar_entries WHERE marketer_id = ?"
      ),
      unknown_rows: await count(
        "SELECT COUNT(*)::int AS n FROM unknown_lives WHERE marketer_id = ?"
      ),
    };
  } else {
    impact = {
      lives: await count("SELECT COUNT(*)::int AS n FROM bookings WHERE user_id = ?"),
      tiktok_links: await count(
        "SELECT COUNT(*)::int AS n FROM tiktok_profiles WHERE user_id = ?"
      ),
      posts: await count("SELECT COUNT(*)::int AS n FROM posts WHERE user_id = ?"),
      samples: await count(
        "SELECT COUNT(*)::int AS n FROM sample_requests WHERE user_id = ?"
      ),
    };
  }

  const url = new URL(req.url);
  if (url.searchParams.get("force") !== "1") {
    return NextResponse.json(
      {
        needsConfirm: true,
        name: target.name,
        email: target.email,
        role: target.role,
        impact,
        // Spelled out because the two roles differ in a way that matters:
        // an affiliate's history dies with them, a marketer's affiliates live on.
        note: target.role === "marketer"
          ? "Affiliate accounts are kept but become unassigned (they lose dashboard access until reassigned). Everything else listed is deleted."
          : "All of this affiliate's history is deleted permanently.",
      },
      { status: 409 }
    );
  }

  await db.prepare("DELETE FROM users WHERE id = ?").run(id);
  return NextResponse.json({ ok: true, deleted: target.name, impact });
}
