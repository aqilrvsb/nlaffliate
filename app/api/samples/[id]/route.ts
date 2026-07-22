import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";
import { sendWhatsApp, sampleShippedMessage } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Advance a sample request. The status is always derived from the action
 * taken, never passed in — that keeps the lifecycle honest:
 *
 *   admin sets products  -> processing
 *   admin sets tracking  -> shipped
 *   affiliate confirms   -> received
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  const row = await db
    .prepare("SELECT id, user_id, status FROM sample_requests WHERE id = ?")
    .get<{ id: number; user_id: number; status: string }>(id);
  if (!row) return NextResponse.json({ error: "Request not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");

  /* ── Affiliate: confirm arrival ─────────────────── */
  if (action === "receive") {
    if (user.role !== "affiliate" || row.user_id !== user.id) {
      return NextResponse.json({ error: "Not your request." }, { status: 403 });
    }
    if (row.status !== "shipped") {
      return NextResponse.json(
        { error: "You can only confirm a request that has been shipped." },
        { status: 409 }
      );
    }
    await db.prepare(
        "UPDATE sample_requests SET status = 'received', received_at = now() WHERE id = ?"
      ).run(id);
    return NextResponse.json({ ok: true, status: "received" });
  }

  /* ── Everything below is admin-only ─────────────── */
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  // Bulk-assign the products being sent.
  if (action === "set_products") {
    const ids = Array.isArray(body.product_ids)
      ? body.product_ids.map(Number).filter((n: number) => Number.isFinite(n))
      : [];
    if (ids.length === 0) {
      return NextResponse.json(
        { error: "Tick at least one product." },
        { status: 400 }
      );
    }

    // Replace the whole set so unticking a product actually removes it.
    await db.prepare("DELETE FROM sample_request_items WHERE request_id = ?").run(id);
    for (const pid of ids) {
      await db.prepare(
          `INSERT INTO sample_request_items (request_id, product_id) VALUES (?, ?)
           ON CONFLICT (request_id, product_id) DO NOTHING`
        ).run(id, pid);
    }

    // Only move it forward — re-editing products on a shipped parcel must not
    // drag it back to processing.
    if (row.status === "pending") {
      await db.prepare(
          "UPDATE sample_requests SET status = 'processing', processed_at = now() WHERE id = ?"
        ).run(id);
      return NextResponse.json({ ok: true, status: "processing", count: ids.length });
    }
    return NextResponse.json({ ok: true, status: row.status, count: ids.length });
  }

  // Add tracking -> shipped.
  if (action === "set_tracking") {
    const tracking = String(body.tracking_number || "").trim();
    const courier = String(body.courier || "").trim();
    if (!tracking) {
      return NextResponse.json({ error: "Tracking number is required." }, { status: 400 });
    }

    const picked = await db
      .prepare("SELECT COUNT(*)::int AS n FROM sample_request_items WHERE request_id = ?")
      .get<{ n: number }>(id);
    if ((picked?.n ?? 0) === 0) {
      return NextResponse.json(
        { error: "Pick the products before adding a tracking number." },
        { status: 409 }
      );
    }

    await db.prepare(
        `UPDATE sample_requests
            SET tracking_number = ?, courier = ?,
                status = CASE WHEN status = 'received' THEN status ELSE 'shipped' END,
                shipped_at = COALESCE(shipped_at, now())
          WHERE id = ?`
      ).run(tracking, courier || null, id);

    // Tell the affiliate their parcel is on the way, with what is in it and
    // how to track it. Best-effort: a failed message must not fail the ship.
    const info = await db.prepare(
        `SELECT u.phone, b.name AS brand
           FROM sample_requests s
           JOIN users u ON u.id = s.user_id
           LEFT JOIN brands b ON b.id = s.brand_id
          WHERE s.id = ?`
      ).get<{ phone: string | null; brand: string | null }>(id);
    const items = (await db.prepare(
        `SELECT p.name, p.product_url
           FROM sample_request_items i
           JOIN products p ON p.id = i.product_id
          WHERE i.request_id = ? ORDER BY p.name`
      ).all(id)) as { name: string; product_url: string | null }[];

    if (info) {
      await sendWhatsApp(
        info.phone,
        sampleShippedMessage({
          brand: info.brand,
          products: items.map((x) => x.name),
          courier: courier || null,
          tracking,
          link: items.find((x) => x.product_url)?.product_url ?? null,
        })
      );
    }

    return NextResponse.json({ ok: true, status: "shipped" });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  const row = await db
    .prepare("SELECT user_id, status FROM sample_requests WHERE id = ?")
    .get<{ user_id: number; status: string }>(id);
  if (!row) return NextResponse.json({ error: "Request not found." }, { status: 404 });

  const isOwner = user.role === "affiliate" && row.user_id === user.id;
  if (user.role !== "admin" && !isOwner) {
    return NextResponse.json({ error: "Not your request." }, { status: 403 });
  }
  // Once admin has started fulfilling it, the affiliate can no longer withdraw.
  if (isOwner && row.status !== "pending") {
    return NextResponse.json(
      { error: "Already being processed — contact your marketer to cancel." },
      { status: 409 }
    );
  }

  await db.prepare("DELETE FROM sample_requests WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
