import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sample requests.
 *
 * Lifecycle — each step is driven by an action, never set by hand:
 *   pending     affiliate submits the request
 *   processing  admin ticks the products being sent
 *   shipped     admin adds a tracking number
 *   received    affiliate confirms it arrived
 *
 * GET  — affiliate sees only their own; admin sees every request.
 * POST — affiliate creates one (prefilled from their profile, all editable).
 */
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = user.role === "admin"
    ? await db.prepare(
        `SELECT s.*, u.name AS affiliate_name, u.email AS affiliate_email,
                b.name AS brand_name, m.name AS marketer_name
           FROM sample_requests s
           JOIN users u ON u.id = s.user_id
           LEFT JOIN users m ON m.id = u.marketer_id
           LEFT JOIN brands b ON b.id = s.brand_id
          ORDER BY s.created_at DESC`
      ).all()
    : await db.prepare(
        `SELECT s.*, u.name AS affiliate_name, u.email AS affiliate_email,
                b.name AS brand_name, m.name AS marketer_name
           FROM sample_requests s
           JOIN users u ON u.id = s.user_id
           LEFT JOIN users m ON m.id = u.marketer_id
           LEFT JOIN brands b ON b.id = s.brand_id
          WHERE s.user_id = ?
          ORDER BY s.created_at DESC`
      ).all(user.id);

  // Attach granted products in one round-trip rather than N+1.
  const items = (await db.prepare(
      `SELECT i.request_id, p.id, p.name, p.image_url, p.sku,
              p.product_url, p.document_url
         FROM sample_request_items i
         JOIN products p ON p.id = i.product_id
        ORDER BY p.name`
    ).all()) as any[];

  const byRequest = new Map<number, any[]>();
  for (const it of items) {
    const list = byRequest.get(it.request_id) || [];
    list.push({ id: it.id, name: it.name, image_url: it.image_url });
    byRequest.set(it.request_id, list);
  }

  const requests = (rows as any[]).map((r) => ({
    ...r,
    products: byRequest.get(r.id) || [],
  }));

  return NextResponse.json({ requests });
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "affiliate") {
    return NextResponse.json({ error: "Affiliates only." }, { status: 403 });
  }

  // An unassigned affiliate has no marketer yet — same gate as the dashboard.
  const me = await db.prepare("SELECT marketer_id FROM users WHERE id = ?")
    .get<{ marketer_id: number | null }>(user.id);
  if (!me?.marketer_id) {
    return NextResponse.json(
      { error: "Your account is not active yet. Wait for admin to assign your marketer." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const full_name = String(body.full_name || "").trim();
  const phone = String(body.phone || "").trim();
  const address = String(body.address || "").trim();
  const note = String(body.note || "").trim();

  if (!full_name || !phone || !address) {
    return NextResponse.json(
      { error: "Full name, phone and address are required." },
      { status: 400 }
    );
  }

  // The brand must be one of this affiliate's own marketer's — admin packs
  // against it, so a sample cannot be requested for someone else's brand.
  const brandRaw = String(body.brand_id ?? "").trim();
  if (!brandRaw) {
    return NextResponse.json({ error: "Pilih brand." }, { status: 400 });
  }
  const brand = await db.prepare(
      `SELECT b.id FROM brands b
         JOIN users a ON a.marketer_id = b.marketer_id
        WHERE b.id = ? AND a.id = ?`
    ).get(Number(brandRaw), user.id);
  if (!brand) {
    return NextResponse.json(
      { error: "That brand is not available to you." },
      { status: 403 }
    );
  }

  const info = await db.prepare(
      `INSERT INTO sample_requests (user_id, brand_id, full_name, phone, address, note, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending') RETURNING id`
    ).run(user.id, Number(brandRaw), full_name, phone, address, note || null);

  return NextResponse.json({ ok: true, id: Number(info.lastInsertRowid) });
}
